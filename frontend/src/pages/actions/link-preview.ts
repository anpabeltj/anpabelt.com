import type { APIRoute } from "astro";

export const prerender = false;

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function pick(html: string, patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1] && m[1].trim()) return decode(m[1]);
  }
  return "";
}

function metaPair(prop: string): RegExp[] {
  const p = prop.replace(/[:]/g, "\\:");
  return [
    new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${p}["']`, "i"),
  ];
}

export const GET: APIRoute = async ({ url }) => {
  const target = url.searchParams.get("url") || "";
  let parsed: URL;
  try {
    parsed = new URL(target);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("bad protocol");
  } catch {
    return json({ error: "Invalid URL" }, 400);
  }

  const domain = parsed.hostname.replace(/^www\./, "");
  const base = { url: target, domain, title: "", description: "", image: "" };

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch(target, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AnpabeltBot/1.0; +https://anpabelt.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);
    const type = res.headers.get("content-type") || "";
    if (!res.ok || !type.includes("text/html")) return json(base);

    // Only read the <head>-ish portion to keep things fast.
    const raw = (await res.text()).slice(0, 200_000);

    let title = pick(raw, [...metaPair("og:title"), ...metaPair("twitter:title")]);
    if (!title) {
      const t = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (t) title = decode(t[1].replace(/\s+/g, " "));
    }
    const description = pick(raw, [...metaPair("og:description"), ...metaPair("twitter:description"), ...metaPair("description")]);
    let image = pick(raw, [...metaPair("og:image:secure_url"), ...metaPair("og:image"), ...metaPair("twitter:image"), ...metaPair("twitter:image:src")]);
    if (image) {
      try { image = new URL(image, res.url || target).toString(); } catch { /* keep as-is */ }
    }

    return json({ url: target, domain, title: title.slice(0, 200), description: description.slice(0, 300), image });
  } catch {
    return json(base);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
