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
