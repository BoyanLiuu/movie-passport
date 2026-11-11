# Movie Passport — Implementation Plan

An interactive 3D globe for exploring movies by country. Source brief:
`../../docs/project-idea/05-globe-movie-explorer/Movie-Globe-Project-Plan.txt` (v1.0, November 2026).

Progress is tracked in [`MILESTONES.md`](../MILESTONES.md). This document explains _how_ each milestone is built
and records the decisions behind it.

## 1. What we are building

| Mode                 | What the user sees                                                                    | Entered by                      |
| -------------------- | ------------------------------------------------------------------------------------- | ------------------------------- |
| **A — Global view**  | Dark, cinematic Earth; country borders; idle auto-rotation; (later) posters around it | First load, Reset, `Esc`        |
| **B — Country view** | Camera focused on one highlighted country; side panel with its name, movies, stats    | Clicking (or tapping) a country |

One globe instance serves both modes. Mode changes are React state changes; the globe reacts to them.

## 2. Stack

| Concern         | Choice                                       | Why                                                                                   |
| --------------- | -------------------------------------------- | ------------------------------------------------------------------------------------- |
| App             | Next.js 16 (App Router) + TypeScript         | Brief's recommendation; same stack as the sibling projects                            |
| Globe           | `react-globe.gl` on `three`                  | Polygon layer, picking, camera tweening and HTML markers out of the box               |
| Country shapes  | Natural Earth 1:110m admin-0 (public domain) | 177 countries, small; includes representative label points (`LABEL_X/Y`)              |
| Styling         | Tailwind CSS 4                               | Overlay panels and responsive layout                                                  |
| State           | React `useState`                             | Two pieces of state (mode, hover). Zustand only if prop-drilling becomes painful (M3) |
| Tests           | Vitest (pure logic) + Playwright (browser)   | Geometry and camera maths are unit-testable; WebGL behaviour needs a real browser     |
| Package manager | pnpm via corepack                            | Matches `avatar-playground`                                                           |

## 3. Architecture

```
src/
  app/
    layout.tsx            Root layout, metadata, fonts
    page.tsx              Server component; renders <MovieGlobe />
    globals.css           Theme tokens, dark background
  components/globe/
    MovieGlobe.tsx        Client. Owns app state (mode, hovered). Lazy-loads GlobeScene with ssr:false.
    GlobeScene.tsx        Client-only. The only file that touches react-globe.gl / three. Props in, events out.
    CountryInfo.tsx       React overlay: selected country + Back to globe.
    GlobeStatus.tsx       Loading / error / WebGL-unsupported states.
    GlobeErrorBoundary.tsx
  hooks/
    useCountries.ts       Fetches /data/countries-110m.geojson -> Country[]
    useElementSize.ts     ResizeObserver -> globe width/height
    usePrefersReducedMotion.ts
  lib/geo/
    countries.ts          GeoJSON -> Country (ids, label point, focus bbox), pure + unit-tested
    camera.ts             Global viewpoint, focus altitude, pure + unit-tested
  lib/globe/
    theme.ts              Colours, altitudes, durations for the globe layers
scripts/
  prepare-countries.mjs   Strips Natural Earth GeoJSON to the fields we use, rounds coordinates
public/data/
  countries-110m.geojson  Output of the script (committed, ~210 KB, ~75 KB gzipped)
e2e/                      Playwright specs
```

**Boundary rule:** React panels never import three or react-globe.gl; `GlobeScene` never owns app state. The scene
receives `countries`, `selectedId`, `hoveredId`, `reducedMotion` and calls `onHover` / `onSelect`. Camera moves are
effects of `selectedId` changing, so "selection state and camera stay in sync" holds by construction.

### Mode state

```ts
type GlobeMode = { kind: "global" } | { kind: "country"; countryId: string };
```

- `global → country`: click a country polygon.
- `country → country`: click a different country (camera re-focuses; no detour through global).
- `country → global`: Back button, `Esc`, or (M3) browser Back.

### Camera

- **Focus target** = Natural Earth's representative label point, not the raw click point (a click near Chile's
  edge should still frame Chile).
- **Focus altitude** comes from the bounding box of the polygons within 30° of the label point (so France isn't
  framed together with French Guiana, or the contiguous USA with Alaska), with longitudes measured the short way round
  (Russia, Fiji cross ±180°). Clamped to `[0.35, 2.0]` globe radii, scaled up on portrait screens.
- **Longitude is tweened the short way** by react-globe.gl itself, so the camera never spins the long way round.
- **Reset** zooms out to the global altitude above the current longitude (a pure zoom-out, not a spin back to a fixed
  meridian). The very first view is a fixed `{ lat: 20, lng: 10 }` (Europe/Africa).
- **Idle auto-rotation** only in Mode A, paused while the user drags and resumed after a few idle seconds. Off when the
  user prefers reduced motion; transitions also become instant.

## 4. Milestones

Each milestone ends with a demoable app, green `pnpm check`, and its checklist ticked in `MILESTONES.md`.

### M0 — Foundation

