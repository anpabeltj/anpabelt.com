import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { AstroCookies } from "astro";
import { db as getDb } from "./db";
import { getEnv } from "./env";
import type { User } from "./types";

const COOKIE_NAME = "admin_session";
const SEVEN_DAYS = 60 * 60 * 24 * 7;

function secret(): string {
  return getEnv("JWT_SECRET", "insecure-dev-secret-change-me");
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export async function authenticate(email: string, password: string): Promise<User | null> {
  const c = await getDb();
  const rs = await c.execute({
    sql: "SELECT id, email, password_hash, name, role FROM users WHERE email = ?",
    args: [email.toLowerCase().trim()],
  });
  if (rs.rows.length === 0) return null;
  const row = rs.rows[0] as unknown as { id: string; email: string; password_hash: string; name: string; role: string };
  if (!verifyPassword(password, row.password_hash)) return null;
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

export function signSession(user: User): string {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name, role: user.role }, secret(), {
    expiresIn: SEVEN_DAYS,
  });
}

export function verifySession(token: string): User | null {
  try {
    const payload = jwt.verify(token, secret()) as jwt.JwtPayload;
    if (!payload.sub) return null;
    return {
      id: String(payload.sub),
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: String(payload.role ?? "admin"),
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(cookies: AstroCookies, token: string): void {
  cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SEVEN_DAYS,
  });
}

export function clearSessionCookie(cookies: AstroCookies): void {
  cookies.delete(COOKIE_NAME, { path: "/" });
}

export function getUserFromCookies(cookies: AstroCookies): User | null {
  const token = cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}
