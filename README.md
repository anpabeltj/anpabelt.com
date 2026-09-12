# anpabelt.com

My personal digital home — portfolio, projects and an editorial blog with a private
writing/admin system. Rebuilt from a static HTML + Tailwind site into a maintainable,
TypeScript‑first application.

- **Live:** https://anpabelt.com
- **Stack:** [Astro](https://astro.build) (SSR) · TypeScript · Tailwind CSS v4 · SQLite

The application lives in [`frontend/`](./frontend). The original static site is preserved
under [`legacy/`](./legacy) for reference.

---

## Architecture

A single, self‑hostable Astro app renders every page server‑side and also exposes its own
small API — no separate backend service, no vendor lock‑in.

```
frontend/
├── astro.config.mjs         # Astro + Node adapter (SSR) + Tailwind v4 (Vite plugin)
├── data/                    # SQLite DB + uploaded images (git‑ignored, created at runtime)
└── src/
    ├── layouts/             # BaseLayout (public), AdminLayout
    ├── components/          # Nav, Footer, Starfield, ProjectCard, PostCard, PostEditor
    ├── lib/                 # db, auth, posts, media, markdown, site content, types
    ├── middleware.ts        # protects /admin/* and /actions/*
    └── pages/
        ├── index / about / projects / contact
        ├── blog/            # /blog and /blog/[slug]
        ├── admin/           # login, dashboard, editor, media, preview (auth‑gated)
        ├── actions/         # server endpoints (auth, posts CRUD, upload, contact)
        └── media/[filename] # serves uploaded images
```

> **Note on routes:** server endpoints are under `/actions/*` and uploaded files under
> `/media/*` (not `/api/*`). This keeps everything inside one Astro app while remaining
> compatible with the hosting proxy.

### Content model (`src/lib/types.ts`)

A `Post` has `id, title, slug, excerpt, content` (Markdown), `coverImage, status`
(`draft` | `published`), `type`, `tags[]`, `createdAt, updatedAt, publishedAt`. The `type`
field is already in place so photo / video / journal / gallery posts can be added later
without a migration.

---

## Local development

Requirements: **Node 20+** and **Yarn**.

```bash
cd frontend
cp .env.example .env      # then edit the values (see below)
yarn install
yarn dev                  # http://localhost:3000
```

Other scripts: `yarn build` (production build) · `yarn preview` (run the built Node server)
· `yarn typecheck`.

## Environment variables (`frontend/.env`)

| Variable         | Purpose                                              |
| ---------------- | ---------------------------------------------------- |
| `SITE_URL`       | Canonical site URL (used for SEO, sitemap, OG tags)  |
| `JWT_SECRET`     | Secret used to sign admin session tokens (64+ chars) |
| `ADMIN_EMAIL`    | Admin login email (seeded on first boot)             |
| `ADMIN_PASSWORD` | Admin login password                                 |
| `ADMIN_NAME`     | Display name for the admin                           |

Secrets are never committed — `.env` is git‑ignored (`.env.example` is the template).

## Database & admin setup

SQLite is created automatically at `frontend/data/blog.db` on first run. On boot the app:

1. creates the schema,
2. seeds the admin account from the `ADMIN_*` env vars (updates the password if it changed),
3. seeds a couple of sample posts if the blog is empty.

Sign in at **`/admin/login`**, then write from **`/admin`** — create/edit posts, save drafts,
publish/unpublish, upload cover images, browse the media library and preview before publishing.
Images are stored on disk under `frontend/data/uploads/` and served from `/media/…`.

## Deployment

### Vercel (serverless)

The app auto-detects Vercel (`@astrojs/vercel` adapter) and uses **Turso** (libSQL) for
the database and **Vercel Blob** for image uploads — both have free tiers and work on
Vercel's read-only serverless filesystem.

1. **Import the repo** in Vercel → New Project. Set **Root Directory** to `frontend`
   (Framework preset: Astro).
2. **Create a Turso database** (free): install the CLI, then
   `turso db create anpabelt` and `turso db tokens create anpabelt`. Grab the database URL
   (`libsql://…turso.io`) and the token.
3. **Create a Blob store**: Vercel project → **Storage → Create → Blob**. This adds
   `BLOB_READ_WRITE_TOKEN` to the project automatically.
4. **Set Environment Variables** (Project → Settings → Environment Variables):
   `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
   `ADMIN_NAME` (and optionally `SITE_URL`).
5. **Deploy**, then **connect your domain**: Project → Settings → Domains → add
   `anpabelt.com` and update your registrar's DNS as Vercel instructs (remove old records).

The admin is seeded from `ADMIN_EMAIL`/`ADMIN_PASSWORD` on first request.

### Self-hosting (Node)

```bash
cd frontend
yarn install --production=false
yarn build
node ./dist/server/entry.mjs        # serves on $PORT (default 3000)
```

Run it behind a reverse proxy (Nginx/Caddy) with a process manager (systemd/PM2/Docker).
Persist the `frontend/data/` directory (SQLite database + uploaded images) with a volume or
regular backups. Set the environment variables listed above in your server environment.

## SEO & performance

Server‑rendered HTML, per‑page titles/descriptions, canonical URLs, Open Graph + Twitter
metadata (articles include their own), `/sitemap.xml`, `/robots.txt`, semantic markup and a
proper heading hierarchy. The public site ships almost no client JavaScript (a small script
for the mobile menu, the contact form and the reading‑progress bar); animations are CSS‑only
and respect `prefers-reduced-motion`.
