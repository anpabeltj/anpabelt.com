# PRD — anpabelt.com (personal site + editorial blog + admin CMS)

## Original problem statement
Transform the existing static HTML + Tailwind personal website
(github.com/anpabeltj/anpabelt.com) into a modern, maintainable personal web app that stays
minimalist, professional, fast and visually distinctive — a real "digital home", not a generic
AI portfolio. Preserve existing content/identity, add an editorial blog and a private
writing/admin system, keep it self‑hostable with no vendor lock‑in.

## User choices (confirmed)
- Architecture: **Astro + TypeScript + SQLite** (single self‑hosted app)
- Visual: **keep the dark retro/space identity, refined & editorial**
- Auth: **JWT username + password** (single admin)
- Contact: **working contact form** (stores messages)
- Extra: **image upload** feature (media library)
- Proceed straight into building.

## Architecture
- Astro SSR (`@astrojs/node` standalone) on port 3000, Tailwind v4 (Vite plugin), TS strict.
- SQLite via better-sqlite3; auth via bcryptjs + jsonwebtoken (httpOnly cookie); Markdown via
  marked + sanitize-html.
- Endpoints under `/actions/*`, uploads served at `/media/*` (proxy routes `/api` elsewhere).
- App in `/app/frontend`; original static site preserved in `/app/legacy`.

## Personas
- **Anpabelt (owner/admin):** writes long‑form posts, manages projects, uploads images.
- **Visitor:** reads the blog, browses projects/about, sends a contact message.

## Core requirements (static)
Preserve content • editorial redesign • clean TS architecture • blog (`/blog`, `/blog/:slug`)
• private admin CMS (`/admin`) • self‑hostable • performance • SEO • accessibility •
extensible content model.

## Implemented (2026-09-12)
- Migrated all existing content (home bio, "3 things I love", 7 projects, about
  experience/education + tech marquee, contact, socials) into typed content (`src/lib/site.ts`).
- Refined dark cosmic editorial design: floating glass nav, Lexend Giga/DM Sans/Newsreader/
  JetBrains Mono, CSS starfield + shooting stars (reduced-motion aware), staggered reveals.
- Blog: listing (title, excerpt, date, reading time, tags, cover, tag filter) + article
  (serif long-form, drop cap, styled quotes/code, cover, prev/next, reading progress).
- Admin CMS: JWT login, dashboard with status tabs, Markdown editor (draft/publish/unpublish/
  delete, slug auto-gen, tag input, cover upload, excerpt), preview page, media library.
- Image uploads to disk, served via `/media/:filename` (path-traversal guarded, type/size limits).
- Contact form persists messages to SQLite (server-side validated).
- SEO: per-page meta, OG/Twitter, canonical, `/sitemap.xml`, `/robots.txt`, semantic HTML.
- Extensible `Post.type` for future photo/video/journal/gallery content.
- Tested: backend 18/18 pytest; frontend E2E ~92% (all critical flows). Fixed: delete-button
  visibility after first save, slugify underscore handling.

## Backlog / next
- P1: Contact — email/Telegram notification on new message (currently stored only); admin inbox view.
- P1: Blog — image insertion helper inside the editor body (insert `/media` URL at cursor); code syntax highlighting (Shiki).
- P2: New content types (photo/gallery/journal) building on `Post.type`.
- P2: RSS feed; per-tag pages; draft "share preview" links.
- P2: Image optimization (resize/webp) on upload.
- Cleanup: `/app/backend` is unused by this app (Astro is the whole stack); remove from repo before push if desired.
