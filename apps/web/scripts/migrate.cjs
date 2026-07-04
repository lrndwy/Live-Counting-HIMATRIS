const { readFileSync } = require("fs");
const { resolve } = require("path");
const { Pool } = require("pg");

async function main() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgresql://livecount:livecount@localhost:5432/livecount",
  });

  const sql = readFileSync(resolve(__dirname, "../sql/schema.sql"), "utf8");
  await pool.query(sql);
  console.log("Migration applied.");
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
