import type { APIRoute } from "astro";
import { getEnv } from "../../../lib/env";

export const prerender = false;

const HOST = "api.unsplash.com";

export const POST: APIRoute = async ({ request }) => {
  const key = getEnv("UNSPLASH_ACCESS_KEY");
  if (!key) return json({ error: "not configured" }, 503);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const loc = body?.downloadLocation;
  if (!loc) return json({ error: "downloadLocation is required" }, 400);

  let target: URL;
  try { target = new URL(loc); } catch { return json({ error: "Invalid download URL" }, 400); }
  if (target.protocol !== "https:" || target.hostname !== HOST) return json({ error: "Invalid Unsplash URL" }, 400);

  try {
    await fetch(target, { headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" } });
  } catch { /* tracking is best-effort */ }
  return json({ tracked: true });
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
