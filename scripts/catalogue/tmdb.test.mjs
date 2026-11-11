import { describe, expect, it } from "vitest";
import { discoverIds, discoverPath, toCatalogue, toFilm } from "./tmdb.mjs";

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
