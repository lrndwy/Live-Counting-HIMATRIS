import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { query } from "./db";
import { hashPassword, verifyPassword } from "./password";
import type { SessionUser, UserRole } from "./types";

export { hashPassword, verifyPassword };

const COOKIE_NAME = "lc_session";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = payload.sub;
    if (!id) return null;

    const result = await query<{
      id: string;
      email: string;
      display_name: string;
      role: UserRole;
      active: boolean;
    }>(
      `SELECT id, email, display_name, role, active
       FROM users WHERE id = $1`,
      [id]
    );

    const row = result.rows[0];
    if (!row || !row.active) return null;

    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
    };
  } catch {
    return null;
  }
}

export async function requireSession(roles?: UserRole[]) {
  const session = await getSession();
  if (!session) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (roles && !roles.includes(session.role)) {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}
