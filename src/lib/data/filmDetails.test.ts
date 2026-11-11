import { describe, expect, it } from "vitest";
import {
  detailsUrl,
  formatDate,
  formatMoney,
  justWatchUrl,
  languageName,
  parseFilmDetails,
  preferredRegion,
  regionName,
  trailerEmbedUrl,
} from "./filmDetails";

describe("detailsUrl", () => {
  it("only maps numeric TMDB ids to a file", () => {
    expect(detailsUrl("194")).toBe("/data/films/194.json");
    expect(detailsUrl("amelie")).toBeNull();
    expect(detailsUrl("../../etc/passwd")).toBeNull();
  });
});

describe("parseFilmDetails", () => {
  it("fills defaults and re-checks links", () => {
    const d = parseFilmDetails({
      id: "1",
      homepage: "javascript:alert(1)",
      trailer: { key: "bad key!" },
      watch: { US: { link: "https://ok.example", stream: [] }, xx: {} },
    });
    expect(d.homepage).toBeNull();
    expect(d.trailer).toBeNull();
    expect(d.cast).toEqual([]);
    expect(Object.keys(d.watch)).toEqual(["US"]);
    expect(d.watch.US.link).toBe("https://ok.example");
  });

  it("rejects data without an id", () => {
    expect(() => parseFilmDetails({})).toThrow();
  });
});

describe("helpers", () => {
  it("picks the viewer's region for where to watch", () => {
    expect(preferredRegion(["US", "GB", "FR"], ["en-GB", "en"])).toBe("GB");
    expect(preferredRegion(["US", "FR"], ["de-DE"])).toBe("US");
    expect(preferredRegion(["FR"], ["de-DE"])).toBe("FR");
    expect(preferredRegion([], ["en-US"])).toBeNull();
  });

  it("links to JustWatch's regional site", () => {
    expect(justWatchUrl("GB", "Amélie")).toBe("https://www.justwatch.com/uk/search?q=Am%C3%A9lie");
    expect(justWatchUrl("FR", "Amélie")).toMatch(/^https:\/\/www\.justwatch\.com\/fr\/search/);
  });

  it("embeds trailers with YouTube's privacy-enhanced domain", () => {
    expect(trailerEmbedUrl("abc123XYZ")).toBe(
      "https://www.youtube-nocookie.com/embed/abc123XYZ?autoplay=1&rel=0",
    );
  });

  it("formats money, languages, regions and dates", () => {
    expect(formatMoney(10000000)).toBe("$10,000,000");
    expect(languageName("fr")).toBe("French");
    expect(regionName("GB")).toBe("United Kingdom");
    expect(formatDate("2001-04-25")).toBe("25 April 2001");
  });
});
