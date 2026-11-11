import { describe, expect, it } from "vitest";
import {
  focusAltitude,
  focusView,
  GLOBAL_ALTITUDE,
  GLOBAL_LAT,
  globalAltitude,
  globalViewFrom,
  initialView,
  MAX_FOCUS_ALTITUDE,
  MIN_FOCUS_ALTITUDE,
} from "./camera";
import type { Bounds, Country } from "./countries";

const bounds = (latSpan: number, lngSpan: number, midLat = 0): Bounds => ({
  south: midLat - latSpan / 2,
  north: midLat + latSpan / 2,
  west: 0,
  east: lngSpan,
  latSpan,
  lngSpan,
});

describe("focusAltitude", () => {
  it("never zooms closer than the minimum, even for tiny countries", () => {
    expect(focusAltitude(bounds(0.5, 0.5))).toBe(MIN_FOCUS_ALTITUDE);
  });

  it("never zooms further than the maximum on landscape screens", () => {
    expect(focusAltitude(bounds(60, 170, 60))).toBe(MAX_FOCUS_ALTITUDE);
  });

  it("grows with country size", () => {
    expect(focusAltitude(bounds(10, 10))).toBeLessThan(focusAltitude(bounds(30, 30)));
  });

  it("discounts longitude at high latitudes", () => {
    expect(focusAltitude(bounds(5, 40, 70))).toBeLessThan(focusAltitude(bounds(5, 40, 0)));
  });

  it("pulls back on portrait screens", () => {
    const b = bounds(20, 20);
    expect(focusAltitude(b, 9 / 19)).toBeGreaterThan(focusAltitude(b, 16 / 9));
  });
});

describe("viewpoints", () => {
  it("starts on the fixed global view", () => {
    expect(initialView()).toEqual({ lat: GLOBAL_LAT, lng: 10, altitude: GLOBAL_ALTITUDE });
  });

  it("zooms out above the current longitude on reset", () => {
    expect(globalViewFrom({ lng: 120 })).toEqual({
      lat: GLOBAL_LAT,
      lng: 120,
      altitude: GLOBAL_ALTITUDE,
    });
  });

  it("frames the whole globe further out on portrait screens", () => {
    expect(globalAltitude(9 / 19)).toBeGreaterThan(GLOBAL_ALTITUDE);
  });

  it("focuses on the label point", () => {
    const country = { labelLat: 46.7, labelLng: 2.55, bounds: bounds(9, 13, 46) } as Country;
    expect(focusView(country)).toMatchObject({ lat: 46.7, lng: 2.55 });
  });
});
