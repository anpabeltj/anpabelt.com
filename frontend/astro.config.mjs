// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

const SITE_URL = process.env.SITE_URL || "https://anpabelt.com";
const onVercel = Boolean(process.env.VERCEL);

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  output: "server",
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
