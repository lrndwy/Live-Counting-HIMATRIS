import { Pool, type QueryResultRow } from "pg";

const globalForDb = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgresql://livecount:livecount@localhost:5432/livecount",
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return pool.query<T>(text, params);
}
