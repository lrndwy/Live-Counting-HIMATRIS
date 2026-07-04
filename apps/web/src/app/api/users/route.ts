import { NextResponse } from "next/server";
import { hashPassword, requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { mapUser } from "@/lib/mappers";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSession(["admin"]);
  if (auth.error) return auth.error;

  const result = await query(
    `SELECT id, email, display_name, role, active
     FROM users
     WHERE role = 'panwaslu'
     ORDER BY created_at DESC`
  );

  return NextResponse.json({
    users: result.rows.map((row) =>
      mapUser(
        row as {
          id: string;
          email: string;
          display_name: string;
          role: "panwaslu";
          active: boolean;
        }
      )
    ),
  });
}

export async function POST(request: Request) {
  const auth = await requireSession(["admin"]);
  if (auth.error) return auth.error;

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    displayName?: string;
  };

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const displayName = body.displayName?.trim() || email;

  if (!email || password.length < 6) {
    return NextResponse.json(
      { error: "Email dan password (min 6 karakter) wajib diisi" },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);

  try {
    const result = await query(
      `INSERT INTO users (email, password_hash, display_name, role, active)
       VALUES ($1, $2, $3, 'panwaslu', true)
       RETURNING id, email, display_name, role, active`,
      [email, passwordHash, displayName]
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("users_email_key")) {
      return NextResponse.json(
        { error: "Email sudah terdaftar" },
        { status: 409 }
      );
    }
    throw err;
  }
}
