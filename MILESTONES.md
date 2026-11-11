# Movie Passport — Milestones

How to read this: `[x]` done and verified, `[ ]` not yet. Each milestone is done when every box is ticked and
`pnpm check` passes. Details and rationale live in [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).

| Milestone                      | Status  | Demo                                                                |
| ------------------------------ | ------- | ------------------------------------------------------------------- |
| M0 — Foundation                | ✅ Done | `pnpm dev` serves the app on http://127.0.0.1:3002                  |
| M1 — Interactive Earth         | ✅ Done | Rotate, hover and click countries; camera focuses; reset            |
| M2 — Placeholder movie posters | ✅ Done | 20 generated posters; click one to open the film                    |
| M3 — Mode A ↔ B                | ✅ Done | Country view lists its films; URL sync; search                      |
| M4 — Real movie data           | ✅ Done | 1,171 real films from TMDB, incl. Hong Kong, USSR…                  |
| M5 — Film details sheet        | ✅ Done | "More details" opens a full film page over the globe (UX to refine) |
| M6 — Polish & ship             | ⚪ Next | Deployed site, a11y and performance budgets met                     |

**Last verified:** 2026-11-11 — `pnpm check` green (lint, typecheck, 107 unit tests, build);
`pnpm test:e2e` 108 passed, 6 skipped (mouse-only tests on the phone project), desktop Chrome + Pixel 7
emulation. The TMDB token appears in no build output, no public file and no tracked file.

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

## M2 — Placeholder movie posters ✅

- [x] Mock movies: id, title, year, director, production countries, pin coordinates, generated
      poster art (20 films; co-productions such as Amélie FR+DE, Crouching Tiger TW+CN+US)
- [x] 10–20 posters on the globe via the HTML Elements layer
- [x] Back-hemisphere posters hidden; poster size grows with zoom (26–88 px)
- [x] Poster hover/click interaction: hover label, click/tap/keyboard opens a film card, camera
      flies to it, every production country lights up; country chips switch to that country
- [x] Spike: Three.js sprites vs HTML markers, measured and written up in
      [`docs/decisions/0001-poster-rendering.md`](docs/decisions/0001-poster-rendering.md)
- [x] Visible-poster cap by zoom level (12 / 16 / 60); dev FPS meter (`/?debug`)

Also fixed along the way: dragging and scroll-zooming keep working when the pointer is over a poster;
posters never draw over the info panels.

Worth a manual look:

- [ ] Poster size and density feel right on your screen (try `/?debug` to see the frame rate)

## M3 — Mode A ↔ B ✅

- [x] Global / country UI states share one globe instance (e2e checks the canvas is never replaced)
- [x] Posters filtered to the selected country, animated in/out (others fade and shrink away)
- [x] Responsive movie list panel with simple statistics (films, decades, co-productions; "with
      Germany" lines; hovering a film points at its poster)
- [x] Countries with movies are shaded (warmer with more films; count in the tooltip); empty state
      for countries without, suggesting the nearest countries that have films
- [x] URL sync: `?country=FR`, `?film=amelie`; browser Back/Forward move between views; unknown
      links show a notice and the whole globe
- [x] Keyboard-accessible search for countries and films: `/` to focus, arrows, Enter, Escape;
      accent-insensitive, finds ISO codes, original titles and directors
- [x] Loading and empty states; reduced-motion pass (no poster, panel or offset animation)

Also: the globe slides out from under the open panel (left of the card on desktop; into the band
between the search bar and the sheet on phones), so the focused country stays visible.

Worth a manual look:

- [ ] Search and the country list on a real phone (the sheet covers half the screen for big lists)

## M4 — Real movie data ✅

- [x] Source comparison (licence, attribution, limits, poster rights) as a decision record:
      [`docs/decisions/0002-movie-data-source.md`](docs/decisions/0002-movie-data-source.md) — TMDB
- [x] Definition of "country" and co-production handling settled: a film is listed in every
      producing country; "From" = its main country (first origin on the map), where its poster is
      pinned; everyone else lists it as a co-production
- [x] Build-time data script producing static JSON: `pnpm data:catalogue` (top 10 per country,
      ~1,171 films incl. small places and historical states, ~30 s); output gitignored, never
      committed (TMDB terms)
- [x] Token handled securely: `.env.local` only (gitignored, mode 600), build script only, verified
      absent from builds and the repo
- [x] Attribution shown in the app: About & credits dialog (TMDB logo + notice), "View on TMDB" links
- [x] API route / backend only if a feature requires it — none needed: static files
- [x] Real posters from TMDB's image CDN, generated art as fallback; plot summaries load on demand
- [x] Posters chosen from the side facing the camera, one per country first, spaced like map labels
      (the follow-up from decision 0001)
- [x] Clickable discs for places the 1:110m map has no shape for: 72 places (Natural Earth tiny
      countries, a few hand-entered, and historical states like the Soviet Union, Yugoslavia,
      Czechoslovakia at their capitals); drawn only when they have films (35 do); old codes (Burma,
      Zaire…) count as today's country. `src/data/places.json`, built by `pnpm data:places`

Worth a manual look:

- [ ] Real data on your screen: `pnpm data:catalogue`, then `pnpm dev`

## M5 — Film details sheet ✅

Functionality first, as agreed; layout and motion get refined later.

"More details" on a film card opens a sheet that rises from the bottom over the globe: the same
kinds of information as a TMDB film page, in Movie Passport's own design.

Behaviour:

- [x] "More details" in the film card opens the sheet (desktop: ~90% height, ~960 px wide, globe
      dimmed above; phones: near full height with a drag handle to swipe it down)
- [x] Closes with ✕, Esc, the backdrop, swipe down, or browser Back; focus returns to the card
- [x] Own link, `?film=<id>&details`, so shared links open it
- [x] Real modal dialog, keyboard-friendly; reduced motion fades instead of sliding
- [x] Globe pauses rendering while the sheet is open; images lazy-load

Content (version 1):

- [x] Header: backdrop, poster, title, year, age rating, runtime, genres, score
- [x] Tagline and plot; director and writers
- [x] Top-billed cast with photos and character names
- [x] Trailer, press to play (nothing loads from YouTube before that)
- [x] Facts: status, original language, budget, box office, release date
- [x] Production countries as buttons that fly the globe there; "More from {country}"
- [x] Keywords
- [x] Similar films: those in our catalogue open in the app, others link to TMDB
- [x] Where to watch in the viewer's country (from the browser, changeable): stream / rent / buy,
      credited "Data from JustWatch" with a link to JustWatch, as TMDB requires
- [x] Official site and social links

Data:

- [x] The build fetch also saves one details file per film (`public/data/films/<id>.json`,
      gitignored like the rest), from the same TMDB request with more appended; loaded on open
- [x] Left out on purpose: TMDB's community features (ratings widget, reviews, discussions,
      contributors, edit history) — linked to on TMDB instead

Found and fixed: the sheet and the film card shared a React key (both used the film id), which in
the production build caused an infinite render loop on `&details` links.

Worth a manual look:

- [ ] The sheet on a real phone: swipe-down on the handle, scrolling, the trailer

## M6 — Polish & ship (optional)

- [ ] Frame-time budget with the full poster set; globe baseline on slow CPUs (~23 fps at 4×)
- [ ] Draggable country sheet on phones (peek / expanded)
- [ ] axe accessibility checks in Playwright
- [ ] Lighthouse pass
- [ ] Deployed (only with explicit sign-off); TMDB token in the host's secret settings
