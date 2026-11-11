import { expect, test, type Page } from "@playwright/test";
import { aimAt, nextFrames, openGlobe, pointOfView, press, trackErrors } from "./helpers";

const poster = (page: Page, id: string) => page.locator(`[data-poster-id="${id}"] .poster`);
const shown = (page: Page) => page.getByTestId("globe-canvas");

/** Centre of a poster on screen. */
const centreOf = async (page: Page, id: string) => {
  const box = (await poster(page, id).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, width: box.width };
};

/** Europe at a zoom where Amélie (Paris) and Run Lola Run (Berlin) are both on screen. */
const lookAtEurope = (page: Page) => aimAt(page, 45, 15, 1);

test.describe("posters", () => {
  test("show films from the side facing the camera, a dozen at most when zoomed out", async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await openGlobe(page);
    const count = Number(await shown(page).getAttribute("data-posters-shown"));
    expect(count).toBeGreaterThan(5);
    expect(count).toBeLessThanOrEqual(12);
    await expect(poster(page, "amelie")).toBeVisible(); // Paris faces the camera
    await expect(poster(page, "leviathan")).toBeVisible(); // Russia's best film gets its turn
    // Seoul and Wellington are behind the globe: not rendered at all.
    await expect(page.locator('[data-poster-id="parasite"]')).toHaveCount(0);
    await expect(page.locator('[data-poster-id="fellowship-of-the-ring"]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("grow as the camera zooms in, and follow where it looks", async ({ page }) => {
    await openGlobe(page);
    const far = await centreOf(page, "amelie");
    await aimAt(page, 45, 15, 0.8);
    await nextFrames(page);
    expect((await centreOf(page, "amelie")).width).toBeGreaterThan(far.width * 1.5);

    // Turn to East Asia: Seoul and Tokyo come into view, Paris leaves it.
    await aimAt(page, 36, 132, 1.2);
    await expect(poster(page, "parasite")).toBeVisible();
    await expect(poster(page, "spirited-away")).toBeVisible();
    await expect(page.locator('[data-poster-id="amelie"]')).toHaveCount(0);
  });

  test("open the film and light up every production country", async ({ page }) => {
    await openGlobe(page);
    await lookAtEurope(page);
    const { x, y } = await centreOf(page, "amelie");
    await press(page, x, y);

    await expect(page.getByTestId("movie-info")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText("Amélie");
    await expect(page.locator("[data-mode]")).toHaveAttribute("data-mode", "movie");
    await expect(shown(page)).toHaveAttribute("data-highlighted", "FRA,DEU");
    await expect(page.locator('[data-poster-id="amelie"]')).toHaveAttribute("data-selected", "");
    await expect(page.getByTestId("announcer")).toHaveText(
      "Amélie (2001) selected. Press Escape to return to the globe.",
    );
    expect((await pointOfView(page)).lat).toBeCloseTo(48.86, 1);
  });

  test("country chips switch to that country, and Escape returns to the globe", async ({
    page,
  }) => {
    await openGlobe(page);
    await lookAtEurope(page);
    const { x, y } = await centreOf(page, "amelie");
    await press(page, x, y);

    await page.getByRole("button", { name: "Germany" }).click();
    await expect(page.getByTestId("country-info")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText("Germany");
    await expect(shown(page)).toHaveAttribute("data-highlighted", "DEU");

    await page.keyboard.press("Escape");
    await expect(page.locator("[data-mode]")).toHaveAttribute("data-mode", "global");
    await expect(shown(page)).toHaveAttribute("data-highlighted", "");
  });

  test("never draw over the info panel", async ({ page }) => {
    await openGlobe(page);
    await lookAtEurope(page);
    const { x, y } = await centreOf(page, "amelie");
    await press(page, x, y);
    const panel = (await page.getByTestId("movie-info").boundingBox())!;
    const topmost = await page.evaluate(
      ([px, py]) =>
        document.elementFromPoint(px, py)?.closest("[data-testid]")?.getAttribute("data-testid"),
      [panel.x + panel.width / 2, panel.y + panel.height / 2],
    );
    expect(topmost).toBe("movie-info");
  });

  test("open from the keyboard", async ({ page }) => {
    await openGlobe(page);
    await lookAtEurope(page);
    await poster(page, "amelie").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText("Amélie");
  });
});

test.describe("posters with a mouse", () => {
  test.skip(({ hasTouch }) => hasTouch, "Mouse-only behaviour");

  test("hovering shows the title and hides the country tooltip", async ({ page }) => {
    await openGlobe(page);
    await lookAtEurope(page);
    const { x, y } = await centreOf(page, "amelie");
    await page.mouse.move(x - 4, y - 4);
    await page.mouse.move(x, y);
    await expect(page.locator('[data-poster-id="amelie"]')).toHaveAttribute("data-hover", "");
    await expect(page.locator('[data-poster-id="amelie"] .poster-label')).toBeVisible();
    await expect(page.locator(".float-tooltip-kap")).toBeHidden();
  });

  test("dragging across a poster still rotates the globe", async ({ page }) => {
    await openGlobe(page);
    await lookAtEurope(page);
    const before = await pointOfView(page);
    const { x, y } = await centreOf(page, "amelie");
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 200, y, { steps: 10 });
    await page.mouse.up();
    await nextFrames(page);
    expect(Math.abs((await pointOfView(page)).lng - before.lng)).toBeGreaterThan(5);
    await expect(page.locator("[data-mode]")).toHaveAttribute("data-mode", "global");
  });

  test("scrolling over a poster still zooms", async ({ page }) => {
    await openGlobe(page);
    await lookAtEurope(page);
    const before = await pointOfView(page);
    const { x, y } = await centreOf(page, "amelie");
    await page.mouse.move(x, y);
    await page.mouse.wheel(0, -600);
    await expect.poll(async () => (await pointOfView(page)).altitude).toBeLessThan(before.altitude);
  });
});

test.describe("rendering spike", () => {
  test("three.js sprite posters render and open films", async ({ page }) => {
    const errors = trackErrors(page);
    await openGlobe(page, { query: "/?debug&renderer=sprites" });
    await expect(shown(page)).toHaveAttribute("data-poster-renderer", "sprites");
    await expect(page.locator(".poster-anchor")).toHaveCount(0);

    // Sprites stand on their pin, so aim just above Paris.
    const pin = await aimAt(page, 48.86, 2.35, 1);
    await page.waitForTimeout(200); // sprite textures load from data URLs
    await press(page, pin.x, pin.y - 15);
    await expect(page.getByRole("heading", { level: 2 })).toHaveText("Amélie");
    expect(errors).toEqual([]);
  });

  test("debug panel reports the frame rate", async ({ page }) => {
    await openGlobe(page, { query: "/?debug" });
    await expect(page.getByTestId("fps")).toHaveAttribute("data-fps", /^\d+$/);
  });
});
