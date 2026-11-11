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

/** Poster image URL, generated once per film (stress-test copies share their base film's art). */
export const posterUrl = (movie: Movie) => {
  const id = baseMovieId(movie.id);
  let url = urlCache.get(id);
  if (!url) {
    url = posterDataUrl({ ...movie, id });
    urlCache.set(id, url);
  }
  return url;
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
