import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { mapPaslon } from "@/lib/mappers";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(["admin"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const body = (await request.json()) as {
    namaKetua?: string;
    namaWakil?: string;
    fotoUrl?: string | null;
    aktif?: boolean;
  };

  const existing = await query(`SELECT id FROM paslon WHERE id = $1`, [id]);
  if (existing.rowCount === 0) {
    return NextResponse.json({ error: "Paslon tidak ditemukan" }, { status: 404 });
  }

  await query(
    `UPDATE paslon SET
       nama_ketua = COALESCE($2, nama_ketua),
       nama_wakil = COALESCE($3, nama_wakil),
       foto_url = CASE WHEN $4::text = '__UNSET__' THEN foto_url ELSE $4 END,
       aktif = COALESCE($5, aktif)
     WHERE id = $1`,
    [
      id,
      body.namaKetua?.trim() ?? null,
      body.namaWakil?.trim() ?? null,
      body.fotoUrl === undefined ? "__UNSET__" : body.fotoUrl || null,
      body.aktif ?? null,
    ]
  );

  const result = await query(
    `SELECT id, nomor, nama_ketua, nama_wakil, foto_url, aktif FROM paslon WHERE id = $1`,
    [id]
  );

  return NextResponse.json({
    paslon: mapPaslon(
      result.rows[0] as {
        id: string;
        nomor: string;
        nama_ketua: string;
        nama_wakil: string;
        foto_url: string | null;
        aktif: boolean;
      }
    ),
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(["admin"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  await query(`DELETE FROM paslon WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
