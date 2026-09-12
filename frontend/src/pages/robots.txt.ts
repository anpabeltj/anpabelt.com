import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const base = (site?.toString() || "https://anpabelt.com").replace(/\/$/, "");
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /actions

Sitemap: ${base}/sitemap.xml
`;
  return new Response(body, { headers: { "Content-Type": "text/plain" } });
};
