// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import vercel from "@astrojs/vercel";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

const SITE_URL = process.env.SITE_URL || "https://anpabelt.com";
const onVercel = Boolean(process.env.VERCEL);

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  output: "server",
  prefetch: { prefetchAll: true, defaultStrategy: "viewport" },
  integrations: [react()],
  // Disable Astro's built-in CSRF origin check. Behind a reverse proxy (Vercel /
  // Cloudflare) the reconstructed request host does not match the browser Origin,
  // so multipart uploads were rejected with a plain-text "Cross-site POST form
  // submissions are forbidden" (which the client then failed to parse as JSON).
  // CSRF is already mitigated: the admin session cookie is httpOnly + SameSite=Lax
  // and every /actions/* route requires that cookie.
  security: { checkOrigin: false },
  // Vercel in production; local Node server (supervisor) for dev/preview.
  adapter: onVercel ? vercel() : node({ mode: "standalone" }),
  server: { host: "0.0.0.0", port: 3000 },
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: [
        ".preview.emergentagent.com",
        ".preview.emergentcf.cloud",
        ".emergentagent.com",
        "localhost",
      ],
      hmr: { clientPort: 443 },
    },
    ssr: {
      external: ["@libsql/client"],
    },
  },
});
