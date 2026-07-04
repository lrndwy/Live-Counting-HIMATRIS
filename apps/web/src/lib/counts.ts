import { pool, query } from "./db";
import type { VoteStatus } from "./types";

export async function adjustCount(paslonId: string, delta: number) {
  if (!paslonId || delta === 0) return;

  await query(
    `INSERT INTO counts (paslon_id, total, updated_at)
     VALUES ($1, GREATEST($2, 0), now())
     ON CONFLICT (paslon_id) DO UPDATE
     SET total = GREATEST(counts.total + $2, 0),
         updated_at = now()`,
    [paslonId, delta]
  );
}

export async function applyVoteStatusChange(params: {
  beforeStatus: VoteStatus | null;
  beforePaslonId: string | null;
  afterStatus: VoteStatus;
  afterPaslonId: string;
}) {
  const beforeSah = params.beforeStatus === "SAH";
  const afterSah = params.afterStatus === "SAH";
  const beforePaslon = params.beforePaslonId ?? "";
  const afterPaslon = params.afterPaslonId;

  if (!beforeSah && afterSah) {
    await adjustCount(afterPaslon, 1);
    return;
  }

  if (beforeSah && !afterSah && beforePaslon) {
    await adjustCount(beforePaslon, -1);
    return;
  }

  if (beforeSah && afterSah && beforePaslon !== afterPaslon) {
    if (beforePaslon) await adjustCount(beforePaslon, -1);
    if (afterPaslon) await adjustCount(afterPaslon, 1);
  }
}

/** Recalculate all counts from SAH votes (recovery / consistency). */
export async function recountAll() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM counts");
    await client.query(
      `INSERT INTO counts (paslon_id, total, updated_at)
       SELECT paslon_id, COUNT(*)::int, now()
       FROM votes
       WHERE status = 'SAH'
       GROUP BY paslon_id`
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
