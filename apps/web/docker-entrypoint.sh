#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
until node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.query('SELECT 1'))
  .then(() => client.end())
  .catch((err) => { console.error(err.message); process.exit(1); });
"; do
  sleep 1
done

echo "Running migrations..."
node scripts/migrate.cjs

echo "Seeding admin..."
node scripts/seed.cjs

exec "$@"
