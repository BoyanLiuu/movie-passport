import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { countryAt, parseCountries, type Country } from "@/lib/geo/countries";
import { parseCatalogue, pinPosition } from "./tmdbCatalogue";

const countries = parseCountries(
  JSON.parse(
    readFileSync(new URL("../../../public/data/countries-110m.geojson", import.meta.url), "utf8"),
  ),
);
const byId = (id: string): Country => countries.find((c) => c.id === id)!;

const film = (over: Record<string, unknown>) => ({
  id: "1",
  title: "A film",
  year: 2001,
  directors: ["A. Director"],
  origin: ["FR"],
  countries: ["FR"],
  genres: ["Drama"],
  runtime: 100,
  rating: 7.5,
  votes: 100,
  poster: "/p.jpg",
  ...over,
});

describe("pinPosition", () => {
  it("puts the first poster on the label point", () => {
    const fra = byId("FRA");
    expect(pinPosition(fra, 0)).toEqual({ lat: fra.labelLat, lng: fra.labelLng });
  });

  it("spreads the rest on land, without repeats", () => {
    for (const id of ["FRA", "JPN", "CHL", "NOR", "IDN", "USA"]) {
      const country = byId(id);
      const pins = Array.from({ length: 10 }, (_, i) => pinPosition(country, i));
      for (const pin of pins) expect(countryAt(countries, pin.lat, pin.lng)?.id, id).toBe(id);
      expect(new Set(pins.map((p) => `${p.lat},${p.lng}`)).size, id).toBeGreaterThan(5);
    }
  });
});

describe("parseCatalogue", () => {
  it("maps films and pins them in their first origin country on the map", () => {
    const { movies, generatedAt } = parseCatalogue(
      {
        generatedAt: "2026-11-11T00:00:00Z",
        films: [
          film({
            id: "146",
            title: "Crouching Tiger",
            origin: ["HK", "TW"],
            countries: ["HK", "TW", "US", "CN"],
            votes: 900,
          }),
          film({
            id: "194",
            title: "Amélie",
            originalTitle: "Le Fabuleux Destin",
            countries: ["FR", "DE"],
            votes: 12000,
            directors: ["Jean-Pierre Jeunet"],
          }),
        ],
      },
      countries,
    );
    expect(generatedAt).toBe("2026-11-11T00:00:00Z");
    expect(movies.map((m) => m.id)).toEqual(["194", "146"]); // most-voted first
    const [amelie, tiger] = movies;
    expect(amelie).toMatchObject({
      title: "Amélie",
      originalTitle: "Le Fabuleux Destin",
      director: "Jean-Pierre Jeunet",
      origin: ["FR"],
      home: "FR",
      countries: ["FR", "DE"],
      place: "France",
      rank: 12000,
      poster: "/p.jpg",
      tmdbId: 194,
    });
    // Hong Kong has no shape on the 1:110m map, so the poster goes to Taiwan.
    expect(tiger.place).toBe("Taiwan");
    expect(tiger.home).toBe("TW");
    expect(countryAt(countries, tiger.lat, tiger.lng)?.id).toBe("TWN");
  });

  it("skips malformed entries and films with no country on the map", () => {
    const { movies } = parseCatalogue(
      {
        films: [
          film({ id: "1" }),
          { id: 2, title: "Bad id" },
          film({ id: "3", origin: ["HK"], countries: ["HK"] }),
          null,
        ],
      },
      countries,
    );
    expect(movies.map((m) => m.id)).toEqual(["1"]);
  });

  it("rejects a file without a films array", () => {
    expect(() => parseCatalogue({}, countries)).toThrow();
    expect(() => parseCatalogue(null, countries)).toThrow();
  });
});
