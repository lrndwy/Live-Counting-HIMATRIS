import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { mapUser } from "@/lib/mappers";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(["admin"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const body = (await request.json()) as { active?: boolean };

  if (typeof body.active !== "boolean") {
    return NextResponse.json({ error: "active wajib boolean" }, { status: 400 });
  }

  const existing = await query<{ role: string }>(
    `SELECT role FROM users WHERE id = $1`,
    [id]
  );
  const user = existing.rows[0];
  if (!user) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  }
  if (user.role === "admin") {
    return NextResponse.json(
      { error: "Tidak dapat menonaktifkan admin" },
      { status: 400 }
    );
  }

  const result = await query(
    `UPDATE users SET active = $2
     WHERE id = $1
     RETURNING id, email, display_name, role, active`,
    [id, body.active]
  );

  return NextResponse.json({
    user: mapUser(
      result.rows[0] as {
        id: string;
        email: string;
        display_name: string;
        role: "panwaslu";
        active: boolean;
      }
    ),
  });
}
