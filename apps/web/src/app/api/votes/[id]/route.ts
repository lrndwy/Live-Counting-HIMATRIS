import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { applyVoteStatusChange } from "@/lib/counts";
import { query } from "@/lib/db";
import { applyVoteReview } from "@/lib/mahasiswa";
import { mapVote } from "@/lib/mappers";
import type { MahasiswaStatus, VoteStatus } from "@/lib/types";

const ALLOWED: VoteStatus[] = ["PENDING", "SAH", "TIDAK_SAH"];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(["admin", "panwaslu"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const body = (await request.json()) as { status?: VoteStatus };
  const status = body.status;

  if (!status || !ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }

  const existing = await query<{
    id: string;
    status: VoteStatus;
    paslon_id: string;
    nim: string;
  }>(`SELECT id, status, paslon_id, nim FROM votes WHERE id = $1`, [id]);

  const vote = existing.rows[0];
  if (!vote) {
    return NextResponse.json({ error: "Suara tidak ditemukan" }, { status: 404 });
  }

  try {
    if (vote.status !== status) {
      await applyVoteReview({
        voteId: vote.id,
        nim: vote.nim,
        beforeStatus: vote.status,
        afterStatus: status,
        paslonId: vote.paslon_id,
        reviewedBy: auth.session.id,
        applyCountChange: applyVoteStatusChange,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengubah status";
    const code =
      err && typeof err === "object" && "status" in err
        ? Number((err as { status: number }).status)
        : 500;
    return NextResponse.json({ error: message }, { status: code || 500 });
  }

  const updated = await query(
    `SELECT v.id, v.timestamp, v.email, v.nama_lengkap, v.nim, v.program_studi, v.kelas,
            v.pilihan, v.pernyataan, v.paslon_id, v.status, v.reviewed_by, v.reviewed_at, v.synced_at,
            m.nama AS mhs_nama, m.status_memilih AS mhs_status, m.voted_vote_id AS mhs_voted_vote_id
     FROM votes v
     LEFT JOIN mahasiswa m ON m.nim = regexp_replace(trim(v.nim), '\\s+', '', 'g')
     WHERE v.id = $1`,
    [id]
  );

  return NextResponse.json({
    vote: mapVote(
      updated.rows[0] as {
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
    ),
  });
}
