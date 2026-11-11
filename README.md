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

The first `pnpm test:e2e` needs a Playwright browser: `pnpm exec playwright install chromium`.

## Using it

- **Drag** to rotate, **scroll / pinch** to zoom. The globe turns slowly when left alone.
- **Hover** a country to highlight it; **click / tap** to focus the camera on it.
- **Click / tap a poster** to open the film: the camera flies to it and every production country
  lights up. Posters are also reachable with **Tab** and **Enter**.
- **Back to globe** or **Esc** zooms back out.
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
public domain. Films are a hand-entered mock list of 20 (`src/data/movies.ts`); poster art is
generated, not the studios' posters. Real data comes in M4.

## Debug panel

Add `?debug` to the URL for a frame-rate meter and the poster-rendering controls, e.g.
`/?debug&renderer=sprites&posters=1000&cap=0`. See
[`docs/decisions/0001-poster-rendering.md`](docs/decisions/0001-poster-rendering.md).
