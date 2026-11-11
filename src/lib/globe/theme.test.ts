import { describe, expect, it } from "vitest";
import { countryTooltipHtml, escapeHtml, globeTheme, landColorFor } from "./theme";

describe("escapeHtml", () => {
  it("escapes markup characters", () => {
    expect(escapeHtml(`<img src=x onerror="a('b')">&`)).toBe(
      "&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;",
    );
  });
});

describe("countryTooltipHtml", () => {
  it("includes the escaped name and continent", () => {
    expect(countryTooltipHtml("Côte d'Ivoire", "Africa")).toContain("Côte d&#39;Ivoire");
    expect(countryTooltipHtml("Côte d'Ivoire", "Africa")).toContain("<span>Africa</span>");
  });
});

describe("landColorFor", () => {
  it("warms countries with more films, saturating at three", () => {
    expect(landColorFor(0)).toBe(globeTheme.land);
    expect(landColorFor(1)).toBe(globeTheme.landWithFilms[0]);
    expect(landColorFor(2)).toBe(globeTheme.landWithFilms[1]);
    expect(landColorFor(9)).toBe(globeTheme.landWithFilms[2]);
  });

  it("adds the film count line to the tooltip when given", () => {
    expect(countryTooltipHtml("France", "Europe", "2 films")).toContain("<em>2 films</em>");
    expect(countryTooltipHtml("France", "Europe")).not.toContain("<em>");
  });
});
