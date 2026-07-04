import { pool, query } from "./db";
import type { MahasiswaStatus, VoteEligibility } from "./types";

export function normalizeNim(nim: string): string {
  return nim.trim().replace(/\s+/g, "");
}

export async function getMahasiswaByNim(nim: string) {
  const normalized = normalizeNim(nim);
  if (!normalized) return null;

  const result = await query<{
    nim: string;
    nama: string;
    kelas: string;
    angkatan: string;
    prodi: string;
    status_memilih: MahasiswaStatus;
    voted_vote_id: string | null;
  }>(
    `SELECT nim, nama, kelas, angkatan, prodi, status_memilih, voted_vote_id
     FROM mahasiswa WHERE nim = $1`,
    [normalized]
  );

  return result.rows[0] ?? null;
}

export function resolveEligibility(
  mahasiswa: {
    status_memilih: MahasiswaStatus;
    voted_vote_id: string | null;
  } | null,
  voteId: string,
  voteStatus: string
): VoteEligibility {
  if (!mahasiswa) return "NIM_TIDAK_TERDAFTAR";

  // Vote yang sudah SAH untuk NIM ini tetap dianggap sah untuk baris itu sendiri
  if (
    voteStatus === "SAH" &&
    (mahasiswa.voted_vote_id === voteId ||
      mahasiswa.status_memilih === "SUDAH_MEMILIH")
  ) {
    if (mahasiswa.voted_vote_id && mahasiswa.voted_vote_id !== voteId) {
      return "SUDAH_MEMILIH";
    }
    return "ELIGIBLE";
  }

  if (
    mahasiswa.status_memilih === "SUDAH_MEMILIH" &&
    mahasiswa.voted_vote_id !== voteId
  ) {
    return "SUDAH_MEMILIH";
  }

  return "ELIGIBLE";
}

export function canReviewVote(
  eligibility: VoteEligibility,
  voteStatus: string
): boolean {
  if (voteStatus !== "PENDING") return false;
  return eligibility === "ELIGIBLE";
}

/**
 * Apply vote status change with mahasiswa lock.
 * SAH requires NIM terdaftar + belum memilih (atau vote ini yang sudah SAH).
 */
export async function applyVoteReview(params: {
  voteId: string;
  nim: string;
  beforeStatus: "PENDING" | "SAH" | "TIDAK_SAH";
  afterStatus: "PENDING" | "SAH" | "TIDAK_SAH";
  paslonId: string;
  reviewedBy: string;
  applyCountChange: (args: {
    beforeStatus: "PENDING" | "SAH" | "TIDAK_SAH";
    beforePaslonId: string | null;
    afterStatus: "PENDING" | "SAH" | "TIDAK_SAH";
    afterPaslonId: string;
  }) => Promise<void>;
}) {
  const nim = normalizeNim(params.nim);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const voteLock = await client.query<{
      id: string;
      status: "PENDING" | "SAH" | "TIDAK_SAH";
      paslon_id: string;
      nim: string;
    }>(`SELECT id, status, paslon_id, nim FROM votes WHERE id = $1 FOR UPDATE`, [
      params.voteId,
    ]);

    const vote = voteLock.rows[0];
    if (!vote) {
      throw Object.assign(new Error("Suara tidak ditemukan"), { status: 404 });
    }

    if (vote.status === params.afterStatus) {
      await client.query("COMMIT");
      return;
    }

    const mhsResult = await client.query<{
      nim: string;
      status_memilih: MahasiswaStatus;
      voted_vote_id: string | null;
    }>(
      `SELECT nim, status_memilih, voted_vote_id FROM mahasiswa WHERE nim = $1 FOR UPDATE`,
      [nim]
    );
    const mahasiswa = mhsResult.rows[0] ?? null;

    const eligibility = resolveEligibility(mahasiswa, vote.id, vote.status);

    // Hanya boleh review (ke SAH / TIDAK_SAH) jika NIM terdaftar & belum memilih
    if (
      (params.afterStatus === "SAH" || params.afterStatus === "TIDAK_SAH") &&
      vote.status === "PENDING"
    ) {
      if (!mahasiswa) {
        throw Object.assign(
          new Error("NIM tidak terdaftar pada data mahasiswa"),
          { status: 400 }
        );
      }
      if (
        mahasiswa.status_memilih === "SUDAH_MEMILIH" &&
        mahasiswa.voted_vote_id !== vote.id
      ) {
        throw Object.assign(
          new Error("Mahasiswa ini sudah memilih (ada suara SAH sebelumnya)"),
          { status: 400 }
        );
      }
      if (eligibility !== "ELIGIBLE") {
        throw Object.assign(new Error("Suara tidak memenuhi syarat verifikasi"), {
          status: 400,
        });
      }
    }

    // Lepas lock mahasiswa jika vote ini sebelumnya SAH
    if (vote.status === "SAH" && params.afterStatus !== "SAH") {
      await client.query(
        `UPDATE mahasiswa
         SET status_memilih = 'BELUM_MEMILIH',
             voted_vote_id = NULL,
             updated_at = now()
         WHERE voted_vote_id = $1`,
        [vote.id]
      );
    }

    // Kunci mahasiswa saat SAH
    if (params.afterStatus === "SAH") {
      if (!mahasiswa) {
        throw Object.assign(
          new Error("NIM tidak terdaftar pada data mahasiswa"),
          { status: 400 }
        );
      }
      await client.query(
        `UPDATE mahasiswa
         SET status_memilih = 'SUDAH_MEMILIH',
             voted_vote_id = $2,
             updated_at = now()
         WHERE nim = $1`,
        [nim, vote.id]
      );
    }

    await client.query(
      `UPDATE votes
       SET status = $2,
           reviewed_by = $3,
           reviewed_at = now()
       WHERE id = $1`,
      [vote.id, params.afterStatus, params.reviewedBy]
    );

    await client.query("COMMIT");

    await params.applyCountChange({
      beforeStatus: vote.status,
      beforePaslonId: vote.paslon_id,
      afterStatus: params.afterStatus,
      afterPaslonId: vote.paslon_id,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
