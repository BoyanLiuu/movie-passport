// Look and feel of the globe layers. Kept free of three.js so it can be read anywhere.

export const globeTheme = {
  // Velvet Night: the plate is rocked to black; only what has films is burnished back to light.
  oceanEmissive: "#050505",
  oceanSpecular: "#121110",
  /** A faint warm rim so the sphere reads against the black, not a glow. */
  atmosphere: "#5a4a3a",
  atmosphereAltitude: 0.09,

  /** Land with no films: dark plate, barely separated from the ocean. */
  land: "rgba(42, 33, 25, 0.9)",
  /** Countries with films, burnished by count: 1, 2, 3+. */
  landWithFilms: [
    "rgba(167, 163, 154, 0.34)",
    "rgba(167, 163, 154, 0.5)",
    "rgba(190, 185, 177, 0.66)",
  ],
  landDimmed: "rgba(42, 33, 25, 0.55)",
  landHover: "rgba(219, 214, 209, 0.8)",
  landSelected: "rgba(226, 221, 215, 0.9)",
  /** A selected country with no films: half-scraped plate, never silver (silver means films). */
  landSelectedEmpty: "rgba(90, 74, 58, 0.92)",
  side: "rgba(11, 11, 11, 0.85)",
  sideSelected: "rgba(167, 163, 154, 0.9)",
  stroke: "rgba(167, 163, 154, 0.26)",
  strokeDimmed: "rgba(167, 163, 154, 0.1)",
  strokeSelected: "rgba(241, 237, 232, 1)",

  /** Polygon lift in globe radii: selected and hovered countries rise off the surface. */
  altitude: { base: 0.006, hover: 0.018, selected: 0.032, place: 0.016 },
  polygonTransitionMs: 260,

  autoRotateSpeed: 0.3,
  /** How long the globe waits after the user lets go before it starts turning again. */
  idleResumeMs: 4000,
} as const;

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);

export const landColorFor = (filmCount: number) =>
  filmCount <= 0
    ? globeTheme.land
    : globeTheme.landWithFilms[Math.min(filmCount, globeTheme.landWithFilms.length) - 1];

/** Hover tooltip. react-globe.gl takes an HTML string, so every value is escaped. */
export const countryTooltipHtml = (name: string, continent: string, films?: string) =>
  `<div class="globe-tooltip"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(continent)}</span>${
    films ? `<em>${escapeHtml(films)}</em>` : ""
  }</div>`;
