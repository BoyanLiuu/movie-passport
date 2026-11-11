import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  angularDistance,
  countryAt,
  longitudeExtent,
  normalizeLng,
  parseCountries,
  type Country,
} from "./countries";

const countries = parseCountries(
  JSON.parse(
    readFileSync(new URL("../../../public/data/countries-110m.geojson", import.meta.url), "utf8"),
  ),
);
const byId = (id: string): Country => {
  const country = countries.find((c) => c.id === id);
  if (!country) throw new Error(`No country ${id}`);
  return country;
};

describe("normalizeLng", () => {
  it("wraps into [-180, 180)", () => {
    expect(normalizeLng(190)).toBe(-170);
    expect(normalizeLng(-190)).toBe(170);
    expect(normalizeLng(540)).toBe(-180);
    expect(normalizeLng(12.5)).toBe(12.5);
  });
});

describe("angularDistance", () => {
  it("measures great-circle degrees", () => {
    expect(angularDistance(0, 0, 0, 90)).toBeCloseTo(90);
    expect(angularDistance(90, 0, -90, 0)).toBeCloseTo(180);
    expect(angularDistance(10, 179, 10, -179)).toBeCloseTo(2, 0);
  });
});

describe("longitudeExtent", () => {
  it("handles an ordinary range", () => {
    expect(longitudeExtent([-5, 8, 2])).toMatchObject({ west: -5, east: 8, span: 13, center: 1.5 });
  });

  it("takes the short way across the antimeridian", () => {
    const extent = longitudeExtent([178, 179.5, -179, -178.5]);
    expect(extent.west).toBe(178);
    expect(extent.east).toBeCloseTo(-178.5);
    expect(extent.span).toBeCloseTo(3.5);
    expect(Math.abs(extent.center)).toBeGreaterThan(179);
  });

  it("rejects an empty list", () => {
    expect(() => longitudeExtent([])).toThrow();
  });
});

describe("parseCountries", () => {
  it("loads every Natural Earth country with a unique id", () => {
    expect(countries).toHaveLength(177);
    expect(new Set(countries.map((c) => c.id)).size).toBe(177);
  });

  it("uses the extended ISO codes Natural Earth leaves out of ISO_A2", () => {
    expect(byId("FRA").iso2).toBe("FR");
    expect(byId("NOR").iso2).toBe("NO");
  });

  it("rejects data that is not a FeatureCollection", () => {
    expect(() => parseCountries({ type: "Feature" })).toThrow();
    expect(() => parseCountries(null)).toThrow();
  });
});

describe("countryAt", () => {
  const at = (lat: number, lng: number) => countryAt(countries, lat, lng)?.id ?? null;

  it("finds the country under a point", () => {
    expect(at(48.86, 2.35)).toBe("FRA"); // Paris
    expect(at(-15.8, -47.9)).toBe("BRA"); // Brasília
    expect(at(35.7, 139.7)).toBe("JPN"); // Tokyo
    expect(at(55.75, 37.6)).toBe("RUS"); // Moscow
  });

  it("respects holes: Lesotho is not South Africa", () => {
    expect(at(-29.3, 27.5)).toBe("LSO"); // Maseru
    expect(at(-26.2, 28.05)).toBe("ZAF"); // Johannesburg
  });

  it("works either side of the antimeridian and at the pole", () => {
    expect(at(-17.8, 178)).toBe("FJI"); // Viti Levu
    expect(at(66, -173)).toBe("RUS"); // Chukotka, west of 180°
    expect(at(-85, 0)).toBe("ATA");
  });

  it("returns null over open ocean", () => {
    expect(at(0, -30)).toBeNull();
    expect(at(-30, -140)).toBeNull();
  });
});

describe("country bounds", () => {
  it("frames metropolitan France without French Guiana", () => {
    const { bounds } = byId("FRA");
    expect(bounds.south).toBeGreaterThan(40);
    expect(bounds.west).toBeGreaterThan(-6);
    expect(bounds.lngSpan).toBeLessThan(15);
  });

  it("frames the contiguous USA without Alaska or Hawaii", () => {
    const { bounds } = byId("USA");
    expect(bounds.south).toBeGreaterThan(24);
    expect(bounds.north).toBeLessThan(50);
    expect(bounds.west).toBeGreaterThan(-126);
  });

  it("measures Fiji across the antimeridian", () => {
    const { bounds } = byId("FJI");
    expect(bounds.lngSpan).toBeLessThan(5);
    expect(bounds.west).toBeGreaterThan(bounds.east);
  });

  it("keeps Russia's span below a full hemisphere and over 100 degrees", () => {
    const { bounds } = byId("RUS");
    expect(bounds.lngSpan).toBeGreaterThan(100);
    expect(bounds.lngSpan).toBeLessThan(200);
  });

  it("gives every country a label point inside its bounds", () => {
    for (const c of countries) {
      expect(c.labelLat, c.name).toBeGreaterThanOrEqual(c.bounds.south - 1);
      expect(c.labelLat, c.name).toBeLessThanOrEqual(c.bounds.north + 1);
    }
  });
});
