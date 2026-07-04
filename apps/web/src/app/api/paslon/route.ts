import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { mapPaslon } from "@/lib/mappers";
import { savePaslonImage } from "@/lib/paslon-upload";

export const dynamic = "force-dynamic";

type PaslonRow = {
  id: string;
  nomor: string;
  nama_ketua: string;
  nama_wakil: string;
  foto_url: string | null;
  visi_misi_url: string | null;
  aktif: boolean;
};

const SELECT_COLS =
  "id, nomor, nama_ketua, nama_wakil, foto_url, visi_misi_url, aktif";

export async function GET() {
  const result = await query(
    `SELECT ${SELECT_COLS}
     FROM paslon
     ORDER BY nomor ASC`
  );

  return NextResponse.json({
    paslon: result.rows.map((row) => mapPaslon(row as PaslonRow)),
  });
}

export async function POST(request: Request) {
  const auth = await requireSession(["admin"]);
  if (auth.error) return auth.error;

  const form = await request.formData();
  const nomor = String(form.get("nomor") ?? "")
    .trim()
    .padStart(2, "0");
  const namaKetua = String(form.get("namaKetua") ?? "").trim();
  const namaWakil = String(form.get("namaWakil") ?? "").trim();
  const foto = form.get("foto");
  const visiMisi = form.get("visiMisi");

  if (!nomor || !namaKetua || !namaWakil) {
    return NextResponse.json(
      { error: "Nomor, nama ketua, dan nama wakil wajib diisi" },
      { status: 400 }
    );
  }

  let fotoUrl: string | null = null;
  let visiMisiUrl: string | null = null;

  try {
    if (foto instanceof File && foto.size > 0) {
      fotoUrl = await savePaslonImage(nomor, foto, "foto");
    }
    if (visiMisi instanceof File && visiMisi.size > 0) {
      visiMisiUrl = await savePaslonImage(nomor, visiMisi, "visi-misi");
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengunggah gambar" },
      { status: 400 }
    );
  }

  await query(
    `INSERT INTO paslon (id, nomor, nama_ketua, nama_wakil, foto_url, visi_misi_url, aktif)
     VALUES ($1, $1, $2, $3, $4, $5, true)
     ON CONFLICT (id) DO UPDATE
     SET nama_ketua = EXCLUDED.nama_ketua,
         nama_wakil = EXCLUDED.nama_wakil,
         foto_url = COALESCE(EXCLUDED.foto_url, paslon.foto_url),
         visi_misi_url = COALESCE(EXCLUDED.visi_misi_url, paslon.visi_misi_url),
         aktif = true`,
    [nomor, namaKetua, namaWakil, fotoUrl, visiMisiUrl]
  );

  const result = await query(
    `SELECT ${SELECT_COLS} FROM paslon WHERE id = $1`,
    [nomor]
  );

  return NextResponse.json({
    paslon: mapPaslon(result.rows[0] as PaslonRow),
  });
}
