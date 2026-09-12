import type { APIRoute } from "astro";
import { saveUpload } from "../../lib/media";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Invalid form data" }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "No file provided." }, 400);

  try {
    const asset = await saveUpload(file);
    return json({ asset }, 201);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Upload failed." }, 400);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
