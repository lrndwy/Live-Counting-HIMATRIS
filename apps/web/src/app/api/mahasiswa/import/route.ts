import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  parseMahasiswaExcel,
  upsertMahasiswaRows,
} from "@/lib/import-mahasiswa";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireSession(["admin"]);
  if (auth.error) return auth.error;

  const form = await request.formData();
  const file = form.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "File Excel wajib diunggah" },
      { status: 400 }
    );
  }

  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
    return NextResponse.json(
      { error: "Format file harus .xlsx, .xls, atau .csv" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = parseMahasiswaExcel(buffer);

  if (rows.length === 0) {
    return NextResponse.json(
      {
        error:
          "Tidak ada baris valid. Pastikan header berisi kolom NIM dan NAMA (opsional: KELAS, ANGKATAN, PRODI).",
      },
      { status: 400 }
    );
  }

  const result = await upsertMahasiswaRows(rows);
  return NextResponse.json(result);
}
