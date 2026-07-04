import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { mapMahasiswa } from "@/lib/mappers";
import type { MahasiswaStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireSession(["admin", "panwaslu"]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(
    100,
    Math.max(5, Number(searchParams.get("pageSize") ?? 10) || 10)
  );
  const offset = (page - 1) * pageSize;

  const params: unknown[] = [];
  const where: string[] = [];

  if (status === "BELUM_MEMILIH" || status === "SUDAH_MEMILIH") {
    params.push(status);
    where.push(`status_memilih = $${params.length}`);
  }

  if (q) {
    params.push(`%${q}%`);
    const i = params.length;
    where.push(
      `(LOWER(nim) LIKE $${i} OR LOWER(nama) LIKE $${i} OR LOWER(kelas) LIKE $${i} OR LOWER(prodi) LIKE $${i} OR LOWER(angkatan) LIKE $${i})`
    );
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countParams = [...params];
  params.push(pageSize, offset);

  const [list, filtered, stats] = await Promise.all([
    query(
      `SELECT nim, nama, kelas, angkatan, prodi, status_memilih, voted_vote_id
       FROM mahasiswa
       ${whereSql}
       ORDER BY nama ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    ),
    query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM mahasiswa ${whereSql}`,
      countParams
    ),
    query<{ total: string; belum: string; sudah: string }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE status_memilih = 'BELUM_MEMILIH')::text AS belum,
         COUNT(*) FILTER (WHERE status_memilih = 'SUDAH_MEMILIH')::text AS sudah
       FROM mahasiswa`
    ),
  ]);

  const filteredTotal = Number(filtered.rows[0]?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));

  return NextResponse.json({
    mahasiswa: list.rows.map((row) =>
      mapMahasiswa(
        row as {
          nim: string;
          nama: string;
          kelas: string;
          angkatan: string;
          prodi: string;
          status_memilih: MahasiswaStatus;
          voted_vote_id: string | null;
        }
      )
    ),
    pagination: {
      page,
      pageSize,
      total: filteredTotal,
      totalPages,
    },
    stats: {
      total: Number(stats.rows[0]?.total ?? 0),
      belumMemilih: Number(stats.rows[0]?.belum ?? 0),
      sudahMemilih: Number(stats.rows[0]?.sudah ?? 0),
    },
  });
}
