export type VoteStatus = "PENDING" | "SAH" | "TIDAK_SAH";

export type UserRole = "admin" | "panwaslu";

/** Hasil pengecekan otomatis terhadap master mahasiswa */
export type VoteEligibility =
  | "ELIGIBLE"
  | "NIM_TIDAK_TERDAFTAR"
  | "SUDAH_MEMILIH";

export type MahasiswaStatus = "BELUM_MEMILIH" | "SUDAH_MEMILIH";

export interface Vote {
  id: string;
  timestamp: string;
  email: string;
  namaLengkap: string;
  nim: string;
  programStudi: string;
  kelas: string;
  pilihan: string;
  pernyataan: string;
  paslonId: string;
  status: VoteStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  syncedAt: string | null;
  eligibility: VoteEligibility;
  canReview: boolean;
  mahasiswaNama: string | null;
  mahasiswaStatus: MahasiswaStatus | null;
}

export interface Mahasiswa {
  nim: string;
  nama: string;
  kelas: string;
  angkatan: string;
  prodi: string;
  statusMemilih: MahasiswaStatus;
  votedVoteId: string | null;
}

export interface Paslon {
  id: string;
  nomor: string;
  namaKetua: string;
  namaWakil: string;
  fotoUrl?: string | null;
  visiMisiUrl?: string | null;
  aktif: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  active: boolean;
}

export interface LiveCountRow {
  paslonId: string;
  nomor: string;
  namaKetua: string;
  namaWakil: string;
  fotoUrl?: string | null;
  visiMisiUrl?: string | null;
  total: number;
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}
