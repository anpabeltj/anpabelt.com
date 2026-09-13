import type { APIRoute } from "astro";
import { reorderProjects } from "../../../lib/projects";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
  if (!ids.length) return json({ error: "No ids provided." }, 400);
  await reorderProjects(ids);
  return json({ ok: true });
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
