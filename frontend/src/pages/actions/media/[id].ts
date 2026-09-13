import type { APIRoute } from "astro";
import { deleteMedia, replaceMedia } from "../../../lib/media";

export const prerender = false;

export const DELETE: APIRoute = async ({ params }) => {
  const ok = await deleteMedia(params.id!);
  if (!ok) return json({ error: "Media not found." }, 404);
  return json({ ok: true });
};

export const PUT: APIRoute = async ({ params, request }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Invalid form data" }, 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "No file provided." }, 400);
  try {
    const asset = await replaceMedia(params.id!, file);
    if (!asset) return json({ error: "Media not found." }, 404);
    return json({ asset });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Replace failed." }, 400);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
