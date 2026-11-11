import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MOCK_MOVIES } from "@/data/movies";
import {
  countryStats,
  decadeRangeLabel,
  filmCountLabel,
  filmsByCountry,
  nearestCountriesWithFilms,
} from "./catalogue";
import { parseCountries, type Country } from "./geo/countries";
import {
  countryParam,
  GLOBAL_MODE,
  modeFromSearch,
  searchForMode,
  searchWithoutSelection,
} from "./navigation";
import { normalizeText, searchCatalogue } from "./search";

const countries = parseCountries(
  JSON.parse(
    readFileSync(new URL("../../public/data/countries-110m.geojson", import.meta.url), "utf8"),
  ),
);
const byId = (id: string): Country => countries.find((c) => c.id === id)!;
const movieIds = new Set(MOCK_MOVIES.map((m) => m.id));
const films = filmsByCountry(MOCK_MOVIES, countries);

describe("navigation", () => {
  it("reads a country by ISO code, any case, or by Natural Earth id", () => {
    expect(modeFromSearch("?country=FR", countries, movieIds).mode).toEqual({
      kind: "country",
      countryId: "FRA",
    });
    expect(modeFromSearch("?country=jp", countries, movieIds).mode).toEqual({
      kind: "country",
      countryId: "JPN",
    });
    expect(modeFromSearch("?country=CYN", countries, movieIds).mode).toEqual({
      kind: "country",
      countryId: "CYN",
    });
  });

  it("reads a film, which wins over a country", () => {
    expect(modeFromSearch("?film=amelie&country=FR", countries, movieIds).mode).toEqual({
      kind: "movie",
      movieId: "amelie",
    });
  });

  it("falls back to the globe, and reports what wasn't found", () => {
    expect(modeFromSearch("", countries, movieIds)).toEqual({ mode: GLOBAL_MODE, notFound: null });
    expect(modeFromSearch("?country=Atlantis", countries, movieIds)).toEqual({
      mode: GLOBAL_MODE,
      notFound: { param: "country", value: "Atlantis" },
    });
    expect(modeFromSearch("?film=nope", countries, movieIds).notFound).toEqual({
      param: "film",
      value: "nope",
    });
  });

  it("writes modes back to the URL, keeping unrelated parameters", () => {
    expect(searchForMode({ kind: "country", countryId: "FRA" }, "", countries)).toBe("?country=FR");
    expect(searchForMode({ kind: "country", countryId: "CYN" }, "", countries)).toBe(
      "?country=CYN",
    );
    expect(searchForMode({ kind: "movie", movieId: "roma" }, "?debug=&country=MX", countries)).toBe(
      "?debug=&film=roma",
    );
    expect(searchForMode(GLOBAL_MODE, "?country=FR", countries)).toBe("");
    expect(searchWithoutSelection("?debug=&film=nope")).toBe("?debug=");
  });

  it("round-trips every country", () => {
    for (const c of countries) {
      const search = searchForMode({ kind: "country", countryId: c.id }, "", countries);
      expect(modeFromSearch(search, countries, movieIds).mode, c.name).toEqual({
        kind: "country",
        countryId: c.id,
      });
    }
    expect(countryParam(byId("FRA"))).toBe("FR");
  });
});

describe("catalogue", () => {
  it("lists a co-production under every producing country, oldest first", () => {
    expect(films.get("FRA")?.map((f) => f.id)).toEqual(["amelie", "timbuktu"]);
    expect(films.get("DEU")?.map((f) => f.id)).toEqual(["run-lola-run", "amelie"]);
    expect(films.get("USA")?.map((f) => f.id)).toEqual([
      "the-godfather",
      "crouching-tiger",
      "fellowship-of-the-ring",
    ]);
    expect(films.has("MLI")).toBe(false); // Timbuktu is set in Mali but not produced there
  });

  it("summarises a country's films", () => {
    const stats = countryStats(films.get("USA")!);
    expect(stats).toEqual({ films: 3, firstDecade: 1970, lastDecade: 2000, coProductions: 2 });
    expect(decadeRangeLabel(stats)).toBe("1970s–2000s");
    expect(decadeRangeLabel(countryStats(films.get("KOR")!))).toBe("2010s");
    expect(countryStats([])).toEqual({
      films: 0,
      firstDecade: null,
      lastDecade: null,
      coProductions: 0,
    });
  });

  it("suggests the nearest countries that have films", () => {
    const nearby = nearestCountriesWithFilms(byId("MLI"), countries, films);
    expect(nearby).toHaveLength(3);
    expect(nearby[0].id).toBe("MRT"); // Mauritania, next door
    expect(nearby.every((c) => (films.get(c.id)?.length ?? 0) > 0)).toBe(true);
  });

  it("labels counts", () => {
    expect(filmCountLabel(0)).toBe("No films yet");
    expect(filmCountLabel(1)).toBe("1 film");
    expect(filmCountLabel(3)).toBe("3 films");
  });
});

describe("search", () => {
  const ids = (q: string) => {
    const r = searchCatalogue(q, countries, MOCK_MOVIES);
    return { countries: r.countries.map((c) => c.id), movies: r.movies.map((m) => m.id) };
  };

  it("ignores case and accents", () => {
    expect(normalizeText("  Côte d'Ivoire ")).toBe("cote d'ivoire");
    expect(ids("amelie").movies).toEqual(["amelie"]);
    expect(ids("cote").countries).toContain("CIV");
  });

  it("ranks prefix matches first", () => {
    expect(ids("fra").countries[0]).toBe("FRA");
    expect(ids("ind").countries.slice(0, 2)).toEqual(["IND", "IDN"]);
  });

  it("finds countries by ISO code and films by original title or director", () => {
    expect(ids("jp").countries[0]).toBe("JPN");
    expect(ids("deu").countries[0]).toBe("DEU");
    expect(ids("lola rennt").movies).toEqual(["run-lola-run"]);
    expect(ids("miyazaki").movies).toEqual(["spirited-away"]);
  });

  it("returns nothing for an empty query and caps each group", () => {
    expect(searchCatalogue("  ", countries, MOCK_MOVIES)).toEqual({ countries: [], movies: [] });
    expect(searchCatalogue("a", countries, MOCK_MOVIES).countries).toHaveLength(5);
  });
});
