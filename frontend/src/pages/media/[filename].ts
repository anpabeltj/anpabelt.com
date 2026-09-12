import type { APIRoute } from "astro";
import { readUpload } from "../../lib/media";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const filename = params.filename ?? "";
  const file = await readUpload(filename);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(file.body), {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
