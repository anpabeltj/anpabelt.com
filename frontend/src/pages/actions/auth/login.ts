import type { APIRoute } from "astro";
import { authenticate, signSession, setSessionCookie } from "../../../lib/auth";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const email = (body.email ?? "").trim();
  const password = body.password ?? "";
  if (!email || !password) return json({ error: "Email and password are required." }, 400);

  const user = await authenticate(email, password);
  if (!user) return json({ error: "Invalid email or password." }, 401);

  setSessionCookie(cookies, signSession(user));
  return json({ user });
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
