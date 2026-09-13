# Anpabelt.com — Personal Website (Astro)

## Context
Existing personal portfolio site (Astro + TypeScript + Tailwind v4 + SQLite/libSQL, node adapter).
Dark "deep green" theme, mint accent (#7FE3BB), Fraunces serif display type.

## Task done (2026-09-13)
Designed and integrated a custom animated site background:
- Abstract logo assets (mark + "Anpabelt." wordmark, transparent PNG) generated for reference.
- Final chosen background: animated "dark green hour" storm cloudscape.
  - Self-hosted HD cloud image at `/public/assets/images/storm-clouds.jpg` (darker, greener, detailed).
  - Lightning implemented as light that ILLUMINATES the cloud from within (no bolt lines):
    a bright copy of the cloud is revealed through several soft offset zones so a spread of
    real cloud texture glows; canvas adds only a faint ambient haze. Natural flicker timing.
  - Clouds drift slowly (46s scale+pan). `prefers-reduced-motion` disables motion.
- Component: `frontend/src/components/StormBackground.astro` (fixed, z-index -10, pointer-events none).
- Wired into `frontend/src/layouts/BaseLayout.astro`, replacing the old `<div class="site-bg">`.
  (Old `.site-bg` CSS remains in global.css, now unused.)

## Verified
- Homepage hero + content sections readable on desktop (1920) and mobile (390).
- Tone/vignette keep the text pocket (upper-left/center) dark; cloud mass sits right/bottom.

## Backlog / possible next steps
- Tune flash frequency/intensity or lit-area size.
- Optional parallax second cloud layer.
- Remove unused `.site-bg` rule from global.css if desired.

## Task done (2026-09-13) — Medium-style rich text editor
Replaced the admin Markdown textarea with a WYSIWYG rich text editor (contenteditable).
- Toolbar (`PostEditor.astro` + `scripts/postEditor.ts`): text-style dropdown (Paragraph/H1/H2/H3/Quote/Code block),
  font-size dropdown (Small/Normal/Large/Huge), Bold, Italic, Underline, Strikethrough, inline code,
  bullet & numbered lists, link/unlink, insert-image-at-cursor. Image drag/drop/paste upload retained.
- Content is now saved as sanitized HTML. Legacy Markdown posts auto-convert to HTML when opened/edited
  (`toEditableHtml`) and are migrated on next save.
- Render pipeline (`lib/markdown.ts`): new `renderContent()` sanitizes editor HTML or converts legacy
  Markdown; allows u/s/mark/font-size/text-align. Used by `blog/[slug].astro` and `admin/preview/[id]`.
- Styles (`global.css`): `.article-content h1/u/s/mark`, `.rte-toolbar`/`.rte-btn`, editor placeholder,
  drop-cap disabled inside the editor.
- Verified via browser: new post formatting, legacy-post auto-convert, save/publish, public render (desktop+mobile).

## Task done (2026-09-13) — Editor power features
Added three enhancements to the rich text editor (`scripts/postEditor.ts`):
- **Slash commands**: type "/" on a line for a filterable menu (Heading 1/2/3, Text, Quote,
  Code block, Bullet/Numbered list, Divider, Image). Uses direct DOM block replacement (not
  execCommand) for predictable structure. Keyboard nav + fuzzy keyword matching.
- **Autosave**: quiet debounced save (~1.5s) that preserves the post's current status; shows
  "Autosaved ✓". Creates the draft + switches to its edit URL on first save.
- **Link preview cards**: pasting a bare URL onto an empty line inserts a Medium-style card
  (title, description, thumbnail, domain). New endpoint `actions/link-preview.ts` fetches Open
  Graph/meta tags server-side (auth-protected via middleware). Card markup whitelisted in
  `lib/markdown.ts`; styles + `.slash-menu` in `global.css`.
- Verified via browser: slash blocks produce clean HTML, autosave draft creation, link card
  rendering on the public blog page (mobile). Test posts cleaned up.

## Task done (2026-09-13) — Editor: drag reorder, card editing, word count
- **Drag reorder**: hover shows a grip handle in the left gutter; drag any top-level block
  (paragraph, heading, image, list, quote, link card) up/down with a live drop indicator line.
- **Inline card editing**: link-card title & description are contenteditable; hover controls to
  swap the thumbnail (upload) or remove the card. Editing affordances (controls, contenteditable
  attrs) are stripped from stored HTML via `cleanContent()` so saved content stays clean.
- **Word count**: live "N words · M min read" under the editor (`#rte-wordcount`), computed from
  `plainText()` excluding control chrome; updates on every edit and on load.
- All in `scripts/postEditor.ts`; UI in `PostEditor.astro`; styles in `global.css`.
- Verified via browser (desktop + mobile): word count updates, card title edit + clean serialize,
  block drag reorder (ALPHA→end), no console errors.

## Task done (2026-09-13) — Emoji picker, Table block, Unsplash (pending key)
- **Emoji picker**: type ":" + text for a filtered emoji menu (~90 emojis w/ keywords), arrow/Enter to
  insert; replaces the ":query" text with the glyph. (`postEditor.ts` EMOJI menu.)
- **Table block**: "/table" slash command inserts a styled 3-col table (header + 2 rows). Tab / Shift+Tab
  move between cells; Tab in the last cell appends a new row. Table styles in `global.css`
  (`.article-content table` + `.rte-editor`).
- **Unsplash search**: toolbar button + "/unsplash" slash command open a search modal; results insert as
  a `<figure>` with hotlinked photo + auto photographer/Unsplash attribution (utm), and fire the required
  download-tracking call. Endpoints: `actions/unsplash/search.ts`, `actions/unsplash/track-download.ts`
  (both auth-protected, key server-side via `UNSPLASH_ACCESS_KEY`).
  STATUS: code-complete + verified to degrade gracefully; **awaiting the user's Unsplash Access Key**
  (their app is under Unsplash review, 5–10 business days). Add `UNSPLASH_ACCESS_KEY=<key>` to
  `frontend/.env` and restart to activate.
- Verified via browser: emoji insert (🔥), table + Tab row-add, modal opens with friendly "not set up" message.
