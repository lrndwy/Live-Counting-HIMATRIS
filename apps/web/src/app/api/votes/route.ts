import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { mapVote } from "@/lib/mappers";
import type { MahasiswaStatus, VoteStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireSession(["admin", "panwaslu"]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const eligibility = searchParams.get("eligibility");
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";

  const params: unknown[] = [];
  const where: string[] = [];

  if (status && status !== "ALL") {
    params.push(status);
    where.push(`v.status = $${params.length}`);
  }

  if (q) {
    params.push(`%${q}%`);
    const i = params.length;
    where.push(
      `(LOWER(v.nama_lengkap) LIKE $${i} OR LOWER(v.nim) LIKE $${i} OR LOWER(v.email) LIKE $${i} OR LOWER(v.kelas) LIKE $${i})`
    );
  }

  if (eligibility === "ELIGIBLE") {
    where.push(
      `m.nim IS NOT NULL AND (m.status_memilih = 'BELUM_MEMILIH' OR m.voted_vote_id = v.id)`
    );
  } else if (eligibility === "NIM_TIDAK_TERDAFTAR") {
    where.push(`m.nim IS NULL`);
  } else if (eligibility === "SUDAH_MEMILIH") {
    where.push(
      `m.status_memilih = 'SUDAH_MEMILIH' AND (m.voted_vote_id IS NULL OR m.voted_vote_id <> v.id)`
    );
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const result = await query(
    `SELECT v.id, v.timestamp, v.email, v.nama_lengkap, v.nim, v.program_studi, v.kelas,
            v.pilihan, v.pernyataan, v.paslon_id, v.status, v.reviewed_by, v.reviewed_at, v.synced_at,
            m.nama AS mhs_nama, m.status_memilih AS mhs_status, m.voted_vote_id AS mhs_voted_vote_id
     FROM votes v
     LEFT JOIN mahasiswa m ON m.nim = regexp_replace(trim(v.nim), '\\s+', '', 'g')
     ${whereSql}
     ORDER BY v.timestamp DESC
     LIMIT 500`,
    params
  );

  return NextResponse.json({
    votes: result.rows.map((row) =>
      mapVote(
        row as {
          id: string;
          timestamp: string;
          email: string;
          nama_lengkap: string;
          nim: string;
          program_studi: string;
          kelas: string;
          pilihan: string;
          pernyataan: string;
          paslon_id: string;
          status: VoteStatus;
          reviewed_by: string | null;
          reviewed_at: Date | null;
          synced_at: Date | null;
          mhs_nama: string | null;
          mhs_status: MahasiswaStatus | null;
          mhs_voted_vote_id: string | null;
        }
      )
    ),
  });
}
