const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

async function main() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgresql://livecount:livecount@localhost:5432/livecount",
  });

  const email = (process.env.ADMIN_EMAIL ?? "admin@example.com")
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "admin123";
  const displayName = process.env.ADMIN_NAME ?? "Admin Pemilu";
  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO users (email, password_hash, display_name, role, active)
     VALUES ($1, $2, $3, 'admin', true)
     ON CONFLICT (email) DO UPDATE
     SET password_hash = EXCLUDED.password_hash,
         display_name = EXCLUDED.display_name,
         role = 'admin',
         active = true`,
    [email, passwordHash, displayName]
  );

  console.log(`Admin ready: ${email}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
