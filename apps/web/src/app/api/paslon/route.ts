import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { mapPaslon } from "@/lib/mappers";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await query(
    `SELECT id, nomor, nama_ketua, nama_wakil, foto_url, aktif
     FROM paslon
     ORDER BY nomor ASC`
  );

  return NextResponse.json({
    paslon: result.rows.map((row) =>
      mapPaslon(
        row as {
          id: string;
          nomor: string;
          nama_ketua: string;
          nama_wakil: string;
          foto_url: string | null;
          aktif: boolean;
        }
      )
    ),
  });
}

export async function POST(request: Request) {
  const auth = await requireSession(["admin"]);
  if (auth.error) return auth.error;

  const body = (await request.json()) as {
    nomor?: string;
    namaKetua?: string;
    namaWakil?: string;
    fotoUrl?: string;
  };

  const nomor = (body.nomor ?? "").trim().padStart(2, "0");
  const namaKetua = (body.namaKetua ?? "").trim();
  const namaWakil = (body.namaWakil ?? "").trim();
  const fotoUrl = (body.fotoUrl ?? "").trim() || null;

  if (!nomor || !namaKetua || !namaWakil) {
    return NextResponse.json(
      { error: "Nomor, nama ketua, dan nama wakil wajib diisi" },
      { status: 400 }
    );
  }

  await query(
    `INSERT INTO paslon (id, nomor, nama_ketua, nama_wakil, foto_url, aktif)
     VALUES ($1, $1, $2, $3, $4, true)
     ON CONFLICT (id) DO UPDATE
     SET nama_ketua = EXCLUDED.nama_ketua,
         nama_wakil = EXCLUDED.nama_wakil,
         foto_url = EXCLUDED.foto_url,
         aktif = true`,
    [nomor, namaKetua, namaWakil, fotoUrl]
  );

  const result = await query(
    `SELECT id, nomor, nama_ketua, nama_wakil, foto_url, aktif FROM paslon WHERE id = $1`,
    [nomor]
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
