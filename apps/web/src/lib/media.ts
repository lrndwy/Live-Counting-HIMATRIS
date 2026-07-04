const MEDIA = "/media-reor";

function asset(filename: string) {
  return `${MEDIA}/${encodeURIComponent(filename)}`;
}

export const MEDIA_ASSETS = {
  banner: asset("BANNER-reorganisasi.png"),
  logoHimatris: asset("Logo Himpunan.png"),
  logoJurusan: asset("Logo Jurursan Komputer dan Bisnis.png"),
  logoPnc: asset("Politeknik_Negeri_Cilacap.png"),
} as const;

/** Map paslon nomor ("01", "1", "02", …) to campaign assets. */
export function paslonMedia(nomor: string) {
  const n = String(parseInt(nomor, 10) || 0);
  if (n === "1") {
    return {
      photo: asset("PASLON 1.png"),
      visiMisi: asset("PASLON 1 VISI MISI.png"),
    };
  }
  if (n === "2") {
    return {
      photo: asset("PASLON 2.png"),
      visiMisi: asset("PASLON 2 VISI MISI.png"),
    };
  }
  return { photo: null as string | null, visiMisi: null as string | null };
}
