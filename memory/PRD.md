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
