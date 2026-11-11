// Look and feel of the globe layers. Kept free of three.js so it can be read anywhere.

export const globeTheme = {
  ocean: "#070d1c",
  oceanEmissive: "#02040a",
  oceanSpecular: "#1d2a44",
  atmosphere: "#4f7cff",
  atmosphereAltitude: 0.17,

  land: "rgba(148, 163, 184, 0.16)",
  landDimmed: "rgba(148, 163, 184, 0.07)",
  landHover: "rgba(251, 191, 36, 0.42)",
  landSelected: "rgba(251, 191, 36, 0.82)",
  side: "rgba(15, 23, 42, 0.55)",
  sideSelected: "rgba(217, 119, 6, 0.6)",
  stroke: "rgba(165, 180, 203, 0.42)",
  strokeDimmed: "rgba(165, 180, 203, 0.2)",
  strokeSelected: "rgba(254, 240, 138, 0.95)",

  /** Polygon lift in globe radii: selected and hovered countries rise off the surface. */
  altitude: { base: 0.006, hover: 0.018, selected: 0.032 },
  polygonTransitionMs: 260,

  autoRotateSpeed: 0.35,
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

/** Hover tooltip. react-globe.gl takes an HTML string, so every value is escaped. */
export const countryTooltipHtml = (name: string, continent: string) =>
  `<div class="globe-tooltip"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(continent)}</span></div>`;
