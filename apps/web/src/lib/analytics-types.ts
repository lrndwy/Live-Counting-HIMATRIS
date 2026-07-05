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
    tidakSah: number;
    tidakSahPercent: number;
  };
  golput: { total: number; percent: number };
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
