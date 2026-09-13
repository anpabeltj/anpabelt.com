import type { APIRoute } from "astro";
import { deleteMedia } from "../../../lib/media";

export const prerender = false;

export const DELETE: APIRoute = async ({ params }) => {
  const ok = await deleteMedia(params.id!);
  if (!ok) return json({ error: "Media not found." }, 404);
  return json({ ok: true });
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
