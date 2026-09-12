// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

const SITE_URL = process.env.SITE_URL || "https://anpabelt.com";

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  output: "server",
  adapter: node({ mode: "standalone" }),
  server: { host: "0.0.0.0", port: 3000 },
  vite: {
    plugins: [tailwindcss()],
    server: {
      // Allow the preview proxy host(s) to reach the dev server.
      allowedHosts: [
        ".preview.emergentagent.com",
        ".preview.emergentcf.cloud",
        ".emergentagent.com",
        "localhost",
      ],
      hmr: { clientPort: 443 },
    },
    ssr: {
      external: ["better-sqlite3"],
    },
    optimizeDeps: {
      exclude: ["better-sqlite3"],
    },
  },
});
