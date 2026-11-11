// How many posters to show, and how big, for a given camera altitude.

import type { Movie } from "@/data/movies";

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

/** The posters to render: top `limit` by rank, plus the selected film even if it ranks lower. */
export const visiblePosters = (
  movies: Movie[],
  limit: number,
  selectedId: string | null = null,
) => {
  const ranked = [...movies].sort(byRank);
  const shown = ranked.slice(0, limit);
  const selected = selectedId ? ranked.find((m) => m.id === selectedId) : undefined;
  return selected && !shown.includes(selected) ? [...shown, selected] : shown;
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
