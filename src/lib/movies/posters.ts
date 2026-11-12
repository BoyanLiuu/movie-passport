// How many posters to show, and how big, for a given camera altitude.

import type { Movie } from "@/data/movies";
import { angularDistance } from "@/lib/geo/countries";

/** On-screen poster width in CSS pixels: grows as the camera zooms in, within readable bounds. */
export const posterWidth = (altitude: number) =>
  Math.round(Math.min(88, Math.max(26, 54 / Math.sqrt(Math.max(altitude, 0.01)))));

/**
 * Most HTML markers ever rendered at once. The M2 spike measured HTML markers at 60 fps up to 300
 * and ~33 fps at 1000 (docs/decisions/0001-poster-rendering.md); 60 keeps a wide margin.
 */
export const MAX_RENDERED_POSTERS = 60;

/**
 * Zoomed out, only the highest-ranked posters show (like map labels); zooming in reveals more.
 * Thresholds are coarse on purpose so the visible set rarely changes while the camera moves.
 */
export const posterLimit = (altitude: number) => {
  if (altitude >= 1.8) return 12;
  if (altitude >= 1) return 16;
  return MAX_RENDERED_POSTERS;
};

const byRank = (a: Movie, b: Movie) => b.rank - a.rank || a.id.localeCompare(b.id);

/** Degrees of arc from the view centre to the horizon, seen from `altitude` globe radii up. */
export const horizonDegrees = (altitude: number) =>
  (Math.acos(1 / (1 + Math.max(altitude, 0))) * 180) / Math.PI;

export type PosterSelection = {
  limit: number;
  /** What the camera looks at; null skips the facing test (e.g. before the first frame). */
  center: { lat: number; lng: number } | null;
  altitude: number;
  /** Always rendered, e.g. the selected film; other posters keep their distance from it. */
  always?: ReadonlySet<string>;
  /** Spacing between pins relative to the default (smaller in country view, to show more). */
  spacing?: number;
};

/** Prints kept on the globe around a selected film: enough for context, few enough to stay quiet. */
export const FILM_VIEW_POSTERS = 10;

/**
 * Minimum arc between two poster pins, like map labels: wide when zoomed out (about 11° at the
 * global view), tight close up, so posters spread out instead of piling up over dense regions.
 */
export const posterSeparation = (altitude: number, scale = 4.5) =>
  Math.min(14, Math.max(1, altitude * scale));

/**
 * Spacing (for `selectPosters`) that keeps whole prints apart when zoomed in: pins about one
 * poster height apart on screen, so no print covers another. Posters keep a fixed pixel size, so
 * the arc they cover shrinks with altitude: about altitude / 16.8 degrees per pixel on a 900 px
 * tall view with the globe's 50° field of view, and a poster is 1.5 times as tall as it is wide.
 */
export const printSpacing = (altitude: number) => 0.085 * posterWidth(altitude);

/**
 * The posters to render. Only films on the side of the globe facing the camera count towards the
 * limit; countries take turns (every facing country's best film comes before any country's second);
 * and a poster too close to a better-ranked one is skipped.
 */
export const selectPosters = (
  movies: Movie[],
  { limit, center, altitude, always, spacing = 4.5 }: PosterSelection,
) => {
  const horizon = horizonDegrees(altitude) - 4; // keep posters off the very edge
  const facing = center
    ? movies.filter((m) => angularDistance(center.lat, center.lng, m.lat, m.lng) <= horizon)
    : movies;

  const byCountry = new Map<string, Movie[]>();
  for (const movie of [...facing].sort(byRank)) {
    const key = movie.home;
    const list = byCountry.get(key) ?? [];
    list.push(movie);
    byCountry.set(key, list);
  }
  const separation = posterSeparation(altitude, spacing);
  // Always-rendered films (the selected one) come last but hold their place: others keep clear.
  const kept = always?.size ? movies.filter((m) => always.has(m.id)) : [];
  const shown: Movie[] = [];
  const tooClose = (m: Movie) =>
    [...shown, ...kept].some((s) => angularDistance(s.lat, s.lng, m.lat, m.lng) < separation);
  for (let round = 0; shown.length < limit; round++) {
    const tier = [...byCountry.values()].flatMap((list) => list[round] ?? []).sort(byRank);
    if (tier.length === 0) break;
    for (const movie of tier) {
      if (shown.length >= limit) break;
      if (!always?.has(movie.id) && !tooClose(movie)) shown.push(movie);
    }
  }
  return [...shown, ...kept];
};

/** Deterministic pseudo-random numbers (mulberry32), so stress layouts are reproducible. */
const seededRandom = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * Stress-test set for the rendering spike: `count` posters reusing the mock films, spread
 * uniformly over the sphere. The first copies are the real films in their real places.
 */
export const stressPosters = (movies: Movie[], count: number): Movie[] => {
  if (count <= movies.length) return movies.slice(0, count);
  const random = seededRandom(count);
  const extra = Array.from({ length: count - movies.length }, (_, i) => {
    const base = movies[i % movies.length];
    return {
      ...base,
      id: `${base.id}~${i}`,
      lat: (Math.asin(random() * 2 - 1) * 180) / Math.PI,
      lng: random() * 360 - 180,
      rank: 0,
    };
  });
  return [...movies, ...extra];
};

/** Stress copies share the base film's id before "~", e.g. for texture caching. */
export const baseMovieId = (id: string) => id.split("~")[0];
