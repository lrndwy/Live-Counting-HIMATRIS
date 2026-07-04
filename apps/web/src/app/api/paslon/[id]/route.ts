import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { mapPaslon } from "@/lib/mappers";
import {
  deletePaslonUploadFile,
  savePaslonImage,
} from "@/lib/paslon-upload";

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

async function getPaslon(id: string) {
  const result = await query<PaslonRow>(
    `SELECT ${SELECT_COLS} FROM paslon WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(["admin"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const existing = await getPaslon(id);
  if (!existing) {
    return NextResponse.json({ error: "Paslon tidak ditemukan" }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const namaKetua =
      form.get("namaKetua") != null
        ? String(form.get("namaKetua")).trim()
        : existing.nama_ketua;
    const namaWakil =
      form.get("namaWakil") != null
        ? String(form.get("namaWakil")).trim()
        : existing.nama_wakil;
    const foto = form.get("foto");
    const visiMisi = form.get("visiMisi");

    let fotoUrl = existing.foto_url;
    let visiMisiUrl = existing.visi_misi_url;

    try {
      if (foto instanceof File && foto.size > 0) {
        const nextUrl = await savePaslonImage(existing.nomor, foto, "foto");
        if (existing.foto_url && existing.foto_url !== nextUrl) {
          await deletePaslonUploadFile(existing.foto_url);
        }
        fotoUrl = nextUrl;
      }
      if (visiMisi instanceof File && visiMisi.size > 0) {
        const nextUrl = await savePaslonImage(
          existing.nomor,
          visiMisi,
          "visi-misi"
        );
        if (existing.visi_misi_url && existing.visi_misi_url !== nextUrl) {
          await deletePaslonUploadFile(existing.visi_misi_url);
        }
        visiMisiUrl = nextUrl;
      }
    } catch (err) {
      return NextResponse.json(
        {
          error: err instanceof Error ? err.message : "Gagal mengunggah gambar",
        },
        { status: 400 }
      );
    }

    await query(
      `UPDATE paslon SET
         nama_ketua = $2,
         nama_wakil = $3,
         foto_url = $4,
         visi_misi_url = $5
       WHERE id = $1`,
      [id, namaKetua, namaWakil, fotoUrl, visiMisiUrl]
    );
  } else {
    const body = (await request.json()) as {
      namaKetua?: string;
      namaWakil?: string;
      aktif?: boolean;
    };

    await query(
      `UPDATE paslon SET
         nama_ketua = COALESCE($2, nama_ketua),
         nama_wakil = COALESCE($3, nama_wakil),
         aktif = COALESCE($4, aktif)
       WHERE id = $1`,
      [
        id,
        body.namaKetua?.trim() ?? null,
        body.namaWakil?.trim() ?? null,
        body.aktif ?? null,
      ]
    );
  }

  const row = await getPaslon(id);
  return NextResponse.json({ paslon: mapPaslon(row!) });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(["admin"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const existing = await getPaslon(id);
  if (existing) {
    await deletePaslonUploadFile(existing.foto_url);
    await deletePaslonUploadFile(existing.visi_misi_url);
  }
  await query(`DELETE FROM paslon WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
