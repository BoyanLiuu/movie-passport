import { describe, expect, it } from "vitest";
import { DEFAULT_DEBUG, parseDebugOptions } from "./debug";

describe("parseDebugOptions", () => {
  it("ignores every option unless debug is on", () => {
    expect(parseDebugOptions("")).toEqual(DEFAULT_DEBUG);
    expect(parseDebugOptions("?renderer=sprites&posters=1000&cap=0")).toEqual(DEFAULT_DEBUG);
  });

  it("reads renderer, poster count and cap", () => {
    expect(parseDebugOptions("?debug&renderer=sprites&posters=300&cap=0")).toEqual({
      enabled: true,
      renderer: "sprites",
      posters: 300,
      cap: false,
    });
  });

  it("falls back to safe values for bad input", () => {
    expect(parseDebugOptions("?debug&renderer=webgpu&posters=-4")).toMatchObject({
      renderer: "html",
      posters: null,
      cap: true,
    });
    expect(parseDebugOptions("?debug&posters=999999").posters).toBe(2000);
    expect(parseDebugOptions("?debug&posters=0").posters).toBe(0);
  });
});
