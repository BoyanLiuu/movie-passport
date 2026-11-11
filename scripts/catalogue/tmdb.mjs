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
