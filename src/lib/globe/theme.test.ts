import { describe, expect, it } from "vitest";
import { countryTooltipHtml, escapeHtml } from "./theme";

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
