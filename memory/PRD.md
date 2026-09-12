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

## Implemented
### Phase 3 (2026-09-12) — Editorial redesign
- Refined to a calm, serif-forward editorial look (matching a user-provided reference): Fraunces display/serif + DM Sans + JetBrains Mono, near-black deep-green palette with a soft mint accent.
- Replaced the animated teal starfield with a generated subtle dark background image (`/assets/images/bg-editorial.jpg`) + gentle overlay.
- Home rebuilt: mono kicker, big serif hero ("Hi there. / I'm *Anpabelt*."), numbered "Three things I keep coming back to", "Selected work" (numbered, image + tech + links), "From the journal" list.
- Nav: clean transparent editorial bar, serif brand "Anpabelt.", **Admin link removed from the public nav** (admin still reachable at /admin); "Blog" renamed to "Writing".
- Accent color unified teal→mint across public pages.

### Phase 2 (2026-09-12) — Photo / Gallery post type
- Extended content model: `Post.images: {url,caption}[]` (+ SQLite `images` column with additive migration); `type` now supports `gallery`/`photo`.
- Admin editor: Article/Gallery type toggle + gallery manager (multi-upload, per-photo captions, reorder, remove); first upload auto-sets cover. Client script externalised to `src/scripts/postEditor.ts` (data via JSON tag).
- Public rendering: `Gallery.astro` masonry grid + keyboard lightbox on article & preview; blog cards show photo count + gallery badge and fall back to first photo as cover.
- Create/update endpoints validate `type` + parse `images`. Demo gallery post seeded. Lint clean.
- In-editor images: article body supports inserting uploaded images via a toolbar button, drag & drop, or paste — uploads then inserts `![alt](url)` Markdown at the cursor (renders as lazy `<img>`).

### Phase 1 (2026-09-12) — Migration + blog + admin
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
