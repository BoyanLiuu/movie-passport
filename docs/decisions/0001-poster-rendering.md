# 0001 — Poster rendering: HTML markers vs three.js sprites

- **Status:** accepted (M2, 2026-11-11)
- **Decision:** render posters as **HTML markers** (react-globe.gl's HTML elements layer), capped at
  **60 rendered markers**. Keep the three.js sprite version behind `?debug` and switch to it if a
  later milestone needs more than ~150 posters on screen.

## Context

The brief (§6) asks to compare HTML markers with three.js textured planes before scaling up the
poster count. Both were built in M2 against the same generated poster art:

| Renderer             | How it works                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| **HTML markers**     | One DOM `<button>` + `<img>` per poster, positioned every frame by three.js's `CSS2DRenderer` over the canvas |
| **three.js sprites** | One camera-facing textured quad per poster in the WebGL scene; the SVG is rasterised to a canvas texture (2×) |

Code: `src/components/globe/posters/htmlPosters.ts`, `src/components/globe/posters/spritePosters.ts`.
Try either with `/?debug&renderer=html|sprites&posters=20|100|300|1000&cap=0`.

## Measurements

Headless Chromium 1.64 (Chrome for Testing) on an Apple M3 Pro, Metal backend, 1280×720 at 1×
pixel ratio. Globe auto-rotating, poster cap off, posters spread uniformly over the sphere (about half
face the camera at any moment). FPS is sampled six times over ~4 s; frame time is the median of 60
`requestAnimationFrame` deltas. The display caps at 60 fps.

| Posters |  HTML fps | HTML frame (p50 / p95) | Sprites fps | Sprites frame (p50 / p95) |
| ------: | --------: | ---------------------: | ----------: | ------------------------: |
|      20 |        60 |         16.7 / 18.8 ms |          60 |            16.6 / 18.1 ms |
|     100 |        60 |         16.7 / 18.4 ms |          60 |            16.6 / 18.4 ms |
|     300 |        60 |         16.6 / 18.7 ms |          60 |            16.8 / 18.0 ms |
|    1000 | **31–36** |     **28.4 / 34.8 ms** |          60 |            16.6 / 18.1 ms |

With the CPU throttled 4× (a rough stand-in for a mid-range phone):

|        Posters | HTML fps | Sprites fps |
| -------------: | -------: | ----------: |
| 0 (globe only) |    21–25 |           — |
|             20 |    21–24 |       22–26 |
|            100 |    21–24 |       23–26 |
|            300 |    17–21 |       23–24 |
|           1000 |     9–11 |       19–21 |

Reading: below ~100 posters neither renderer costs anything measurable; the globe itself is the
bottleneck on a slow CPU. HTML markers degrade from ~300 and fall apart at 1000; sprites barely notice.

## Qualitative comparison

|                          | HTML markers                                                        | three.js sprites                                                                       |
| ------------------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Scale                    | Fine to ~300, poor at 1000                                          | Fine at 1000+ (and instancing + a texture atlas would go much further)                 |
| Sharpness                | Crisp at every zoom (DOM image)                                     | Texture resolution fixed; soft when zoomed far in unless re-rasterised                 |
| Behind the globe         | Hidden by the layer's horizon test; they pop in and out at the edge | Depth-tested: occluded naturally, but clipped and sinking into the surface at the edge |
| Overlap order            | Layer z-orders by distance                                          | Depth buffer                                                                           |
| Hover, labels, selection | CSS: scale, ring, title label, transitions, reduced-motion          | Must be built by hand (raycast, scale, separate label system); not done in the spike   |
| Keyboard / screen reader | Real `<button>`s with labels; Tab + Enter works                     | None without a parallel DOM layer                                                      |
| Click handling           | Our hit-test over marker rectangles                                 | Our raycast, with a globe-occlusion check                                              |
| Effort so far            | Small                                                               | Small for the spike; large to match the HTML version's interaction and accessibility   |

## Decision

HTML markers now. They are crisp, styled with CSS, and accessible out of the box, and at the poster
counts this app needs on screen at once (a dozen when zoomed out, a few dozen when zoomed in) they
cost nothing measurable. `MAX_RENDERED_POSTERS = 60` (`src/lib/movies/posters.ts`) keeps a 5×
margin below where HTML markers start to slow down.

Revisit and move to sprites (likely an `InstancedMesh` with a poster texture atlas, plus a thin DOM
layer for focus and labels) if any of these becomes true:

- a view needs more than ~150 posters on screen at once, e.g. a "show every film" mode with real data;
- the M5 phone check misses the frame budget with posters on but not without;
- we want posters to sit _in_ the scene (depth, lighting, tilt) rather than on top of it.

## Consequences and follow-ups

- **Pointer handling:** markers ignore the pointer (`pointer-events: none`) and the globe hit-tests
  them, so dragging and scroll-zooming over a poster keep moving the globe. Keyboard focus still
  works because they are buttons.
- **Cap by camera-facing posters (M3/M4):** today the cap takes the top-ranked films worldwide, so
  with real data the visible hemisphere could end up empty. Rank among camera-facing posters instead.
- **Globe baseline on slow CPUs (M5):** ~23 fps at 4× throttle with no posters at all. Profile the
  polygon layer (restyling on hover re-runs accessors for 177 countries), atmosphere and starfield.
- The sprite renderer stays behind `?debug` for re-measuring; it is not a supported user path.
