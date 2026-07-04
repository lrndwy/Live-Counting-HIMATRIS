import { NextResponse } from "next/server";
import {
  createSessionToken,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { query } from "@/lib/db";
import type { UserRole } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email dan password wajib diisi" },
      { status: 400 }
    );
  }

  const result = await query<{
    id: string;
    email: string;
    display_name: string;
    role: UserRole;
    active: boolean;
    password_hash: string;
  }>(
    `SELECT id, email, display_name, role, active, password_hash
     FROM users WHERE email = $1`,
    [email]
  );

  const user = result.rows[0];
  if (!user || !user.active) {
    return NextResponse.json(
      { error: "Email atau password salah" },
      { status: 401 }
    );
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return NextResponse.json(
      { error: "Email atau password salah" },
      { status: 401 }
    );
  }

  const session = {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    role: user.role,
  };

  const token = await createSessionToken(session);
  await setSessionCookie(token);

  return NextResponse.json({ user: session });
}
