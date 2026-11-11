// Developer options read from the URL, e.g. `/?debug&renderer=sprites&posters=1000&cap=0`.
// Without `debug` every option keeps its default, so a stray parameter can't change the app.

export type PosterRendererOption = "html" | "sprites";

export type DebugOptions = {
  enabled: boolean;
  renderer: PosterRendererOption;
  /**
   * Poster count (0 = none); above the catalogue size, extra copies are scattered for stress
   * tests. null keeps the catalogue as is.
   */
  posters: number | null;
  /** Hide low-ranked posters when zoomed out. */
  cap: boolean;
};

export const POSTER_COUNT_CHOICES = [20, 100, 300, 1000] as const;
const MAX_POSTERS = 2000;

export const DEFAULT_DEBUG: DebugOptions = {
  enabled: false,
  renderer: "html",
  posters: null,
  cap: true,
};

export const parseDebugOptions = (search: string): DebugOptions => {
  const params = new URLSearchParams(search);
  if (!params.has("debug")) return DEFAULT_DEBUG;
  const count = Number.parseInt(params.get("posters") ?? "", 10);
  return {
    enabled: true,
    renderer: params.get("renderer") === "sprites" ? "sprites" : "html",
    posters: Number.isFinite(count) && count >= 0 ? Math.min(count, MAX_POSTERS) : null,
    cap: params.get("cap") !== "0",
  };
};
