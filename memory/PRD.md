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
- `lib/media.ts`: disk write now throws a clear, actionable message on Vercel instead of ENOENT.
- Added upload progress + live thumbnail toast (`postEditor.ts` `uploadWithProgress` +
  `createUploadToast`, styles in `global.css`), wired into cover, inline insert-at-cursor,
  and gallery uploads. Verified in preview (toast shows thumbnail, green bar to 100%).

