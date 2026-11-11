// Pure helpers for turning TMDB API responses into catalogue entries. No network, no secrets:
// unit-tested in tmdb.test.mjs. Responses are treated as untrusted input and validated field by field.

export const TMDB_API = "https://api.themoviedb.org/3";

const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const isoCode = (v) => (typeof v === "string" && /^[A-Z]{2}$/.test(v) ? v : null);
const unique = (list) => [...new Set(list)];

/** Discover URL for the most-voted films from one origin country. */
export const discoverPath = (iso2, minVotes) =>
  `/discover/movie?with_origin_country=${encodeURIComponent(iso2)}` +
  `&sort_by=vote_count.desc&include_adult=false&vote_count.gte=${minVotes}&page=1`;

/** Film ids from a discover response, most-voted first, at most `limit`. */
export const discoverIds = (response, limit) =>
  (Array.isArray(response?.results) ? response.results : [])
    .map((r) => num(r?.id))
    .filter((id) => id !== null && id > 0)
    .slice(0, limit);

/**
 * One catalogue entry from a `/movie/{id}?append_to_response=credits` response, or null when the
 * response lacks what the app needs (id, title, a year, at least one country).
 */
export const toFilm = (details) => {
  const id = num(details?.id);
  const title = str(details?.title);
  const year = Number.parseInt(String(details?.release_date ?? "").slice(0, 4), 10);
  if (!id || !title || !Number.isFinite(year)) return null;

  const origin = unique(
    (Array.isArray(details.origin_country) ? details.origin_country : [])
      .map(isoCode)
      .filter(Boolean),
  );
  const production = unique(
    (Array.isArray(details.production_countries) ? details.production_countries : [])
      .map((c) => isoCode(c?.iso_3166_1))
      .filter(Boolean),
  );
  // Every origin country also produced the film, even when TMDB's list omits it.
  const countries = unique([...origin, ...production]);
  if (countries.length === 0) return null;

  const crew = Array.isArray(details.credits?.crew) ? details.credits.crew : [];
  const directors = unique(
    crew
      .filter((c) => c?.job === "Director")
      .map((c) => str(c?.name))
      .filter(Boolean),
  );
  const originalTitle = str(details.original_title);
  const poster = str(details.poster_path);

  return {
    id: String(id),
    title,
    ...(originalTitle && originalTitle !== title ? { originalTitle } : {}),
    year,
    directors: directors.slice(0, 3),
    origin: origin.length ? origin : [countries[0]],
    countries,
    genres: (Array.isArray(details.genres) ? details.genres : [])
      .map((g) => str(g?.name))
      .filter(Boolean),
    runtime: num(details.runtime) || null,
    rating: num(details.vote_average),
    votes: num(details.vote_count) ?? 0,
    poster: poster && /^\/[\w.-]+\.(jpg|jpeg|png|webp)$/i.test(poster) ? poster : null,
    overview: str(details.overview),
  };
};

/**
 * The two files the app loads: the catalogue (loaded at start) and the plot summaries (about half
 * the bytes, loaded the first time a film is opened). `generatedAt` lets us honour TMDB's
 * 6-month cache limit.
 */
export const toCatalogue = (films, { perCountry, minVotes, generatedAt }) => {
  const sorted = [...films].sort((a, b) => b.votes - a.votes || a.title.localeCompare(b.title));
  return {
    catalogue: {
      source: "TMDB",
      notice: "This product uses the TMDB API but is not endorsed or certified by TMDB.",
      generatedAt,
      perCountry,
      minVotes,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- dropped on purpose
      films: sorted.map(({ overview, ...film }) => film),
    },
    overviews: Object.fromEntries(sorted.filter((f) => f.overview).map((f) => [f.id, f.overview])),
  };
};

/** The extra data the film details sheet needs, appended to the same /movie/{id} request. */
export const DETAILS_APPEND =
  "credits,videos,release_dates,keywords,recommendations,external_ids,watch/providers";

