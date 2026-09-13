# Anpabelt.com — Astro Blog + Admin

## Stack
Astro 5 (output: server), @astrojs/node (dev/preview via supervisor `astro dev`),
@astrojs/vercel (production), libsql/Turso DB, Tailwind 4, JWT cookie auth,
Vercel Blob for prod uploads / local disk in dev.

## Bug Fix — 2026-09-13 (blog admin editor)
Reported: (1) image upload (insert-image-at-cursor + cover) failed with
`Unexpected token 'C', "Cross-site"... is not valid JSON`; (2) Preview did nothing /
"A title is required"; (3) Save draft did nothing.

Root cause of (1): Astro's built-in CSRF `security.checkOrigin` (default ON) rejects
multipart/form-data POSTs whose browser `Origin` doesn't match the proxy-rewritten
host in production SSR (Vercel), returning plain text "Cross-site POST form
submissions are forbidden" that the client parsed as JSON. Only uploads (multipart)
were affected; JSON save/preview aren't origin-checked. Not reproducible under
`astro dev` (dev doesn't enforce checkOrigin), which is why the preview looked fine.

Fixes:
- `astro.config.mjs`: `security: { checkOrigin: false }` — safe because the admin
  session cookie is httpOnly + SameSite=Lax and all /actions/* require it.
- `src/scripts/postEditor.ts`: added `readJson()` helper so any non-JSON proxy/gateway
  response degrades to a readable message instead of "Unexpected token"; used it at all
  upload + save fetch sites. Empty-title Preview/Save now also focuses the title input
  (clarifies the "nothing happens" case).

Verified end-to-end in browser (login → new post): empty-title preview shows the
message + focuses title; save draft → Autosaved ✓; cover upload works; insert-image-at-
cursor inserts the image; no console errors.

## Backlog / Next
- Redeploy to Vercel so the checkOrigin fix takes effect in production.
- Unsplash search awaits an Unsplash Access Key.

## Bug Fix #2 — 2026-09-13 (production upload ENOENT + progress UI)
Reported: uploads on Vercel failed with `ENOENT ... open '/var/task/data/uploads/...'`.
Root cause: Vercel Lambda filesystem is read-only and `BLOB_READ_WRITE_TOKEN` is not set,
so `saveUpload()` fell back to local disk (`process.cwd()/data/uploads`) which cannot be
written on Vercel. ACTION REQUIRED BY USER: add a Vercel Blob store to the project (Vercel
dashboard → Storage → Create → Blob) which injects `BLOB_READ_WRITE_TOKEN`, then redeploy.
The code already uses `@vercel/blob` when that token exists (`lib/media.ts useBlob()`).
## Bug Fix #3 — 2026-09-13 (Vercel Blob uses OIDC, not a static token)
The connected Blob store `anpabelt-media` authenticates via OIDC: Vercel injects
`BLOB_STORE_ID` + auto-rotated `VERCEL_OIDC_TOKEN`, NOT a static `BLOB_READ_WRITE_TOKEN`.
Old `useBlob()` required the static token → disk fallback → upload error.
Fix (`lib/media.ts`): `useBlob()` now also enables when `BLOB_STORE_ID` (or
`VERCEL_OIDC_TOKEN`) is present; `put()` is called WITHOUT a token in the OIDC case so
the @vercel/blob SDK (v2.8.0, OIDC-capable) authenticates automatically. Static
`*_READ_WRITE_TOKEN` still used if present. No new env var required.
Requires: push to GitHub + Vercel redeploy. OIDC path only verifiable on Vercel (the
Emergent preview has no OIDC token and correctly still uses local disk).

## Feature — 2026-09-13 (Image Compression + Drag-to-Upload)
- Image compression (`postEditor.ts compressImage`): resizes photos to <=1920px and
  re-encodes to WebP q0.82 in-browser before upload; skips SVG/GIF + already-small
  (<300KB) files, and only keeps the result if smaller. Wired into `uploadWithProgress`
  so ALL upload paths (cover/inline/gallery/card) benefit. Verified: a 6.6MB PNG stored
  as .webp.
- Drag-to-upload (`PostEditor.astro` cover-dropzone + `postEditor.ts`): the Cover box is
  now a drop zone (dashed mint highlight on dragover); cover file input is `multiple`.
  Dropping N images uploads all — first becomes the cover, extras go to the gallery
  (gallery posts) or are inserted into the article body. Verified: 2-file drop → 1 cover
  + 1 inline, no console errors. Styles in `global.css`.

## Feature — 2026-09-13 (Alt Text Prompt + Gallery Drag-Reorder)
- Alt text (`postEditor.ts askAltText` modal): after an inline image uploads (toolbar/slash
  picker, single paste, single drop), a small modal asks for a short description prefilled
  with the cleaned filename; the value is written to the `<img alt>` (sanitizer already
  allows img alt). Batch drops skip the prompt (use filename) to avoid nagging. Gallery
  `<img>` now uses the caption as its alt. Verified: modal prefilled "harbour sunset",
  saved alt "Golden sunset over the harbour".
- Gallery drag-reorder (`postEditor.ts renderGallery` + `global.css`): gallery thumbnails
  are draggable (grip handle, grab cursor, mint drop-target outline); dropping on another
  cell reorders `images`. Removed the ←/→ arrow buttons. Verified: first→last reorder
  (['first','second','third'] → ['second','third','first']).

## Feature — 2026-09-13 (Inline Alt Editing + Bulk Captioning)
- Inline alt editing (`postEditor.ts editImageAlt` + editor click handler + `global.css`):
  clicking any already-placed content image (excludes link-card thumbs) reopens the
  alt-text modal prefilled with the current alt and updates it; hover shows a mint
  outline + pointer cursor. Verified: alt "cat" → edited to "A grey cat sleeping".
- Bulk captioning (`PostEditor.astro` "Caption all" button + `postEditor.ts openBulkCaption`
  + `global.css`): a modal lists every gallery photo with a caption input; Enter jumps to
  the next, "Save captions" applies all at once (captions double as gallery alt). Verified:
  two photos captioned in one pass, alts match.

## Feature — 2026-09-13 (Media Library delete)
- `lib/media.ts deleteMedia(id)`: removes the stored file (Vercel Blob `del` in prod via
  token/OIDC, disk `unlink` in dev — best-effort) then the DB row.
- New action `pages/actions/media/[id].ts` (DELETE, auth-protected by middleware).
- `pages/admin/media.astro`: per-item Delete button (with confirm) beside Copy URL;
  removes the card on success and reloads when the last item is deleted. Verified: 19 → 18
  items with "Image deleted ✓", no console errors.

## Feature — 2026-09-13 (Media Bulk Delete + Usage Indicator)
- Usage indicator (`admin/media.astro`): each media item is matched against all posts
  (coverImage === url, content includes url, or gallery images url) and shows
  "Used in N post(s)" (amber, with titles tooltip) or "Not used". Single + bulk delete
  warn when a used image is being removed.
- Bulk select delete: per-item checkbox overlay + "Select all"; a toolbar shows
  "N selected" and "Delete selected" which loops the DELETE action, removes cards, and
  reports success/failures. Verified: usage labels correct; selecting 2 → "2 selected" →
  delete → grid 20 → 18, "Deleted 2 images ✓", no console errors.

## Feature — 2026-09-13 (Media Replace-in-place + Search/Filter)
- Replace in place (`lib/media.ts replaceMedia` + PUT in `actions/media/[id].ts` + Replace
  button in `admin/media.astro`): overwrites the file while KEEPING the same url (Blob
  `put` same pathname with allowOverwrite+addRandomSuffix:false in prod; disk overwrite in
  dev), updating size/mime/name — so every post referencing it updates at once. Preview img
  gets a cache-bust query. Verified: url stayed `/media/…WFhQJUSa.png`, thumbnail swapped.
- Search + filter (`admin/media.astro`): client-side search box (matches original filename)
  + used/unused/all dropdown with a live "N shown" count. Verified: "zebra" → 1 shown;
  Unused → only data-used=0 items. No console errors.

## Feature — 2026-09-13 (Replace Confirmation + Sort Options)
- Replace confirmation (`admin/media.astro`): choosing a replacement now opens a modal
  showing Before (current) vs After (new file object URL) thumbnails; the PUT only fires on
  "Confirm replace" (Cancel/Esc aborts, input reset). Verified: 2 compare imgs + labels;
  cancel aborts; confirm → "Image replaced ✓".
- Sort options (`admin/media.astro`): dropdown sorts the grid by Newest (data-created),
  Name A–Z (data-name), Size largest (data-size), or Most used (data-used) by reordering
  DOM nodes. Added data-created/data-size to each item. Verified: Name sort A–Z correct,
  Most used sorted descending.


## Feature — 2026-09-13 (Admin Projects tab — DB-backed projects)
Requested: (1) remove the "New Post" nav tab (redundant with the + New Post button on the
Posts page); (2) add an admin tab to manage projects (image, description, tech stacks,
optional GitHub link, optional live preview) with draft/published toggle.

Implemented:
- New `projects` table (`lib/db.ts`) + one-time seed of the 7 existing hardcoded projects
  from `lib/site.ts` (tech-stack names, github vs live link derived from link labels).
- `lib/projects.ts`: full CRUD (list/get/create/update/delete, sort_order).
- Actions `pages/actions/projects/index.ts` (POST) + `[id].ts` (PUT/DELETE), auth-protected
  by existing middleware. Tech stacks accept comma-separated string or array.
- Admin UI: `admin/projects/index.astro` (list + status tabs + delete),
  `admin/projects/new.astro`, `admin/projects/[id]/edit.astro`, and
  `components/ProjectEditor.astro` (title, description, comma tech stacks, optional
  github/live URLs, blog-style image upload w/ drag-drop + paste URL, draft/publish/
  unpublish, delete).
- `AdminLayout.astro`: removed "New Post" nav link, added "Projects" (active union updated:
  posts|media|projects). `admin/posts/new.astro` now active="posts".
- Public `projects.astro` now reads published projects from the DB (was static site.ts).
  Homepage featured projects still use static site.ts (unchanged, out of scope).

Verified end-to-end (authenticated curl): nav shows Projects and no longer New Post; list
has the 7 seeded rows; create (201, tech stacks parsed) → published project appears on
public /projects; update to draft hides it publicly; delete restores count to 7.

## Feature — 2026-09-13 (Projects: tech filter chips + drag reorder + blog-parity editor)
Requested: (1) filter chips on public /projects to browse by tech; (2) drag-and-drop
reorder in admin; (3) make the admin Projects UI match the admin Blog (no difference).

Implemented:
- Public filter chips (`projects.astro` + `ProjectCard.astro data-tech`): "All" + one chip
  per unique published tech stack; single-select client filter toggles `.hidden` on cards
  (exact token match on the pipe-joined data-tech), with an empty-state message.
- Drag reorder: `lib/projects.ts reorderProjects(ids)` + `actions/projects/reorder.ts`
  (POST, auth-protected). `admin/projects/index.astro` rows are draggable (grip handle)
  only on the All tab; on drop the new id order is POSTed and persisted to sort_order
  ("Order saved ✓"). Public /projects already orders by sort_order.
- Blog parity: `ProjectEditor.astro` restructured to match `PostEditor.astro` — borderless
  big title + content-style description block in the main column; sidebar Status card
  (Save draft / Publish / Unpublish), Project image card (upload + drag-drop + paste URL),
  and a Details card (tech stacks + optional GitHub + optional live). List page mirrors the
  Posts list (status tabs, rows, delete).

Verified: public shows 21 filter chips (All + 20 techs) with All active; reorder POST
reverses then restores order (200, order changes persist); admin list has data-reorder="1"
+ 7 drag handles on the All tab.

## Public side — 2026-09-13 (green glow removal + speed/SEO; React proposal pending)
- Removed the mint conic-gradient glow ring around the About profile photo
  (`.profile-wrap::before` deleted from `global.css`); kept the plain circle + thin border.
- Speed: profile image compressed 424KB PNG -> 13KB WebP (sharp, 440px), img now has
  width/height + decoding=async + fetchpriority=high; enabled Astro viewport `prefetch`
  (prefetchAll) for faster navigation.
- SEO: added JSON-LD Person + WebSite structured data, theme-color, author meta, explicit
  robots index/follow, og:image:alt + twitter:image:alt in BaseLayout. No visual change.
- React.js: user asked for a proposed list of features to convert to React before deciding.
  Proposal delivered (projects filter, contact form, blog search, ⌘K command palette,
  project/blog image lightbox, skills hover cards). Awaiting user's pick — NOT yet built.
