import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ineligiblePendingCondition } from "@/lib/mahasiswa";

export const dynamic = "force-dynamic";

export async function GET() {
  const [paslonResult, countsResult, statsResult] = await Promise.all([
    query<{
      id: string;
      nomor: string;
      nama_ketua: string;
      nama_wakil: string;
      foto_url: string | null;
      visi_misi_url: string | null;
    }>(
      `SELECT id, nomor, nama_ketua, nama_wakil, foto_url, visi_misi_url
       FROM paslon
       WHERE aktif = true
       ORDER BY nomor ASC`
    ),
    query<{
      paslon_id: string;
      total: number;
      updated_at: Date;
    }>(`SELECT paslon_id, total, updated_at FROM counts`),
    query<{ tidak_sah: number; golput: number; total_mahasiswa: number }>(
      `SELECT
         (
           (SELECT COUNT(*)::int FROM votes WHERE status = 'TIDAK_SAH')
           + (SELECT COUNT(*)::int FROM votes v WHERE ${ineligiblePendingCondition("v")})
         ) AS tidak_sah,
         (SELECT COUNT(*)::int
          FROM mahasiswa
          WHERE status_memilih = 'BELUM_MEMILIH') AS golput,
         (SELECT COUNT(*)::int FROM mahasiswa) AS total_mahasiswa`
    ),
  ]);

  const countMap = new Map(
    countsResult.rows.map((r) => [r.paslon_id, r.total])
  );

  let updatedAt: string | null = null;
  for (const row of countsResult.rows) {
    const iso = row.updated_at.toISOString();
    if (!updatedAt || iso > updatedAt) updatedAt = iso;
  }

  const rows = paslonResult.rows.map((p) => ({
    paslonId: p.id,
    nomor: p.nomor,
    namaKetua: p.nama_ketua,
    namaWakil: p.nama_wakil,
    fotoUrl: p.foto_url,
    visiMisiUrl: p.visi_misi_url,
    total: countMap.get(p.id) ?? countMap.get(p.nomor) ?? 0,
  }));

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);
  const tidakSah = statsResult.rows[0]?.tidak_sah ?? 0;
  const golput = statsResult.rows[0]?.golput ?? 0;
  const totalMahasiswa = statsResult.rows[0]?.total_mahasiswa ?? 0;
  const chartTotal = totalMahasiswa > 0 ? totalMahasiswa : grandTotal + golput;

  return NextResponse.json({
    rows,
    grandTotal,
    tidakSah,
    golput,
    totalMahasiswa,
    chartTotal,
    updatedAt,
  });
}
