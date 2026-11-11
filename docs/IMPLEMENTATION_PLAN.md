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

- `src/data/movies.ts`: 20 mock films `{ id, title, originalTitle, year, director, countries: iso2[], place,
lat, lng, rank }`. Real titles, but **generated** poster art (`src/lib/movies/poster.ts`: SVG gradient,
  motif, title) — no copyrighted images until M4 settles rights.
- Posters render with the HTML Elements layer; back-hemisphere posters are hidden by the layer's horizon test.
  Markers ignore the pointer and the globe hit-tests them, so drag and wheel-zoom work over posters.
- A third mode, `{ kind: "movie" }`: the camera flies to the poster, every production country is highlighted,
  and a film card offers each country as a chip.
- Spike: the same posters as three.js sprites behind `?debug&renderer=sprites`; result in
  [`docs/decisions/0001-poster-rendering.md`](decisions/0001-poster-rendering.md) — HTML markers, capped at 60.
- `?debug` panel: FPS, renderer, stress-test poster count, cap toggle.

### M3 — Mode A ↔ B (brief §7)

- **The URL is the state** (`src/lib/navigation.ts`): `?country=FR` (ISO alpha-2, or the Natural Earth id when
  there is none) and `?film=amelie`, written with native `history.pushState` (Next.js integrates it), so
  Back/Forward and shared links work. Unknown values show a notice and the whole globe.
- Posters outside the selected country stay rendered but fade out (`data-out`), so they animate both ways.
- Country panel (`CountryInfo`): stats (films, decades, co-productions), film list with co-production
  partners, hover a film to point at its poster; empty state suggests the nearest countries with films
  (`src/lib/catalogue.ts`).
- Countries with films are tinted warmer by count, with the count in the tooltip.
- Search (`SearchBox`, ARIA combobox): countries and films, accent-insensitive, ISO codes, original titles,
  directors (`src/lib/search.ts`); `/` focuses it; picking a result moves focus to the panel heading.
- The globe's centre eases out from under the open panel (`usePanelOffset` → `globeOffset`).

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

| Risk                                              | Mitigation                                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------------- |
| WebGL code running during SSR                     | Only `GlobeScene` imports the library, and only via `ssr: false`              |
| Hundreds of HTML posters tank frame rate          | Visibility culling + caps in M2; compare with Three.js sprites before M3      |
| Poster image rights                               | Generated placeholders until M4's licence review                              |
| Disputed territories / missing ISO codes          | Use ADM0_A3 as the stable id; ISO codes are optional fields                   |
| Small countries are hard to click at 110m         | M3 search box (done); consider 50m data later if needed                       |
| three.js + globe chunk is ~550 KB gzipped         | Lazy-loaded after first paint (`ssr: false`); revisit in the M5 budget        |
| Globe alone ~23 fps with the CPU slowed 4×        | Profile the polygon layer, atmosphere and starfield in M5 (see decision 0001) |
| Poster cap ranks worldwide, not on-screen         | Rank among camera-facing posters once real data lands (M4)                    |
| Phone sheet covers half the screen for long lists | M5: a draggable sheet with peek / expanded states                             |

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
| 8   | Posters as HTML markers, max 60 rendered; sprites kept behind `?debug` (decision record 0001)                               | M2        |
| 9   | Poster markers are click-through; the globe hit-tests them so drag/zoom work over posters                                   | M2        |
| 10  | Movie mode highlights every production country; poster pinned at a city tied to the film                                    | M2        |
| 11  | The URL is the source of truth for the selection (`?country=`, `?film=`); native pushState                                  | M3        |
| 12  | Country param is ISO alpha-2 when it exists (shareable, readable), else Natural Earth id                                    | M3        |
| 13  | Shift the globe (`globeOffset`) to keep the focus clear of panels, rather than re-aiming the camera                         | M3        |
| 14  | `?debug=quiet` applies debug options without the panel (browser tests use it to turn posters off)                           | M3        |
