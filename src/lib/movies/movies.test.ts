import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MOCK_MOVIES } from "@/data/movies";
import { countryAt, parseCountries } from "@/lib/geo/countries";
import {
  escapeXml,
  hashString,
  posterDataUrl,
  posterPalette,
  posterSvg,
  wrapTitle,
} from "./poster";
import {
  baseMovieId,
  MAX_RENDERED_POSTERS,
  posterLimit,
  posterWidth,
  stressPosters,
  horizonDegrees,
  posterSeparation,
  selectPosters,
} from "./posters";

const countries = parseCountries(
  JSON.parse(
    readFileSync(new URL("../../../public/data/countries-110m.geojson", import.meta.url), "utf8"),
  ),
);

describe("mock catalogue", () => {
  it("has 10–20 films with unique ids", () => {
    expect(MOCK_MOVIES.length).toBeGreaterThanOrEqual(10);
    expect(MOCK_MOVIES.length).toBeLessThanOrEqual(20);
    expect(new Set(MOCK_MOVIES.map((m) => m.id)).size).toBe(MOCK_MOVIES.length);
  });

  it("only uses production countries that exist on the map", () => {
    const iso2 = new Set(countries.map((c) => c.iso2));
    for (const movie of MOCK_MOVIES) {
      expect(movie.countries.length, movie.id).toBeGreaterThan(0);
      for (const code of movie.countries) expect(iso2.has(code), `${movie.id}: ${code}`).toBe(true);
    }
  });

  it("pins every poster on land", () => {
    for (const movie of MOCK_MOVIES) {
      expect(countryAt(countries, movie.lat, movie.lng), movie.id).not.toBeNull();
    }
  });
});

describe("poster art", () => {
  it("is deterministic per film", () => {
    expect(hashString("parasite")).toBe(hashString("parasite"));
    expect(posterPalette("parasite")).toEqual(posterPalette("parasite"));
    expect(posterPalette("parasite")).not.toEqual(posterPalette("roma"));
  });

  it("escapes titles and directors", () => {
    expect(escapeXml(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&apos;");
    const svg = posterSvg({ id: "x", title: "Tom & Jerry <3", year: 1940, director: "A & B" });
    expect(svg).toContain(">Tom &amp; Jerry</text>");
    expect(svg).toContain(">&lt;3</text>");
    expect(svg).toContain("1940 · A &amp; B");
    expect(svg).not.toContain("<3");
  });

  it("wraps long titles onto several lines", () => {
    expect(wrapTitle("Crouching Tiger, Hidden Dragon", 12)).toEqual([
      "Crouching",
      "Tiger,",
      "Hidden",
      "Dragon",
    ]);
    expect(wrapTitle("Roma", 12)).toEqual(["Roma"]);
    expect(wrapTitle("Supercalifragilistic film", 8)).toEqual(["Supercalifragilistic", "film"]);
  });

  it("labels itself as placeholder art and encodes as a data URL", () => {
    const movie = MOCK_MOVIES[0];
    expect(posterSvg(movie)).toContain("PLACEHOLDER ART");
    expect(posterDataUrl(movie)).toMatch(/^data:image\/svg\+xml;charset=utf-8,%3Csvg/);
  });
});

describe("poster visibility", () => {
  it("grows posters as the camera zooms in, within bounds", () => {
    expect(posterWidth(2.4)).toBeLessThan(posterWidth(1));
    expect(posterWidth(1)).toBeLessThan(posterWidth(0.5));
    expect(posterWidth(100)).toBe(26);
    expect(posterWidth(0.01)).toBe(88);
  });

  it("shows fewer posters when zoomed out", () => {
    expect(posterLimit(2.4)).toBe(12);
    expect(posterLimit(1.2)).toBe(16);
    expect(posterLimit(0.6)).toBe(MAX_RENDERED_POSTERS);
  });

  it("knows how far the camera can see", () => {
    expect(horizonDegrees(1)).toBeCloseTo(60);
    expect(horizonDegrees(2.4)).toBeGreaterThan(horizonDegrees(0.5));
  });

  const ids = (list: { id: string }[]) => list.map((m) => m.id);

  it("only counts posters facing the camera", () => {
    // Looking at Europe: Seoul, Tokyo and Wellington are behind the globe.
    const shown = ids(
      selectPosters(MOCK_MOVIES, { limit: 100, center: { lat: 45, lng: 10 }, altitude: 1 }),
    );
    expect(shown).toContain("amelie");
    expect(shown).not.toContain("parasite");
    expect(shown).not.toContain("fellowship-of-the-ring");
  });

  it("lets every country show its best film before any shows a second", () => {
    // India has two films (Pather Panchali, RRR); with room for one per country, only the better
    // ranked appears until every other facing country has one. (Zoomed in, so spacing allows both.)
    const view = { center: { lat: 20, lng: 80 }, altitude: 1 };
    const all = selectPosters(MOCK_MOVIES, { limit: 100, ...view });
    const countries = new Set(all.map((m) => m.home));
    const onePerCountry = ids(selectPosters(MOCK_MOVIES, { limit: countries.size, ...view }));
    expect(onePerCountry.filter((id) => id === "rrr" || id === "pather-panchali")).toHaveLength(1);
    expect(ids(all)).toEqual(expect.arrayContaining(["rrr", "pather-panchali"]));
  });

  it("keeps posters apart, more so when zoomed out", () => {
    expect(posterSeparation(2.4)).toBeGreaterThan(posterSeparation(0.5));
    // Seoul and Tokyo are ~10° apart: one poster from the whole globe away, both up close.
    const far = ids(
      selectPosters(MOCK_MOVIES, { limit: 100, center: { lat: 36, lng: 132 }, altitude: 2.4 }),
    );
    const near = ids(
      selectPosters(MOCK_MOVIES, { limit: 100, center: { lat: 36, lng: 132 }, altitude: 0.8 }),
    );
    expect(far.filter((id) => id === "parasite" || id === "spirited-away")).toHaveLength(1);
    expect(near).toEqual(expect.arrayContaining(["parasite", "spirited-away"]));
  });

  it("ranks within the limit and always adds the selected films", () => {
    const shown = selectPosters(MOCK_MOVIES, { limit: 3, center: null, altitude: 0.5 });
    expect(shown.map((m) => m.rank)).toEqual([10, 10, 10]);
    const withSelected = selectPosters(MOCK_MOVIES, {
      limit: 3,
      center: null,
      altitude: 0.5,
      always: new Set(["leviathan"]),
    });
    expect(ids(withSelected)).toEqual([...ids(shown), "leviathan"]);
  });

  it("builds reproducible stress sets that start with the real films", () => {
    const a = stressPosters(MOCK_MOVIES, 300);
    expect(a).toHaveLength(300);
    expect(a.slice(0, MOCK_MOVIES.length)).toEqual(MOCK_MOVIES);
    expect(stressPosters(MOCK_MOVIES, 300)).toEqual(a);
    expect(new Set(a.map((m) => m.id)).size).toBe(300);
    expect(baseMovieId(a[250].id)).toBe(MOCK_MOVIES[(250 - 20) % 20].id);
    expect(stressPosters(MOCK_MOVIES, 5)).toHaveLength(5);
  });
});
