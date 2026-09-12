import type { APIRoute } from "astro";
import { listPosts } from "../lib/posts";

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.toString() || "https://anpabelt.com").replace(/\/$/, "");
  const staticPaths = ["/", "/about", "/projects", "/blog", "/contact"];
  const posts = await listPosts({ status: "published" });

  const urls = [
    ...staticPaths.map((p) => ({ loc: `${base}${p}`, lastmod: new Date().toISOString() })),
    ...posts.map((p) => ({ loc: `${base}/blog/${p.slug}`, lastmod: p.updatedAt })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join("\n")}
</urlset>`;

  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
};
