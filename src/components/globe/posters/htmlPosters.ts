// HTML poster markers for react-globe.gl's HTML elements layer (the default renderer).
//
// Each marker is a zero-size anchor at the pin (the layer centres it on the lat/lng) holding a
// poster button that sits just above the pin. The button ignores the pointer, and GlobeScene
// hit-tests posters itself with `posterAt`: if the posters caught the pointer, dragging or
// wheel-zooming over one would stop moving the globe. Buttons stay focusable, so keyboard users can
// still reach and open them.

import type { Movie } from "@/data/movies";
import { posterDataUrl } from "@/lib/movies/poster";
import { baseMovieId } from "@/lib/movies/posters";

const urlCache = new Map<string, string>();

/** Generated placeholder art, built once per film (stress-test copies share their base's art). */
export const generatedPosterUrl = (movie: Movie) => {
  const id = baseMovieId(movie.id);
  let url = urlCache.get(id);
  if (!url) {
    url = posterDataUrl({ ...movie, id });
    urlCache.set(id, url);
  }
  return url;
};

/** TMDB image CDN. Sizes: w92 (list thumbnails), w185 (globe markers), w342 (film card). */
const TMDB_IMAGES = "https://image.tmdb.org/t/p";
export type PosterSize = "w92" | "w185" | "w342";

/** The film's TMDB poster when it has one, otherwise generated art. */
export const posterUrl = (movie: Movie, size: PosterSize = "w185") =>
  movie.poster ? `${TMDB_IMAGES}/${size}${movie.poster}` : generatedPosterUrl(movie);

/** For <img onError>: swap a failed TMDB poster for generated art, once. */
export const fallBackToGeneratedArt = (image: HTMLImageElement, movie: Movie) => {
  const fallback = generatedPosterUrl(movie);
  if (image.src !== fallback) image.src = fallback;
};

export const createPosterElement = (movie: Movie, onActivate: (movieId: string) => void) => {
  const anchor = document.createElement("div");
  anchor.className = "poster-anchor";
  anchor.dataset.posterId = movie.id;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "poster";
  button.setAttribute("aria-label", `${movie.title} (${movie.year})`);
  // Mouse and touch never reach the button (pointer-events: none); this is Enter / Space.
  button.addEventListener("click", () => onActivate(movie.id));

  const image = document.createElement("img");
  image.src = posterUrl(movie);
  image.addEventListener("error", () => fallBackToGeneratedArt(image, movie), { once: true });
  image.alt = "";
  image.draggable = false;
  image.decoding = "async";

  const label = document.createElement("span");
  label.className = "poster-label";
  label.textContent = movie.title;

  button.append(image, label);
  anchor.append(button);
  return anchor;
};

/** Hide markers on the far side of the globe: invisible, unclickable and out of the tab order. */
export const setPosterVisibility = (anchor: HTMLElement, isVisible: boolean) =>
  anchor.toggleAttribute("data-hidden", !isVisible);

/** On screen and clickable: attached, facing the camera, not faded out by a country filter. */
const isShown = (anchor: HTMLElement) =>
  anchor.isConnected &&
  !anchor.hasAttribute("data-hidden") &&
  !anchor.hasAttribute("data-out") &&
  anchor.style.display !== "none";

/** The topmost visible poster under a viewport point (the layer z-orders nearer markers higher). */
export const posterAt = (anchors: Iterable<HTMLElement>, x: number, y: number) => {
  let best: { id: string; z: number } | null = null;
  for (const anchor of anchors) {
    const poster = anchor.firstElementChild;
    if (!poster || !isShown(anchor)) continue;
    const r = poster.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
    const z = Number(anchor.style.zIndex) || 0;
    if (!best || z > best.z) best = { id: anchor.dataset.posterId ?? "", z };
  }
  return best?.id || null;
};
