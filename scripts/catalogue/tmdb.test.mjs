import { describe, expect, it } from "vitest";
import { discoverIds, discoverPath, toCatalogue, toDetails, toFilm } from "./tmdb.mjs";

const amelie = {
  id: 194,
  title: "Amélie",
  original_title: "Le Fabuleux Destin d'Amélie Poulain",
  release_date: "2001-04-25",
  origin_country: ["FR"],
  production_countries: [
    { iso_3166_1: "FR", name: "France" },
    { iso_3166_1: "DE", name: "Germany" },
  ],
  genres: [
    { id: 35, name: "Comedy" },
    { id: 10749, name: "Romance" },
  ],
  runtime: 122,
  vote_average: 7.9,
  vote_count: 11000,
  poster_path: "/nSxDa3M9aMvGVLoItzWTepQ5h5d.jpg",
  overview: "At a tiny Parisian café…",
  credits: {
    crew: [
      { job: "Director", name: "Jean-Pierre Jeunet" },
      { job: "Writer", name: "Guillaume Laurant" },
    ],
  },
};

describe("discover", () => {
  it("asks for the most-voted films from one origin country", () => {
    expect(discoverPath("FR", 10)).toBe(
      "/discover/movie?with_origin_country=FR&sort_by=vote_count.desc&include_adult=false&vote_count.gte=10&page=1",
    );
  });

  it("keeps valid ids in order, up to the limit", () => {
    const response = { results: [{ id: 3 }, { id: "x" }, { id: 1 }, {}, { id: 2 }] };
    expect(discoverIds(response, 2)).toEqual([3, 1]);
    expect(discoverIds(null, 10)).toEqual([]);
  });
});

describe("toFilm", () => {
  it("maps the fields the app uses", () => {
    expect(toFilm(amelie)).toEqual({
      id: "194",
      title: "Amélie",
      originalTitle: "Le Fabuleux Destin d'Amélie Poulain",
      year: 2001,
      directors: ["Jean-Pierre Jeunet"],
      origin: ["FR"],
      countries: ["FR", "DE"],
      genres: ["Comedy", "Romance"],
      runtime: 122,
      rating: 7.9,
      votes: 11000,
      poster: "/nSxDa3M9aMvGVLoItzWTepQ5h5d.jpg",
      overview: "At a tiny Parisian café…",
    });
  });

  it("adds origin countries missing from the production list", () => {
    const film = toFilm({ ...amelie, origin_country: ["FR", "BE"], production_countries: [] });
    expect(film.countries).toEqual(["FR", "BE"]);
  });

  it("falls back to the first production country when there is no origin", () => {
    expect(toFilm({ ...amelie, origin_country: [] }).origin).toEqual(["FR"]);
  });

  it("drops entries the app can't place or date", () => {
    expect(toFilm({ ...amelie, release_date: "" })).toBeNull();
    expect(toFilm({ ...amelie, origin_country: [], production_countries: [] })).toBeNull();
    expect(toFilm({ ...amelie, title: "  " })).toBeNull();
    expect(toFilm(null)).toBeNull();
  });

  it("rejects malformed values instead of passing them through", () => {
    const film = toFilm({
      ...amelie,
      origin_country: ["fr", "<script>", "FR"],
      poster_path: "javascript:alert(1)",
      runtime: "122",
    });
    expect(film.origin).toEqual(["FR"]);
    expect(film.poster).toBeNull();
    expect(film.runtime).toBeNull();
  });

  it("omits the original title when it matches", () => {
    expect(toFilm({ ...amelie, original_title: "Amélie" })).not.toHaveProperty("originalTitle");
  });
});

describe("toCatalogue", () => {
  const a = toFilm(amelie);
  const b = { ...a, id: "2", title: "B", votes: 50, overview: null };
  const { catalogue, overviews } = toCatalogue([b, a], {
    perCountry: 10,
    minVotes: 10,
    generatedAt: "2026-11-11",
  });

  it("sorts by votes and records provenance", () => {
    expect(catalogue.films.map((f) => f.id)).toEqual(["194", "2"]);
    expect(catalogue).toMatchObject({ source: "TMDB", perCountry: 10, generatedAt: "2026-11-11" });
    expect(catalogue.notice).toContain("not endorsed or certified by TMDB");
  });

  it("moves plot summaries into their own file", () => {
    expect(catalogue.films[0]).not.toHaveProperty("overview");
    expect(overviews).toEqual({ 194: "At a tiny Parisian café…" });
  });
});

