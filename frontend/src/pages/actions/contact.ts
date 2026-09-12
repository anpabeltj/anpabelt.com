import type { APIRoute } from "astro";
import { db } from "../../lib/db";
import { nanoid } from "nanoid";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: { name?: string; email?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const message = (body.message ?? "").trim();

  if (!name || !email || !message) return json({ error: "All fields are required." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Please enter a valid email." }, 400);
  if (message.length > 5000) return json({ error: "Message is too long." }, 400);

  const c = await db();
  await c.execute({
    sql: "INSERT INTO contact_messages (id, name, email, message, created_at, read) VALUES (?, ?, ?, ?, ?, 0)",
    args: [nanoid(), name, email, message, new Date().toISOString()],
  });

  return json({ ok: true });
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
