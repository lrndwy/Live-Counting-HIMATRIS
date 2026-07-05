import * as XLSX from "xlsx";
import { pool } from "./db";
import { recountAll } from "./counts";
import { normalizeNim, rejectIneligiblePendingVotes } from "./mahasiswa";
import { parsePaslonId, voteIdFromRow } from "./vote-utils";

export type VoteImportRow = {
  timestamp: string;
  namaLengkap: string;
  nim: string;
  programStudi: string;
  kelas: string;
  pilihan: string;
  pernyataan: string;
};

function headerKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "");
}

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${pad(parsed.d)}/${pad(parsed.m)}/${parsed.y} ${pad(parsed.H)}:${pad(parsed.M)}:${pad(Math.floor(parsed.S))}`;
    }
    return String(value);
  }
  return String(value).trim();
}

function pick(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const found = Object.entries(row).find(([k]) => headerKey(k) === key);
    if (found && found[1] != null && cellToString(found[1]) !== "") {
      return cellToString(found[1]);
    }
  }
  return "";
}

/** Header panjang dari form (mis. pertanyaan pilihan paslon). */
function pickByHeaderIncludes(
  row: Record<string, unknown>,
  needles: string[]
): string {
  for (const [key, value] of Object.entries(row)) {
    const hk = headerKey(key);
    if (needles.some((n) => hk.includes(n))) {
      const text = cellToString(value);
      if (text) return text;
    }
  }
  return "";
}

function rowFromRecord(row: Record<string, unknown>): VoteImportRow | null {
  const timestamp = pick(row, ["timestamp", "waktu", "time", "tanggal"]);
  const nim = normalizeNim(
    pick(row, ["nim", "npm", "nim_npm", "nimnpm"])
  );
  if (!timestamp || !nim) return null;

  const namaLengkap = pick(row, [
    "nama",
    "nama_lengkap",
    "namalengkap",
    "name",
  ]);

  let pilihan =
    pick(row, ["pilihan", "paslon", "pilihan_paslon", "pilihanpaslon"]) ||
    pickByHeaderIncludes(row, [
      "pasang_calon",
      "pilih_salah_satu",
      "paslon",
      "pilihan",
    ]);

  if (!pilihan) {
    for (const value of Object.values(row)) {
      const text = cellToString(value);
      if (/paslon\s*0*\d+/i.test(text)) {
        pilihan = text;
        break;
      }
    }
  }

  if (!namaLengkap || !pilihan) return null;

  return {
    timestamp,
    namaLengkap,
    nim,
    programStudi: pick(row, [
      "prodi",
      "program_studi",
      "programstudi",
      "jurusan",
    ]),
    kelas: pick(row, ["kelas", "class"]),
    pilihan,
    pernyataan:
      pick(row, [
        "pernyataan",
        "pernyataan_pribadi",
        "pernyataanpribadi",
      ]) || pickByHeaderIncludes(row, ["pernyataan"]),
  };
}

/**
 * Urutan kolom seperti export form:
 * Timestamp | Nama Lengkap | NIM / NPM | Program Studi | Kelas |
 * Silakan Pilih … | Pernyataan Pribadi
 */
function rowFromArray(cells: unknown[]): VoteImportRow | null {
  const timestamp = cellToString(cells[0]);
  const namaLengkap = cellToString(cells[1]);
  const nim = normalizeNim(cellToString(cells[2]));
  const pilihan = cellToString(cells[5]);
  if (!timestamp || !nim || !namaLengkap || !pilihan) return null;

  return {
    timestamp,
    namaLengkap,
    nim,
    programStudi: cellToString(cells[3]),
    kelas: cellToString(cells[4]),
    pilihan,
    pernyataan: cellToString(cells[6]),
  };
}

export function parseVotesExcel(buffer: Buffer): VoteImportRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const parsed: VoteImportRow[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    const row = rowFromRecord(record);
    if (!row) continue;
    const key = `${row.nim}|${row.timestamp}`;
    if (seen.has(key)) continue;
    seen.add(key);
    parsed.push(row);
  }

  if (parsed.length > 0) return parsed;

  // Header tidak dikenali — coba urutan kolom A–G
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });
  for (const cells of matrix.slice(1)) {
    if (!Array.isArray(cells)) continue;
    const row = rowFromArray(cells);
    if (!row) continue;
    const key = `${row.nim}|${row.timestamp}`;
    if (seen.has(key)) continue;
    seen.add(key);
    parsed.push(row);
  }

  return parsed;
}

export async function upsertVoteRows(rows: VoteImportRow[]) {
  let created = 0;
  let updated = 0;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const row of rows) {
      const id = voteIdFromRow(row.nim, row.timestamp);
      const paslonId = parsePaslonId(row.pilihan);

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
            row.timestamp,
            "",
            row.namaLengkap,
            row.nim,
            row.programStudi,
            row.kelas,
            row.pilihan,
            row.pernyataan,
            paslonId,
          ]
        );
        created += 1;
      } else {
        await client.query(
          `UPDATE votes SET
             timestamp = $2,
             nama_lengkap = $3,
             nim = $4,
             program_studi = $5,
             kelas = $6,
             pilihan = $7,
             pernyataan = $8,
             paslon_id = $9,
             synced_at = now()
           WHERE id = $1`,
          [
            id,
            row.timestamp,
            row.namaLengkap,
            row.nim,
            row.programStudi,
            row.kelas,
            row.pilihan,
            row.pernyataan,
            paslonId,
          ]
        );
        updated += 1;
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  await rejectIneligiblePendingVotes();

  if (updated > 0) {
    await recountAll();
  }

  return { created, updated, total: rows.length };
}