describe("toDetails", () => {
  // Synthetic response in TMDB's shape (no real TMDB data is committed).
  const response = {
    id: 42,
    tagline: "A tagline.",
    overview: "A plot.",
    backdrop_path: "/back.jpg",
    release_date: "2001-04-25",
    status: "Released",
    original_language: "fr",
    budget: 10000000,
    revenue: 0,
    homepage: "javascript:alert(1)",
    credits: {
      cast: [
        { name: "Second", character: "B", profile_path: "/b.jpg", order: 1 },
        { name: "First", character: "A", profile_path: null, order: 0 },
      ],
      crew: [
        { job: "Director", name: "Dee Rector" },
        { job: "Novel", name: "Nova List" },
        { job: "Screenplay", name: "Nova List" },
        { job: "Editor", name: "Ed Itor" },
      ],
    },
    videos: {
      results: [
        { site: "YouTube", type: "Teaser", key: "teaser12345", official: true, size: 1080 },
        { site: "YouTube", type: "Trailer", key: "fanmade1234", official: false, size: 2160 },
        {
          site: "YouTube",
          type: "Trailer",
          key: "official123",
          official: true,
          size: 1080,
          name: "Official Trailer",
        },
        { site: "Vimeo", type: "Trailer", key: "vimeo123456", official: true, size: 2160 },
      ],
    },
    release_dates: {
      results: [
        { iso_3166_1: "US", release_dates: [{ certification: "R", type: 3 }] },
        {
          iso_3166_1: "FR",
          release_dates: [
            { certification: "", type: 3 },
            { certification: "TP", type: 4 },
          ],
        },
        { iso_3166_1: "AR", release_dates: [{ certification: "", type: 3 }] },
      ],
    },
    keywords: { keywords: [{ name: "paris" }, { name: "love" }] },
    recommendations: {
      results: [{ id: 7, title: "Another", release_date: "1999-01-01", poster_path: "/p.jpg" }],
    },
    external_ids: {
      imdb_id: "tt0211915",
      wikidata_id: "Q484048",
      facebook_id: null,
      instagram_id: "a.handle",
      twitter_id: "bad handle!",
    },
    "watch/providers": {
      results: {
        US: {
          link: "https://www.themoviedb.org/movie/42/watch?locale=US",
          rent: [
            { provider_id: 2, provider_name: "Second", logo_path: "/2.png", display_priority: 12 },
            { provider_id: 10, provider_name: "First", logo_path: "/10.png", display_priority: 11 },
          ],
          flatrate: [
            { provider_id: 8, provider_name: "Streamer", logo_path: "/8.png", display_priority: 1 },
          ],
        },
        GB: { link: "https://example.org", buy: [] },
      },
    },
  };
  const details = toDetails(response);

  it("keeps the header facts and drops unsafe links", () => {
    expect(details).toMatchObject({
      id: "42",
      tagline: "A tagline.",
      backdrop: "/back.jpg",
      releaseDate: "2001-04-25",
      originalLanguage: "fr",
      budget: 10000000,
      revenue: null,
      homepage: null,
    });
  });

  it("orders the cast and groups writers' jobs", () => {
    expect(details.cast.map((c) => c.name)).toEqual(["First", "Second"]);
    expect(details.directors).toEqual(["Dee Rector"]);
    expect(details.writers).toEqual([{ name: "Nova List", jobs: ["Novel", "Screenplay"] }]);
  });

  it("picks the official YouTube trailer", () => {
    expect(details.trailer).toEqual({ key: "official123", name: "Official Trailer" });
  });

  it("takes each region's age rating, preferring the theatrical one", () => {
    expect(details.certifications).toEqual({ US: "R", FR: "TP" });
  });

  it("trims where-to-watch to non-empty groups in TMDB's display order", () => {
    expect(details.watch).toEqual({
      US: {
        link: "https://www.themoviedb.org/movie/42/watch?locale=US",
        stream: [{ id: 8, name: "Streamer", logo: "/8.png" }],
        rent: [
          { id: 10, name: "First", logo: "/10.png" },
          { id: 2, name: "Second", logo: "/2.png" },
        ],
      },
    });
  });

  it("keeps keywords, recommendations and valid external ids", () => {
    expect(details.keywords).toEqual(["paris", "love"]);
    expect(details.recommendations).toEqual([
      { id: "7", title: "Another", year: 1999, poster: "/p.jpg" },
    ]);
    expect(details.links).toEqual({
      imdb: "tt0211915",
      wikidata: "Q484048",
      facebook: null,
      instagram: "a.handle",
      twitter: null,
    });
  });

  it("returns null without an id", () => {
    expect(toDetails({})).toBeNull();
  });
});