const WRITER_JOBS = new Set(["Screenplay", "Writer", "Novel", "Story", "Author", "Characters"]);
const httpsUrl = (v) => (typeof v === "string" && /^https?:\/\/[^\s"'<>]+$/i.test(v) ? v : null);
const imagePath = (v) =>
  typeof v === "string" && /^\/[\w.-]+\.(jpg|jpeg|png|webp|svg)$/i.test(v) ? v : null;
const handle = (v) => (typeof v === "string" && /^[\w.-]{1,64}$/.test(v) ? v : null);
const list = (v) => (Array.isArray(v) ? v : []);

/** Directors, then writers with their jobs ("Novel, Screenplay"), each person once. */
const keyCrew = (crew) => {
  const writers = new Map();
  for (const c of crew) {
    const name = str(c?.name);
    if (!name || !WRITER_JOBS.has(c?.job)) continue;
    writers.set(name, [...(writers.get(name) ?? []), c.job]);
  }
  return {
    directors: unique(
      crew
        .filter((c) => c?.job === "Director")
        .map((c) => str(c?.name))
        .filter(Boolean),
    ),
    writers: [...writers].slice(0, 6).map(([name, jobs]) => ({ name, jobs: unique(jobs) })),
  };
};

/** The YouTube trailer to show: official first, then the highest resolution. */
const pickTrailer = (videos) => {
  const trailers = list(videos?.results).filter(
    (v) => v?.site === "YouTube" && v?.type === "Trailer" && /^[\w-]{6,20}$/.test(v?.key ?? ""),
  );
  trailers.sort((a, b) => Number(b.official) - Number(a.official) || (b.size ?? 0) - (a.size ?? 0));
  return trailers[0] ? { key: trailers[0].key, name: str(trailers[0].name) ?? "Trailer" } : null;
};

/** Age rating per region: the theatrical release's certification when there is one. */
const certifications = (releaseDates) => {
  const out = {};
  for (const region of list(releaseDates?.results)) {
    const code = isoCode(region?.iso_3166_1);
    if (!code) continue;
    const releases = list(region.release_dates).filter((r) => str(r?.certification));
    const theatrical = releases.find((r) => r.type === 3) ?? releases[0];
    if (theatrical) out[code] = str(theatrical.certification).slice(0, 12);
  }
  return out;
};

const providerList = (entries) =>
  list(entries)
    .filter((p) => num(p?.provider_id) && str(p?.provider_name))
    .sort((a, b) => (a.display_priority ?? 99) - (b.display_priority ?? 99))
    .slice(0, 12)
    .map((p) => ({ id: p.provider_id, name: str(p.provider_name), logo: imagePath(p.logo_path) }));

/** Where to watch, per region (JustWatch data via TMDB): stream / free / with ads / rent / buy. */
const watchProviders = (providers) => {
  const out = {};
  for (const [region, entry] of Object.entries(providers?.results ?? {})) {
    if (!isoCode(region)) continue;
    const groups = {
      stream: providerList(entry?.flatrate),
      free: providerList(entry?.free),
      ads: providerList(entry?.ads),
      rent: providerList(entry?.rent),
      buy: providerList(entry?.buy),
    };
    const kept = Object.fromEntries(Object.entries(groups).filter(([, v]) => v.length));
    if (Object.keys(kept).length) out[region] = { link: httpsUrl(entry?.link), ...kept };
  }
  return out;
};

/**
 * Everything the details sheet shows for one film, trimmed from the full TMDB response (about
 * 120 KB) to roughly a tenth. Returns null when the response has no usable id.
 */
export const toDetails = (details) => {
  const id = num(details?.id);
  if (!id) return null;
  const crew = list(details.credits?.crew);
  const external = details.external_ids ?? {};
  return {
    id: String(id),
    tagline: str(details.tagline),
    overview: str(details.overview),
    backdrop: imagePath(details.backdrop_path),
    releaseDate: /^\d{4}-\d{2}-\d{2}$/.test(details.release_date ?? "")
      ? details.release_date
      : null,
    status: str(details.status),
    originalLanguage:
      typeof details.original_language === "string" ? details.original_language.slice(0, 3) : null,
    budget: num(details.budget) || null,
    revenue: num(details.revenue) || null,
    homepage: httpsUrl(details.homepage),
    certifications: certifications(details.release_dates),
    ...keyCrew(crew),
    cast: list(details.credits?.cast)
      .filter((c) => str(c?.name))
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
      .slice(0, 10)
      .map((c) => ({
        name: str(c.name),
        character: str(c.character),
        photo: imagePath(c.profile_path),
      })),
    trailer: pickTrailer(details.videos),
    keywords: list(details.keywords?.keywords)
      .map((k) => str(k?.name))
      .filter(Boolean)
      .slice(0, 20),
    recommendations: list(details.recommendations?.results)
      .filter((r) => num(r?.id) && str(r?.title))
      .slice(0, 12)
      .map((r) => ({
        id: String(r.id),
        title: str(r.title),
        year: Number.parseInt(String(r.release_date ?? "").slice(0, 4), 10) || null,
        poster: imagePath(r.poster_path),
      })),
    links: {
      imdb:
        typeof external.imdb_id === "string" && /^tt\d+$/.test(external.imdb_id)
          ? external.imdb_id
          : null,
      wikidata:
        typeof external.wikidata_id === "string" && /^Q\d+$/.test(external.wikidata_id)
          ? external.wikidata_id
          : null,
      facebook: handle(external.facebook_id),
      instagram: handle(external.instagram_id),
      twitter: handle(external.twitter_id),
    },
    watch: watchProviders(details["watch/providers"]),
  };
};
