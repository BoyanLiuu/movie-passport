import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCatalogue } from "@/lib/data/tmdbCatalogue";
import { angularDistance, countryAt, geometryContains, parseCountries } from "./countries";
import {
  COUNTRY_ALIASES,
  normalizeCountryCodes,
  PLACE_COUNTRIES,
  placeRadius,
  PLACES,
} from "./places";

const mapCountries = parseCountries(
  JSON.parse(
    readFileSync(new URL("../../../public/data/countries-110m.geojson", import.meta.url), "utf8"),
  ),
);
const all = [...PLACE_COUNTRIES, ...mapCountries];

describe("places data", () => {
  it("only lists places the map has no shape for, with unique codes", () => {
    const mapCodes = new Set(mapCountries.map((c) => c.iso2));
    const mapIds = new Set(mapCountries.map((c) => c.id));
    expect(new Set(PLACES.map((p) => p.iso2)).size).toBe(PLACES.length);
    for (const p of PLACES) {
      expect(mapCodes.has(p.iso2), p.iso2).toBe(false);
      expect(mapIds.has(p.id), p.id).toBe(false);
      expect(Math.abs(p.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(p.lng)).toBeLessThanOrEqual(180);
    }
  });

  it("includes the film places that motivated it", () => {
    const codes = new Set(PLACES.map((p) => p.iso2));
    for (const code of ["HK", "SG", "MT", "MC", "MO", "SU", "YU", "XC", "XG"]) {
      expect(codes.has(code), code).toBe(true);
    }
  });

  it("aliases old codes to countries that are on the map", () => {
    const mapCodes = new Set(mapCountries.map((c) => c.iso2));
    for (const target of Object.values(COUNTRY_ALIASES)) expect(mapCodes.has(target)).toBe(true);
    expect(normalizeCountryCodes(["BU", "MM", "ZR"])).toEqual(["MM", "CD"]);
  });

  it("keeps every pair of discs apart", () => {
    for (let i = 0; i < PLACES.length; i++) {
      for (let j = i + 1; j < PLACES.length; j++) {
        const a = PLACES[i];
        const b = PLACES[j];
        const gap = angularDistance(a.lat, a.lng, b.lat, b.lng);
        expect(placeRadius(a) + placeRadius(b), `${a.iso2}–${b.iso2}`).toBeLessThan(gap);
      }
    }
  });
});

/** Shoelace area in lng/lat space: the sign tells the winding direction. */
const signedArea = (ring: [number, number][]) =>
  ring.reduce((sum, [x1, y1], i) => {
    const [x2, y2] = ring[(i + 1) % ring.length];
    return sum + (x1 * y2 - x2 * y1);
  }, 0) / 2;

describe("place discs", () => {
  it("wind the same way as the map's country shapes", () => {
    const france = mapCountries.find((c) => c.id === "FRA")!;
    const outer =
      france.geometry.type === "Polygon"
        ? france.geometry.coordinates[0]
        : france.geometry.coordinates[0][0];
    const mapSign = Math.sign(signedArea(outer));
    for (const c of PLACE_COUNTRIES) {
      const ring = c.geometry.type === "Polygon" ? c.geometry.coordinates[0] : [];
      expect(Math.sign(signedArea(ring)), c.name).toBe(mapSign);
    }
  });

  it("contain their own centre", () => {
    for (const c of PLACE_COUNTRIES) {
      expect(geometryContains(c.geometry, c.labelLat, c.labelLng), c.name).toBe(true);
    }
  });

  it("win clicks over the bigger shape underneath", () => {
    expect(countryAt(all, 22.437, 114.108)?.name).toBe("Hong Kong");
    expect(countryAt(all, 55.75, 37.62)?.name).toBe("Soviet Union");
    expect(countryAt(all, 59.0, 40.0)?.name).toBe("Russia"); // outside the disc
  });

  it("become films' home countries", () => {
    const { movies } = parseCatalogue(
      {
        films: [
          {
            id: "1",
            title: "In the Mood for Love",
            year: 2000,
            directors: [],
            origin: ["HK"],
            countries: ["HK", "FR"],
            votes: 10,
          },
          {
            id: "2",
            title: "Come and See",
            year: 1985,
            directors: [],
            origin: ["SU"],
            countries: ["SU"],
            votes: 10,
          },
          {
            id: "3",
            title: "An older film",
            year: 1980,
            directors: [],
            origin: ["ZR"],
            countries: ["ZR", "BE"],
            votes: 10,
          },
        ],
      },
      all,
    );
    expect(movies.map((m) => [m.home, m.place])).toEqual([
      ["HK", "Hong Kong"],
      ["SU", "Soviet Union"],
      ["CD", "Dem. Rep. Congo"],
    ]);
    expect(movies[2].countries).toEqual(["CD", "BE"]);
  });
});
