import * as XLSX from "xlsx";
import { pool } from "./db";
import { normalizeNim } from "./mahasiswa";

export type ImportRow = {
  nim: string;
  nama: string;
  kelas: string;
  angkatan: string;
  prodi: string;
};

function headerKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "");
}

function pick(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const found = Object.entries(row).find(([k]) => headerKey(k) === key);
    if (found && found[1] != null && String(found[1]).trim() !== "") {
      return String(found[1]).trim();
    }
  }
  return "";
}

export function parseMahasiswaExcel(buffer: Buffer): ImportRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const parsed: ImportRow[] = [];
  for (const row of rows) {
    const nim = normalizeNim(pick(row, ["nim", "npm", "nim_npm", "nimnpm"]));
    const nama = pick(row, ["nama", "nama_lengkap", "namalengkap", "name"]);
    const kelas = pick(row, ["kelas", "class"]);
    const angkatan = pick(row, ["angkatan", "tahun", "tahun_angkatan"]);
    const prodi = pick(row, [
      "prodi",
      "program_studi",
      "programstudi",
      "jurusan",
    ]);

    if (!nim || !nama) continue;
    parsed.push({ nim, nama, kelas, angkatan, prodi });
  }

  return parsed;
}

export async function upsertMahasiswaRows(rows: ImportRow[]) {
  let inserted = 0;
  let updated = 0;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const row of rows) {
      const result = await client.query(
        `INSERT INTO mahasiswa (nim, nama, kelas, angkatan, prodi, status_memilih, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'BELUM_MEMILIH', now())
         ON CONFLICT (nim) DO UPDATE
         SET nama = EXCLUDED.nama,
             kelas = EXCLUDED.kelas,
             angkatan = EXCLUDED.angkatan,
             prodi = EXCLUDED.prodi,
             updated_at = now()
         RETURNING (xmax = 0) AS is_insert`,
        [row.nim, row.nama, row.kelas, row.angkatan, row.prodi]
      );

      if (result.rows[0]?.is_insert) inserted += 1;
      else updated += 1;
    }

    // Samakan status memilih dengan suara SAH yang sudah ada
    await client.query(
      `UPDATE mahasiswa m
       SET status_memilih = 'SUDAH_MEMILIH',
           voted_vote_id = s.vote_id,
           updated_at = now()
       FROM (
         SELECT DISTINCT ON (regexp_replace(trim(nim), '\\s+', '', 'g'))
                regexp_replace(trim(nim), '\\s+', '', 'g') AS nim,
                id AS vote_id
         FROM votes
         WHERE status = 'SAH'
         ORDER BY regexp_replace(trim(nim), '\\s+', '', 'g'), reviewed_at DESC NULLS LAST
       ) s
       WHERE m.nim = s.nim
         AND m.status_memilih = 'BELUM_MEMILIH'`
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return { inserted, updated, total: rows.length };
}
