import type { APIRoute } from "astro";
import { getEnv } from "../../../lib/env";

export const prerender = false;

const API = "https://api.unsplash.com";

export const GET: APIRoute = async ({ url }) => {
  const key = getEnv("UNSPLASH_ACCESS_KEY");
  if (!key) return json({ error: "Unsplash isn't set up yet. Add an UNSPLASH_ACCESS_KEY." }, 503);

  const q = (url.searchParams.get("q") || "").trim();
  if (!q || q.length > 100) return json({ error: "A search term is required." }, 400);
  const page = Math.max(1, Number(url.searchParams.get("page") || "1") || 1);

  const params = new URLSearchParams({ query: q, page: String(page), per_page: "24", content_filter: "high" });
  try {
    const r = await fetch(`${API}/search/photos?${params}`, {
      headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
    });
    if (!r.ok) return json({ error: "Unsplash request failed." }, r.status);
    const data = await r.json();
    const results = (data.results || []).map((p: any) => ({
      id: p.id,
      thumb: p.urls?.small,
      regular: p.urls?.regular,
      alt: p.alt_description || p.description || "",
      color: p.color || "#0a120d",
      name: p.user?.name || "Unknown",
      username: p.user?.username || "",
      downloadLocation: p.links?.download_location || "",
    }));
    return json({ total: data.total || 0, results });
  } catch {
    return json({ error: "Unable to reach Unsplash." }, 502);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
