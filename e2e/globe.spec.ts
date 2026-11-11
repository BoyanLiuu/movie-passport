import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import type { GlobeTestHook } from "../src/components/globe/GlobeScene";
import { focusView, GLOBAL_LAT, globalAltitude } from "../src/lib/geo/camera";
import { parseCountries, type Country } from "../src/lib/geo/countries";

declare global {
  interface Window {
    __moviePassportGlobe?: GlobeTestHook;
  }
}

const countries = parseCountries(
  JSON.parse(
    readFileSync(new URL("../public/data/countries-110m.geojson", import.meta.url), "utf8"),
  ),
);
const country = (id: string): Country => {
  const found = countries.find((c) => c.id === id);
  if (!found) throw new Error(`No country ${id}`);
  return found;
};

/** Collects console errors and uncaught exceptions for the whole test. */
const trackErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
};

const openGlobe = async (page: Page, { reducedMotion = true } = {}) => {
  // Reduced motion makes camera moves instant and turns off auto-rotation: deterministic tests.
  await page.emulateMedia({ reducedMotion: reducedMotion ? "reduce" : "no-preference" });
  await page.goto("/");
  await expect(page.getByTestId("globe-canvas")).toHaveAttribute("data-ready", "true");
  await page.waitForFunction(() => !!window.__moviePassportGlobe);
};

const nextFrames = (page: Page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

const pointOfView = (page: Page) => page.evaluate(() => window.__moviePassportGlobe!.pointOfView());

const aspect = (page: Page) => {
  const size = page.viewportSize()!;
  return size.width / size.height;
};

/** Points the camera straight at a lat/lng and returns where that point is on screen. */
const aimAt = async (page: Page, lat: number, lng: number, altitude = 1) => {
  await page.evaluate((pov) => window.__moviePassportGlobe!.setPointOfView(pov), {
    lat,
    lng,
    altitude,
  });
  await nextFrames(page);
  return page.evaluate(([la, ln]) => window.__moviePassportGlobe!.screenCoords(la, ln), [lat, lng]);
};

const press = async (page: Page, x: number, y: number) => {
  if (test.info().project.use.hasTouch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
};

const selectCountry = async (page: Page, id: string) => {
  const c = country(id);
  const { x, y } = await aimAt(page, c.labelLat, c.labelLng);
  await press(page, x, y);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(c.name);
  return c;
};

test.describe("global view", () => {
  test("renders the globe without errors", async ({ page, hasTouch }) => {
    const errors = trackErrors(page);
    await openGlobe(page);
    await expect(page.getByRole("heading", { name: "Movie Passport" })).toBeVisible();
    await expect(page.locator("canvas")).toBeVisible();
    const hint = hasTouch ? "Pinch to zoom · Tap a country" : "Scroll to zoom · Click a country";
    await expect(page.getByText(hint)).toBeVisible();
    await expect(page.locator("[data-mode]")).toHaveAttribute("data-mode", "global");

    const pov = await pointOfView(page);
    expect(pov.lat).toBeCloseTo(GLOBAL_LAT, 1);
    expect(pov.altitude).toBeCloseTo(globalAltitude(aspect(page)), 1);
    expect(errors).toEqual([]);
  });

  test("auto-rotates when idle and stops in country view", async ({ page }) => {
    await openGlobe(page, { reducedMotion: false });
    await page.waitForTimeout(2500); // build-in animation, then the auto-rotate delay
    const first = await pointOfView(page);
    await page.waitForTimeout(1000);
    const second = await pointOfView(page);
    expect(Math.abs(second.lng - first.lng)).toBeGreaterThan(0.2);

    const { width, height } = page.viewportSize()!;
    await press(page, width / 2, height / 2);
    await expect(page.getByTestId("country-info")).toBeVisible();
    await page.waitForTimeout(1600); // focus transition
    const settled = await pointOfView(page);
    await page.waitForTimeout(1000);
    expect((await pointOfView(page)).lng).toBeCloseTo(settled.lng, 2);
  });
});

test.describe("country selection", () => {
  // Large, small, antimeridian-crossing, and Natural Earth's ISO_A2 = -99 cases (France, Norway).
  for (const id of ["FRA", "NOR", "BRA", "JPN", "AUS", "RUS", "USA", "ZAF", "CHL", "FJI"]) {
    test(`selects ${country(id).name} and focuses the camera on it`, async ({ page }) => {
      const errors = trackErrors(page);
      await openGlobe(page);
      const c = await selectCountry(page, id);

      await expect(page.locator("[data-mode]")).toHaveAttribute("data-mode", "country");
      await expect(page.getByTestId("announcer")).toHaveText(
        `${c.name} selected. Press Escape to return to the globe.`,
      );

      const expected = focusView(c, aspect(page));
      const pov = await pointOfView(page);
      expect(pov.lat).toBeCloseTo(expected.lat, 1);
      expect(pov.altitude).toBeCloseTo(expected.altitude, 1);
      expect(errors).toEqual([]);
    });
  }

  test("Escape returns to the global view above the same longitude", async ({ page }) => {
    await openGlobe(page);
    const c = await selectCountry(page, "JPN");
    await page.keyboard.press("Escape");

    await expect(page.getByTestId("country-info")).toBeHidden();
    await expect(page.locator("[data-mode]")).toHaveAttribute("data-mode", "global");
    await expect(page.getByTestId("announcer")).toHaveText("Globe view.");
    const pov = await pointOfView(page);
    expect(pov.lat).toBeCloseTo(GLOBAL_LAT, 1);
    expect(pov.lng).toBeCloseTo(c.labelLng, 1);
    expect(pov.altitude).toBeCloseTo(globalAltitude(aspect(page)), 1);
  });

  test("Back to globe button returns to the global view", async ({ page }) => {
    await openGlobe(page);
    await selectCountry(page, "BRA");
    await page.getByRole("button", { name: /Back to globe/ }).click();
    await expect(page.getByTestId("country-info")).toBeHidden();
    expect((await pointOfView(page)).altitude).toBeCloseTo(globalAltitude(aspect(page)), 1);
  });

  test("selecting another country switches directly", async ({ page }) => {
    await openGlobe(page);
    await selectCountry(page, "FRA");
    await selectCountry(page, "ZAF");
    await expect(page.getByTestId("announcer")).toHaveText(/^South Africa selected/);
    expect((await pointOfView(page)).lat).toBeCloseTo(country("ZAF").labelLat, 1);
  });

  test("clicking the ocean keeps the global view", async ({ page }) => {
    await openGlobe(page);
    const { x, y } = await aimAt(page, -30, -140, 2.4); // South Pacific
    await press(page, x, y);
    await page.waitForTimeout(300);
    await expect(page.getByTestId("country-info")).toBeHidden();
    await expect(page.locator("[data-mode]")).toHaveAttribute("data-mode", "global");
  });

  test("the country panel fits on screen", async ({ page }) => {
    await openGlobe(page);
    await selectCountry(page, "CHL");
    const box = (await page.getByTestId("country-info").boundingBox())!;
    const { width, height } = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y + box.height).toBeLessThanOrEqual(height);
  });
});

test.describe("hover", () => {
  test.skip(({ hasTouch }) => hasTouch, "Touch screens have no hover");

  test("shows the country name in a tooltip", async ({ page }) => {
    await openGlobe(page);
    const c = country("IND");
    const { x, y } = await aimAt(page, c.labelLat, c.labelLng);
    await page.mouse.move(x - 5, y - 5);
    await page.mouse.move(x, y);
    await expect(page.locator(".globe-tooltip")).toContainText(c.name);
  });
});
