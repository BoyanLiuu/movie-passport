# Movie Passport

Travel the world through films: an interactive 3D globe for exploring movies country by country. Spin the Earth,
pick a country, and the camera flies in to it.

- **Progress:** [`MILESTONES.md`](MILESTONES.md) — what is done, what is next
- **Plan and decisions:** [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md)

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS 4, [react-globe.gl](https://github.com/vasturiano/react-globe.gl)
and three.js.

## Getting started

Requires Node 20.9+ (developed on 24). pnpm comes from corepack: run `corepack enable` once, or prefix
commands with `corepack`.

```bash
pnpm install
pnpm dev                 # http://127.0.0.1:3002
```

| Command               | What it does                                                              |
| --------------------- | ------------------------------------------------------------------------- |
| `pnpm dev`            | Dev server on http://127.0.0.1:3002 (loopback only)                       |
| `pnpm build`          | Production build                                                          |
| `pnpm start`          | Serves the production build on http://127.0.0.1:3002                      |
| `pnpm check`          | Lint, typecheck, unit tests and the production build                      |
| `pnpm test`           | Unit tests (Vitest): geometry and camera maths                            |
| `pnpm test:e2e`       | Browser tests (Playwright): builds to `.next-e2e/` and serves it on :3202 |
| `pnpm format`         | Prettier with Tailwind class sorting (`format:check` to verify)           |
| `pnpm data:countries` | Rebuilds `public/data/countries-110m.geojson` from Natural Earth          |
| `pnpm data:catalogue` | Fetches the TMDB film catalogue into `public/data/` (needs `.env.local`)  |
| `pnpm data:places`    | Rebuilds `src/data/places.json` (small places and historical states)      |

The first `pnpm test:e2e` needs a Playwright browser: `pnpm exec playwright install chromium`.

## Using it

- **Drag** to rotate, **scroll / pinch** to zoom. The globe turns slowly when left alone.
- **Hover** a country to highlight it; **click / tap** to focus the camera on it.
- **Click / tap a poster** to open the film: the camera flies to it and every production country
  lights up. Posters are also reachable with **Tab** and **Enter**.
- **Search** (press **/**) for a country or a film: arrow keys and Enter work, and it finds
  ISO codes ("jp"), original titles and directors.
- In a country, the panel lists its films; countries with films glow warmer on the globe.
- **Back to globe** or **Esc** zooms back out. Every view has its own link — `?country=FR`,
  `?film=amelie` — so browser Back/Forward and shared links work.
- With _reduce motion_ turned on in your OS, auto-rotation is off and camera moves are instant.

## How it fits together

```
src/components/globe/MovieGlobe.tsx   app state (global / country mode), overlays, Esc
src/components/globe/GlobeScene.tsx   the only file that touches react-globe.gl / three.js
src/lib/geo/countries.ts              GeoJSON -> countries, bounds, point-in-country
src/lib/geo/camera.ts                 viewpoints and focus altitude
src/components/globe/posters/         poster markers (HTML) and the sprite spike
src/lib/movies/                       poster art, size and how many to show
src/data/movies.ts                    mock catalogue (M2)
```

`GlobeScene` is loaded with `next/dynamic` and `ssr: false`: WebGL only exists in the browser.

Clicks are resolved from the pointer's release position (`toGlobeCoords` + point-in-polygon) rather
than react-globe.gl's `onPolygonClick`, which reports its last _throttled_ hover raycast and can miss
quick taps.

### Browser tests

`pnpm test:e2e` builds the app with `NEXT_PUBLIC_GLOBE_TEST_HOOK=1`, which exposes
`window.__moviePassportGlobe` so tests can aim at a country's exact screen position. The hook is
compiled out of normal builds. On macOS the tests use the GPU (Metal); elsewhere Chromium falls back
to software WebGL, which is slower.

## Data

Country boundaries: [Natural Earth](https://www.naturalearthdata.com/) 1:110m Admin 0 – Countries,
public domain.

Films come from [TMDB](https://www.themoviedb.org/) (non-commercial use, with attribution in the
app's About dialog). The data is **fetched at build time and never committed** — TMDB's terms forbid
redistributing it:

1. Get a free API Read Access Token at <https://www.themoviedb.org/settings/api>.
2. `cp .env.example .env.local` and set `TMDB_READ_TOKEN`. `.env.local` is gitignored; the token is
   only read by the fetch script and never reaches the browser.
3. `pnpm data:catalogue` — the 10 most-voted films from each country (~1,050 films, ~30 s), written
   to `public/data/` (gitignored). Re-run monthly: TMDB allows caching for at most 6 months.

Without a catalogue the app shows a hand-picked sample of 20 films with generated poster art
(`src/data/movies.ts`); the browser tests always use that sample. See
[`docs/decisions/0002-movie-data-source.md`](docs/decisions/0002-movie-data-source.md).

## Debug panel

Add `?debug` to the URL for a frame-rate meter and the poster-rendering controls, e.g.
`/?debug&renderer=sprites&posters=1000&cap=0`. See
[`docs/decisions/0001-poster-rendering.md`](docs/decisions/0001-poster-rendering.md).
