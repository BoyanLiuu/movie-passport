// Shared helpers for the browser tests. They drive the app through the opt-in test hook
// (window.__moviePassportGlobe, compiled into the e2e build only; see src/components/globe/testHook.ts).

import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import type { GlobeTestHook } from "../src/components/globe/testHook";
import { parseCountries, type Country } from "../src/lib/geo/countries";

declare global {
  interface Window {
    __moviePassportGlobe?: GlobeTestHook;
  }
}

export const countries = parseCountries(
  JSON.parse(
    readFileSync(new URL("../public/data/countries-110m.geojson", import.meta.url), "utf8"),
  ),
);
export const country = (id: string): Country => {
  const found = countries.find((c) => c.id === id);
  if (!found) throw new Error(`No country ${id}`);
  return found;
};

/** Collects console errors and uncaught exceptions for the whole test. */
export const trackErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
};

type OpenOptions = { reducedMotion?: boolean; posters?: boolean; query?: string };

export const openGlobe = async (
  page: Page,
  { reducedMotion = true, posters = true, query = "" }: OpenOptions = {},
) => {
  // Reduced motion makes camera moves instant and turns off auto-rotation: deterministic tests.
  await page.emulateMedia({ reducedMotion: reducedMotion ? "reduce" : "no-preference" });
  // Country tests turn posters off: a poster correctly wins a click over the country beneath it.
  await page.goto(query || (posters ? "/" : "/?debug&posters=0"));
  await expect(page.getByTestId("globe-canvas")).toHaveAttribute("data-ready", "true");
  await page.waitForFunction(() => !!window.__moviePassportGlobe);
};

export const nextFrames = (page: Page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

export const pointOfView = (page: Page) =>
  page.evaluate(() => window.__moviePassportGlobe!.pointOfView());

export const aspect = (page: Page) => {
  const size = page.viewportSize()!;
  return size.width / size.height;
};

/** Points the camera straight at a lat/lng and returns where that point is on screen. */
export const aimAt = async (page: Page, lat: number, lng: number, altitude = 1) => {
  await page.evaluate((pov) => window.__moviePassportGlobe!.setPointOfView(pov), {
    lat,
    lng,
    altitude,
  });
  await nextFrames(page);
  return page.evaluate(([la, ln]) => window.__moviePassportGlobe!.screenCoords(la, ln), [lat, lng]);
};

/** Click with a mouse, or tap on touch projects. */
export const press = async (page: Page, x: number, y: number) => {
  if (test.info().project.use.hasTouch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
};
