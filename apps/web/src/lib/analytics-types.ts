export type AnalyticsData = {
  mahasiswa: {
    total: number;
    belumMemilih: number;
    sudahMemilih: number;
    turnout: number;
  };
  votes: {
    total: number;
    pending: number;
    sah: number;
    /** Jumlah record suara TIDAK_SAH (termasuk double, NIM luar DPT). */
    tidakSah: number;
    tidakSahRecords: number;
  };
  golput: { total: number; percent: number };
  /** Ditolak PANWASLU + NIM tidak terdaftar; double tidak dihitung. */
  tidakSah: { total: number; percent: number };
  /** Suara double — hanya dashboard & PDF. */
  double: { total: number; percentOfVotes: number };
  paslon: Array<{
    paslonId: string;
    nomor: string;
    namaKetua: string;
    namaWakil: string;
    total: number;
    percent: number;
    percentOfMahasiswa: number;
  }>;
  pendingEligibility: {
    eligible: number;
    nimTidakTerdaftar: number;
    sudahMemilih: number;
  };
};
