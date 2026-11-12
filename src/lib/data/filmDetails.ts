// The film details sheet's data: public/data/films/<id>.json, written by scripts/fetch-catalogue.mjs
// (toDetails) from TMDB, loaded when the sheet opens. Plus the small formatting helpers it uses.

export type Provider = { id: number; name: string; logo: string | null };
export type ProviderGroup = "stream" | "free" | "ads" | "rent" | "buy";
export type RegionProviders = { link: string | null } & Partial<Record<ProviderGroup, Provider[]>>;

export type FilmDetails = {
  id: string;
  tagline: string | null;
  overview: string | null;
  backdrop: string | null;
  releaseDate: string | null;
  status: string | null;
  originalLanguage: string | null;
  budget: number | null;
  revenue: number | null;
  homepage: string | null;
  certifications: Record<string, string>;
  directors: string[];
  writers: { name: string; jobs: string[] }[];
  cast: { name: string; character: string | null; photo: string | null }[];
  trailer: { key: string; name: string } | null;
  keywords: string[];
  recommendations: { id: string; title: string; year: number | null; poster: string | null }[];
  links: {
    imdb: string | null;
    wikidata: string | null;
    facebook: string | null;
    instagram: string | null;
    twitter: string | null;
  };
  /** Where to watch per region: JustWatch's data, via TMDB. */
  watch: Record<string, RegionProviders>;
};

export const PROVIDER_GROUPS: { key: ProviderGroup; label: string }[] = [
  { key: "stream", label: "Stream" },
  { key: "free", label: "Free" },
  { key: "ads", label: "With ads" },
  { key: "rent", label: "Rent" },
  { key: "buy", label: "Buy" },
];

/** Only numeric TMDB ids map to a file, so an id can never point elsewhere. */
export const detailsUrl = (id: string) => (/^\d+$/.test(id) ? `/data/films/${id}.json` : null);

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const strOrNull = (v: unknown) => (typeof v === "string" && v ? v : null);
const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
/** Links are rendered as hrefs: only http(s), re-checked here although the build checks too. */
const safeUrl = (v: unknown) => (typeof v === "string" && /^https?:\/\//i.test(v) ? v : null);

export const parseFilmDetails = (data: unknown): FilmDetails => {
  const d = data as Partial<FilmDetails> | null;
  if (!d || typeof d.id !== "string") throw new Error("Film details have no id");
  const links = (d.links ?? {}) as Partial<FilmDetails["links"]>;
  const watch: FilmDetails["watch"] = {};
  for (const [region, entry] of Object.entries(d.watch ?? {})) {
    if (!/^[A-Z]{2}$/.test(region) || !entry) continue;
    watch[region] = { ...entry, link: safeUrl(entry.link) };
  }
  return {
    id: d.id,
    tagline: strOrNull(d.tagline),
    overview: strOrNull(d.overview),
    backdrop: strOrNull(d.backdrop),
    releaseDate: strOrNull(d.releaseDate),
    status: strOrNull(d.status),
    originalLanguage: strOrNull(d.originalLanguage),
    budget: numOrNull(d.budget),
    revenue: numOrNull(d.revenue),
    homepage: safeUrl(d.homepage),
    certifications:
      d.certifications && typeof d.certifications === "object" ? d.certifications : {},
    directors: arr<string>(d.directors),
    writers: arr<FilmDetails["writers"][number]>(d.writers),
    cast: arr<FilmDetails["cast"][number]>(d.cast),
    trailer:
      d.trailer && /^[\w-]{6,20}$/.test(d.trailer.key ?? "")
        ? { key: d.trailer.key, name: d.trailer.name ?? "Trailer" }
        : null,
    keywords: arr<string>(d.keywords),
    recommendations: arr<FilmDetails["recommendations"][number]>(d.recommendations),
    links: {
      imdb: strOrNull(links.imdb),
      wikidata: strOrNull(links.wikidata),
      facebook: strOrNull(links.facebook),
      instagram: strOrNull(links.instagram),
      twitter: strOrNull(links.twitter),
    },
    watch,
  };
};

export const tmdbImage = (path: string, size: "w92" | "w185" | "w342" | "w780" | "w1280") =>
  `https://image.tmdb.org/t/p/${size}${path}`;

/** Privacy-enhanced YouTube embed; only created once the viewer presses play. */
export const trailerEmbedUrl = (key: string) =>
  `https://www.youtube-nocookie.com/embed/${encodeURIComponent(key)}?autoplay=1&rel=0`;

/**
 * The region for "where to watch": the browser's own region when the film has providers there
 * (en-GB -> GB), else the US, else the first region listed.
 */
export const preferredRegion = (available: string[], languages: readonly string[]) => {
  const fromBrowser = languages
    .map((tag) => tag.split("-")[1]?.toUpperCase())
    .find((region) => region && available.includes(region));
  return fromBrowser ?? (available.includes("US") ? "US" : (available[0] ?? null));
};

/** JustWatch's site uses "uk" for the United Kingdom; other regions are lower-case ISO codes. */
export const justWatchUrl = (region: string, title: string) =>
  `https://www.justwatch.com/${region === "GB" ? "uk" : region.toLowerCase()}/search?q=${encodeURIComponent(title)}`;

export const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);

const displayName = (type: "language" | "region", code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type }).of(code) ?? code;
  } catch {
    return code;
  }
};
export const languageName = (code: string) => displayName("language", code);
export const regionName = (code: string) => displayName("region", code);

/** "2 h 2 min", or "48 min" under an hour. */
export const formatRuntime = (minutes: number) =>
  minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;

export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
