# 0003 — Performance pass: frame budget and Lighthouse (M6)

- **Status:** done (M6, 2026-11-11)
- **Outcome:** the globe holds **60 fps with the CPU slowed 4×** in every view, up from ~23 fps.
  Lighthouse on the production build: **desktop 97–99**, **mobile 73–74** for performance, and
  **100** for accessibility, best practices and SEO on both.

## Frame rate

Production build with the globe test hook, headless Chromium 1.64 (Chrome for Testing), Apple M3 Pro,
Metal. Each run waits 2.5 s to settle, then records `requestAnimationFrame` for 4 s. The display caps
at 60 fps. Re-measure with `?debug=quiet&posters=0` (no posters) and `?debug=quiet&cap=0` (no
poster cap). The sky on/off comparison below used a temporary switch that has since been removed.

**Before**, CPU throttled 4× (unthrottled was a flat 60 everywhere):

| View                              | 1280×720 @1x, sky on / off | 1440×900 @2x, sky on / off |
| --------------------------------- | -------------------------: | -------------------------: |
| Globe only (no posters)           |                24.3 / 25.3 |                25.5 / 26.0 |
| Global view (12 posters)          |                21.3 / 23.3 |                24.0 / 25.5 |
| Zoomed in, Europe (60 posters)    |                22.0 / 22.5 |                23.8 / 24.0 |
| Uncapped (43 spaced posters face) |                22.0 / 23.5 |                22.8 / 22.8 |

**After**, CPU throttled 4×: **60 fps in every row**, p95 frame 16.8 ms. One first run at 1440×900
@2x zoomed in dipped to 48–52 fps while the night sky's textures uploaded; repeats held 60. At 6×
throttle the zoomed retina view holds 51–55 fps.

The night sky costs about 1–2 fps at 4× before the fix and nothing measurable after.

### Root cause

A CPU profile of an idle frame at 4× showed over a third of the time in three.js's
`getParameters` and `getProgramCacheKey`. Those should run only when a material changes. A scene
walk found **646 polygon materials** (country caps and sides) whose `version` went up every frame.

three.js draws a material that is both **transparent and double-sided** in two passes, back faces
then front. For each pass it flips `material.side` and sets `needsUpdate`, so the renderer re-checks
the shader for every country, twice, every frame. It also doubles the draw calls (1,622 per frame,
now 976).

### Fix

Country fills are now **opaque colours pre-mixed over the rendered ocean** (`onPlate` in
`src/lib/globe/theme.ts`). They look the same (sampled land #837f7a against #827f79 before), but
three.js draws each country once with no shader re-check. A unit test keeps every fill opaque.

## Lighthouse

Lighthouse 12.8.2 against `pnpm build` + `next start` on loopback, Metal Chromium, three runs each.
Mobile uses Lighthouse's default simulated slow 4G and 4× CPU.

| Category       | Desktop before → after | Mobile before → after |
| -------------- | ---------------------: | --------------------: |
| Performance    |             72 → 97–99 |            58 → 73–74 |
| Accessibility  |              100 → 100 |             100 → 100 |
| Best practices |              100 → 100 |              96 → 100 |
| SEO            |              100 → 100 |             100 → 100 |

Desktop after: FCP 0.2 s, LCP 0.5–0.6 s, TBT 110–130 ms, CLS 0. Mobile after: FCP 0.8 s, LCP 2.6 s
(observed 45–67 ms; the simulated figure charges script time to the paint), TBT 950–1,040 ms, CLS 0.
Total transfer about 1.17 MB.

Changes:

- **The 646-material fix above** removed most of the long tasks after load.
- **The caption renders while the map loads** instead of after, so the largest paint arrives with
  the first paint.
- **The night sky is built in idle time** after the globe is up, with its haze texture at 512×256 (a
  quarter of the work; it is soft and magnified anyway).
- **Poster title labels are left out on touch screens**, which never hover. They were 56% of the
  page's text at 10px and failed the mobile legible-font audit.
- **Fonts trimmed to the cuts in use:** Cinzel 400/500, Spectral 400 upright and italic.

### What still limits mobile

About 3.5 s of simulated script time, nearly all of it evaluating three.js and react-globe.gl
(554 KB transferred) and building the country meshes. That is the cost of a WebGL globe. Further
gains would need bigger work: precomputed country geometry, or a smaller three.js build.
