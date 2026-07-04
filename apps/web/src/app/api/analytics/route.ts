import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSession(["admin", "panwaslu"]);
  if (auth.error) return auth.error;

  const [mhs, votes, paslon, pendingElig] = await Promise.all([
    query<{ total: string; belum: string; sudah: string }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE status_memilih = 'BELUM_MEMILIH')::text AS belum,
         COUNT(*) FILTER (WHERE status_memilih = 'SUDAH_MEMILIH')::text AS sudah
       FROM mahasiswa`
    ),
    query<{ status: string; total: string }>(
      `SELECT status::text, COUNT(*)::text AS total FROM votes GROUP BY status`
    ),
    query<{
      id: string;
      nomor: string;
      nama_ketua: string;
      nama_wakil: string;
      total: string;
    }>(
      `SELECT p.id, p.nomor, p.nama_ketua, p.nama_wakil, COALESCE(c.total, 0)::text AS total
       FROM paslon p
       LEFT JOIN counts c ON c.paslon_id = p.id OR c.paslon_id = p.nomor
       WHERE p.aktif = true
       ORDER BY p.nomor ASC`
    ),
    query<{ eligibility: string; total: string }>(
      `SELECT
         CASE
           WHEN m.nim IS NULL THEN 'NIM_TIDAK_TERDAFTAR'
           WHEN m.status_memilih = 'SUDAH_MEMILIH' AND (m.voted_vote_id IS NULL OR m.voted_vote_id <> v.id)
             THEN 'SUDAH_MEMILIH'
           ELSE 'ELIGIBLE'
         END AS eligibility,
         COUNT(*)::text AS total
       FROM votes v
       LEFT JOIN mahasiswa m ON m.nim = regexp_replace(trim(v.nim), '\\s+', '', 'g')
       WHERE v.status = 'PENDING'
       GROUP BY 1`
    ),
  ]);

  const voteMap = Object.fromEntries(
    votes.rows.map((r) => [r.status, Number(r.total)])
  );
  const pending = voteMap.PENDING ?? 0;
  const sah = voteMap.SAH ?? 0;
  const tidakSah = voteMap.TIDAK_SAH ?? 0;
  const totalVotes = pending + sah + tidakSah;

  const mhsTotal = Number(mhs.rows[0]?.total ?? 0);
  const sudahMemilih = Number(mhs.rows[0]?.sudah ?? 0);
  const belumMemilih = Number(mhs.rows[0]?.belum ?? 0);
  const turnout = mhsTotal > 0 ? Math.round((sudahMemilih / mhsTotal) * 1000) / 10 : 0;

  const paslonRows = paslon.rows.map((p) => {
    const total = Number(p.total);
    return {
      paslonId: p.id,
      nomor: p.nomor,
      namaKetua: p.nama_ketua,
      namaWakil: p.nama_wakil,
      total,
      percent: sah > 0 ? Math.round((total / sah) * 1000) / 10 : 0,
    };
  });

  const eligibilityPending = {
    eligible: 0,
    nimTidakTerdaftar: 0,
    sudahMemilih: 0,
  };
  for (const row of pendingElig.rows) {
    const n = Number(row.total);
    if (row.eligibility === "ELIGIBLE") eligibilityPending.eligible = n;
    if (row.eligibility === "NIM_TIDAK_TERDAFTAR")
      eligibilityPending.nimTidakTerdaftar = n;
    if (row.eligibility === "SUDAH_MEMILIH") eligibilityPending.sudahMemilih = n;
  }

  return NextResponse.json({
    mahasiswa: { total: mhsTotal, belumMemilih, sudahMemilih, turnout },
    votes: { total: totalVotes, pending, sah, tidakSah },
    paslon: paslonRows,
    pendingEligibility: eligibilityPending,
  });
}