Scaffold Next.js + TS + Tailwind with pnpm; Prettier (Tailwind class sorting), ESLint with the arrow-function rules
used in the sibling projects, Vitest, Playwright. Dev server bound to `127.0.0.1` only. README with commands.

### M1 — Interactive Earth (brief §5)

1. `prepare-countries.mjs`: keep `id` (ADM0_A3), `iso2`/`iso3` (the `_EH` variants — plain `ISO_A2` is `-99` for
   France and Norway), `name`, `continent`, `labelLat`/`labelLng`; round coordinates to 3 dp.
2. `lib/geo/countries.ts` + tests: normalisation, overseas-territory filter, antimeridian-aware bbox.
3. `lib/geo/camera.ts` + tests: focus altitude, portrait correction, global view.
4. `GlobeScene`: dark Phong globe material, blue atmosphere, Three.js starfield, polygon layer with hover/selected
   colours and lifted altitude, tooltip, click → `onSelect`, pointer cursor, idle auto-rotate.
5. `MovieGlobe`: state, `dynamic(() => import("./GlobeScene"), { ssr: false })`, `Esc` to reset, aria-live
   announcement of the selection.
6. `CountryInfo` overlay: desktop card, mobile bottom sheet, Back to globe.
7. Loading, fetch-error and WebGL-error states.
8. Playwright: loads without console errors; selecting a country shows its name; reset returns to Mode A; mobile
   viewport smoke test.

### M2 — Placeholder movie posters (brief §6)

- `data/movies.ts`: 15–20 mock films `{ id, title, year, countries: iso2[], lat, lng, poster }`. Real titles, but
  **generated** poster art (SVG gradient + title) — no copyrighted images until M4 settles rights.
- Render posters with the HTML Elements layer; hide back-hemisphere posters (`htmlElementVisibilityModifier`).
- Spike: the same posters as Three.js textured planes/sprites behind a dev toggle. Record the comparison (FPS,
  occlusion, crispness, click handling) in `docs/decisions/0001-poster-rendering.md`.
- Dev-only FPS meter; poster cap by zoom level.

### M3 — Mode A ↔ B (brief §7)

- Filter posters to the selected country; animate posters out/in during the camera move.
- Responsive side panel: movie list, simple stats (count, decade spread, co-productions).
- Shade countries that have movies; empty state for countries with none.
- URL sync (`?country=FR`) so Back/Forward and shared links work.
- Keyboard-accessible country search (the canvas itself is not keyboard-operable).
- Loading skeletons; reduced-motion pass.

### M4 — Real movie data (brief §8) — research first

- Compare sources (TMDB, Wikidata, OMDb …) on licence, attribution, rate limits and poster rights. Write it up as a
  decision record before writing code.
- Define "country" = production country (brief's preference); co-productions belong to every listed country.
- Prefer a build-time script that emits static JSON; add an API route or backend only when a feature needs it.

### M5 — Polish & ship (optional)

Performance budget (frame time with N posters), accessibility audit (axe), Lighthouse, attribution page, deploy.
Deploying is an outward-facing step and is done only with explicit sign-off.

## 5. Testing strategy

| Layer             | Tool       | Examples                                                                        |
| ----------------- | ---------- | ------------------------------------------------------------------------------- |
| Geometry / camera | Vitest     | Russia's longitude span crosses ±180°; France focuses on Europe; altitude clamp |
| State transitions | Vitest     | (M3) mode reducer, URL ⇄ state mapping                                          |
| Browser behaviour | Playwright | No console errors; select → name shown; Esc/Back resets; mobile viewport        |
| Manual            | Checklist  | Drag/zoom feel, transition smoothness, touch on a real phone                    |

## 6. Risks

| Risk                                      | Mitigation                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| WebGL code running during SSR             | Only `GlobeScene` imports the library, and only via `ssr: false`         |
| Hundreds of HTML posters tank frame rate  | Visibility culling + caps in M2; compare with Three.js sprites before M3 |
| Poster image rights                       | Generated placeholders until M4's licence review                         |
| Disputed territories / missing ISO codes  | Use ADM0_A3 as the stable id; ISO codes are optional fields              |
| Small countries are hard to click at 110m | M3 search box; consider 50m data later if needed                         |

## 7. Decisions log

| #   | Decision                                                                                                                    | Milestone |
| --- | --------------------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | Project name **Movie Passport** (`movie-passport`); renamed from Reel Atlas                                                 | M0        |
| 2   | Stylised globe (dark material + country polygons), no photo texture                                                         | M1        |
| 3   | Country id = Natural Earth `ADM0_A3`                                                                                        | M1        |
| 4   | Reset zooms out above the current longitude                                                                                 | M1        |
| 5   | Resolve clicks via `toGlobeCoords` + point-in-polygon, not `onPolygonClick` (its 50 ms throttled raycast misses quick taps) | M1        |
| 6   | E2E: opt-in `NEXT_PUBLIC_GLOBE_TEST_HOOK` build in `.next-e2e/`; GPU (Metal) Chromium on macOS                              | M1        |
| 7   | Playwright pinned to 1.64.1 to share browsers with `avatar-playground`                                                      | M1        |
