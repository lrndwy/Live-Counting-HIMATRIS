CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'panwaslu');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vote_status AS ENUM ('PENDING', 'SAH', 'TIDAK_SAH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role user_role NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS paslon (
  id TEXT PRIMARY KEY,
  nomor TEXT NOT NULL UNIQUE,
  nama_ketua TEXT NOT NULL,
  nama_wakil TEXT NOT NULL,
  foto_url TEXT,
  aktif BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  email TEXT NOT NULL,
  nama_lengkap TEXT NOT NULL,
  nim TEXT NOT NULL,
  program_studi TEXT NOT NULL,
  kelas TEXT NOT NULL,
  pilihan TEXT NOT NULL,
  pernyataan TEXT NOT NULL DEFAULT '',
  paslon_id TEXT NOT NULL,
  status vote_status NOT NULL DEFAULT 'PENDING',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS votes_status_timestamp_idx
  ON votes (status, timestamp DESC);

CREATE TABLE IF NOT EXISTS counts (
  paslon_id TEXT PRIMARY KEY,
  total INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  spreadsheet_id TEXT NOT NULL DEFAULT '',
  sheet_name TEXT NOT NULL DEFAULT 'Form Responses 1',
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_error TEXT,
  last_upserted INT,
  last_created INT,
  last_updated INT
);

DO $$ BEGIN
  CREATE TYPE mahasiswa_status AS ENUM ('BELUM_MEMILIH', 'SUDAH_MEMILIH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS mahasiswa (
  nim TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  kelas TEXT NOT NULL DEFAULT '',
  angkatan TEXT NOT NULL DEFAULT '',
  prodi TEXT NOT NULL DEFAULT '',
  status_memilih mahasiswa_status NOT NULL DEFAULT 'BELUM_MEMILIH',
  voted_vote_id TEXT REFERENCES votes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mahasiswa_status_idx ON mahasiswa (status_memilih);
CREATE INDEX IF NOT EXISTS mahasiswa_nama_idx ON mahasiswa (nama);
