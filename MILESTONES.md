# Movie Passport — Milestones

How to read this: `[x]` done and verified, `[ ]` not yet. Each milestone is done when every box is ticked and
`pnpm check` passes. Details and rationale live in [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).

| Milestone                      | Status         | Demo                                                     |
| ------------------------------ | -------------- | -------------------------------------------------------- |
| M0 — Foundation                | ✅ Done        | `pnpm dev` serves the app on http://127.0.0.1:3002       |
| M1 — Interactive Earth         | ✅ Done        | Rotate, hover and click countries; camera focuses; reset |
| M2 — Placeholder movie posters | ⚪ Next        | 15–20 generated posters on the globe                     |
| M3 — Mode A ↔ B                | ⚪ Not started | Country view lists its movies; URL sync; search          |
| M4 — Real movie data           | ⚪ Not started | Licensed metadata from a chosen source                   |
| M5 — Polish & ship (optional)  | ⚪ Not started | Deployed site, a11y and performance budgets met          |

**Last verified:** 2026-11-10 — `pnpm check` green (lint, typecheck, 28 unit tests, build);
`pnpm test:e2e` 35 passed (desktop Chrome + Pixel 7 emulation), stable over 3 repeats.

---

## M0 — Foundation ✅

- [x] Next.js 16 + TypeScript + Tailwind scaffolded with pnpm (corepack)
- [x] Prettier + Tailwind class sorting; ESLint with arrow-function rules
- [x] Vitest and Playwright configured
- [x] Dev and start servers bound to `127.0.0.1` only
- [x] README with commands; this tracker and the implementation plan
- [x] `pnpm check` (lint + typecheck + unit tests + build) passes

## M1 — Interactive Earth ✅

Deliverables (from the brief, §5):

- [x] Scaffold Next.js + TypeScript + Tailwind project
- [x] Install react-globe.gl and three
- [x] Dynamically load globe client-side (`ssr: false` inside a Client Component)
- [x] Render dark Earth and subtle atmosphere (plus a three.js starfield)
- [x] Support drag, zoom, and idle auto-rotation (pauses while dragging, resumes after 4 s)
- [x] Load low-resolution GeoJSON country boundaries (Natural Earth 110m, 177 countries)
- [x] Highlight countries on hover (+ tooltip; no tooltip on touch screens)
- [x] Detect country selection via click/tap (resolved by point-in-polygon, see plan §3)
- [x] Smoothly focus camera on selected country (label point, size-aware altitude)
- [x] Display selected country name in a React overlay (card on desktop, bottom sheet on phones)
- [x] Provide reset-to-global-view action (button and `Esc`)
- [x] Verify desktop and mobile interactions (Playwright: desktop Chrome and Pixel 7 emulation)

Acceptance criteria:

- [x] No browser/server rendering errors (asserted in e2e: no console errors or page errors)
- [x] Country selection is correct for tested countries (France, Norway, Brazil, Japan, Australia,
      Russia, USA, South Africa, Chile, Fiji; Lesotho-inside-South-Africa in unit tests)
- [x] Camera transitions are smooth; globe remains responsive (~60 fps measured on Apple GPU)
- [x] Country labels and selection state remain synchronized (heading, live region, `data-mode`)
- [x] Reset returns to the intended global viewpoint (lat 20°, global altitude, same longitude)

Worth a manual look (not automatable):

- [ ] Drag/zoom feel and transition smoothness on your own screen
- [ ] Tap, drag and pinch on a real phone (emulation covers layout and taps, not feel)

Extras beyond the brief: reduced-motion support (no auto-rotation, instant moves), loading / fetch
error / WebGL-unavailable states, screen-reader announcements.

## M2 — Placeholder movie posters

- [ ] Mock movies: id, title, year, country codes, coordinates, generated poster
- [ ] 10–20 posters on the globe via the HTML Elements layer
- [ ] Back-hemisphere posters hidden; poster size tuned for readability
- [ ] Poster hover/click interaction
- [ ] Spike: Three.js textured planes vs HTML markers, written up in `docs/decisions/`
- [ ] Visible-poster cap by zoom level; dev FPS meter

## M3 — Mode A ↔ B

- [ ] Global / country UI states share one globe instance
- [ ] Posters filtered to the selected country, animated in/out
- [ ] Responsive movie list panel with simple statistics
- [ ] Countries with movies are shaded; empty state for countries without
- [ ] URL sync (`?country=FR`), browser Back returns to Mode A
- [ ] Keyboard-accessible country search
- [ ] Loading and empty states; reduced-motion pass

## M4 — Real movie data

- [ ] Source comparison (licence, attribution, limits, poster rights) as a decision record
- [ ] Definition of "country" and co-production handling settled
- [ ] Build-time data script producing static JSON
- [ ] Attribution shown in the app
- [ ] API route / backend only if a feature requires it

## M5 — Polish & ship (optional)

- [ ] Frame-time budget with the full poster set
- [ ] axe accessibility checks in Playwright
- [ ] Lighthouse pass
- [ ] Deployed (only with explicit sign-off)
