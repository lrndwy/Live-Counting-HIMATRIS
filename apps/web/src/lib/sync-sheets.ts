import { google } from "googleapis";
import { pool, query } from "./db";
import { recountAll } from "./counts";
import { normalizeNim } from "./mahasiswa";
import { cell, parsePaslonId, voteIdFromRow } from "./vote-utils";

const COLUMN = {
  TIMESTAMP: 0,
  EMAIL: 1,
  NAMA: 2,
  NIM: 3,
  PRODI: 4,
  KELAS: 5,
  PILIHAN: 6,
  PERNYATAAN: 7,
} as const;

async function getSheetsClient() {
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT;
  if (!credentialsJson) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT is not configured");
  }

  const credentials = JSON.parse(credentialsJson) as {
    client_email: string;
    private_key: string;
  };

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return google.sheets({ version: "v4", auth });
}

/** Quote sheet title for A1 notation (spaces, &, parentheses, etc.). */
function sheetA1Range(sheetName: string, a1Range: string): string {
  const escaped = sheetName.replace(/'/g, "''");
  return `'${escaped}'!${a1Range}`;
}

async function loadSyncSettings() {
  const result = await query<{
    spreadsheet_id: string;
    sheet_name: string;
  }>(`SELECT spreadsheet_id, sheet_name FROM settings WHERE key = 'sync'`);

  const row = result.rows[0];
  const spreadsheetId =
    row?.spreadsheet_id || process.env.SPREADSHEET_ID || "";
  const sheetName =
    row?.sheet_name || process.env.SHEET_NAME || "Form Responses 1";

  if (!spreadsheetId) {
    throw new Error("spreadsheetId is not set in settings or SPREADSHEET_ID");
  }

  return { spreadsheetId, sheetName };
}

export async function syncVotesFromSheet() {
  const { spreadsheetId, sheetName } = await loadSyncSettings();
  const sheets = await getSheetsClient();

  // Row 1 = header, row 2+ = data (slice(1) skips header)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetA1Range(sheetName, "A:H"),
  });

  const rows = response.data.values ?? [];
  if (rows.length <= 1) {
    await query(
      `UPDATE settings
       SET spreadsheet_id = $1,
           sheet_name = $2,
           last_sync_at = now(),
           last_sync_status = 'ok',
           last_error = NULL,
           last_upserted = 0,
           last_created = 0,
           last_updated = 0
       WHERE key = 'sync'`,
      [spreadsheetId, sheetName]
    );
    return { upserted: 0, created: 0, updated: 0 };
  }

  const dataRows = rows.slice(1);
  let created = 0;
  let updated = 0;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const row of dataRows) {
      const email = cell(row, COLUMN.EMAIL);
      const timestamp = cell(row, COLUMN.TIMESTAMP);
      if (!email || !timestamp) continue;

      const id = voteIdFromRow(email, timestamp);
      const pilihan = cell(row, COLUMN.PILIHAN);
      const paslonId = parsePaslonId(pilihan);
      const nim = normalizeNim(cell(row, COLUMN.NIM));

      const existing = await client.query<{ id: string }>(
        `SELECT id FROM votes WHERE id = $1`,
        [id]
      );

      if (existing.rowCount === 0) {
        await client.query(
          `INSERT INTO votes (
             id, timestamp, email, nama_lengkap, nim, program_studi, kelas,
             pilihan, pernyataan, paslon_id, status, synced_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PENDING', now())`,
          [
            id,
            timestamp,
            email,
            cell(row, COLUMN.NAMA),
            nim,
            cell(row, COLUMN.PRODI),
            cell(row, COLUMN.KELAS),
            pilihan,
            cell(row, COLUMN.PERNYATAAN),
            paslonId,
          ]
        );
        created += 1;
      } else {
        await client.query(
          `UPDATE votes SET
             timestamp = $2,
             email = $3,
             nama_lengkap = $4,
             nim = $5,
             program_studi = $6,
             kelas = $7,
             pilihan = $8,
             pernyataan = $9,
             paslon_id = $10,
             synced_at = now()
           WHERE id = $1`,
          [
            id,
            timestamp,
            email,
            cell(row, COLUMN.NAMA),
            nim,
            cell(row, COLUMN.PRODI),
            cell(row, COLUMN.KELAS),
            pilihan,
            cell(row, COLUMN.PERNYATAAN),
            paslonId,
          ]
        );
        updated += 1;
      }
    }

    await client.query(
      `UPDATE settings
       SET spreadsheet_id = $1,
           sheet_name = $2,
           last_sync_at = now(),
           last_sync_status = 'ok',
           last_error = NULL,
           last_upserted = $3,
           last_created = $4,
           last_updated = $5
       WHERE key = 'sync'`,
      [spreadsheetId, sheetName, created + updated, created, updated]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  // Keep counts consistent if SAH votes had paslon_id updated
  if (updated > 0) {
    await recountAll();
  }

  return { upserted: created + updated, created, updated };
}

export async function runSyncWithErrorHandling() {
  try {
    return await syncVotesFromSheet();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await query(
      `UPDATE settings
       SET last_sync_at = now(),
           last_sync_status = 'error',
           last_error = $1
       WHERE key = 'sync'`,
      [message]
    );
    throw err;
  }
}
