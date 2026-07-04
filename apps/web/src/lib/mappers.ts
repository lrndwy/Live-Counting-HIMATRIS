import {
  canReviewVote,
  resolveEligibility,
} from "./mahasiswa";
import type {
  Mahasiswa,
  MahasiswaStatus,
  Paslon,
  SyncSettings,
  UserProfile,
  Vote,
  VoteStatus,
} from "./types";

export function mapVote(
  row: {
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
    mhs_nama?: string | null;
    mhs_status?: MahasiswaStatus | null;
    mhs_voted_vote_id?: string | null;
  }
): Vote {
  const eligibility = resolveEligibility(
    row.mhs_status
      ? {
          status_memilih: row.mhs_status,
          voted_vote_id: row.mhs_voted_vote_id ?? null,
        }
      : null,
    row.id,
    row.status
  );

  return {
    id: row.id,
    timestamp: row.timestamp,
    email: row.email,
    namaLengkap: row.nama_lengkap,
    nim: row.nim,
    programStudi: row.program_studi,
    kelas: row.kelas,
    pilihan: row.pilihan,
    pernyataan: row.pernyataan,
    paslonId: row.paslon_id,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at?.toISOString() ?? null,
    syncedAt: row.synced_at?.toISOString() ?? null,
    eligibility,
    canReview: canReviewVote(eligibility, row.status),
    mahasiswaNama: row.mhs_nama ?? null,
    mahasiswaStatus: row.mhs_status ?? null,
  };
}

export function mapMahasiswa(row: {
  nim: string;
  nama: string;
  kelas: string;
  angkatan: string;
  prodi: string;
  status_memilih: MahasiswaStatus;
  voted_vote_id: string | null;
}): Mahasiswa {
  return {
    nim: row.nim,
    nama: row.nama,
    kelas: row.kelas,
    angkatan: row.angkatan,
    prodi: row.prodi,
    statusMemilih: row.status_memilih,
    votedVoteId: row.voted_vote_id,
  };
}

export function mapPaslon(row: {
  id: string;
  nomor: string;
  nama_ketua: string;
  nama_wakil: string;
  foto_url: string | null;
  aktif: boolean;
}): Paslon {
  return {
    id: row.id,
    nomor: row.nomor,
    namaKetua: row.nama_ketua,
    namaWakil: row.nama_wakil,
    fotoUrl: row.foto_url,
    aktif: row.aktif,
  };
}

export function mapUser(row: {
  id: string;
  email: string;
  display_name: string;
  role: UserProfile["role"];
  active: boolean;
}): UserProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    active: row.active,
  };
}

export function mapSyncSettings(row: {
  spreadsheet_id: string;
  sheet_name: string;
  last_sync_at: Date | null;
  last_sync_status: string | null;
  last_error: string | null;
  last_upserted: number | null;
  last_created: number | null;
  last_updated: number | null;
}): SyncSettings {
  return {
    spreadsheetId: row.spreadsheet_id,
    sheetName: row.sheet_name,
    lastSyncAt: row.last_sync_at?.toISOString() ?? null,
    lastSyncStatus:
      row.last_sync_status === "ok" || row.last_sync_status === "error"
        ? row.last_sync_status
        : null,
    lastError: row.last_error,
    lastUpserted: row.last_upserted,
    lastCreated: row.last_created,
    lastUpdated: row.last_updated,
  };
}
