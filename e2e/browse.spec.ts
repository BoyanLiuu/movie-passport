import { expect, test, type Page } from "@playwright/test";
import { aimAt, country, openGlobe, pointOfView, trackErrors } from "./helpers";

const panel = (page: Page) => page.getByRole("heading", { level: 2 });
const mode = (page: Page) => page.locator("[data-mode]");
const searchInput = (page: Page) =>
  page.getByRole("combobox", { name: "Search countries or films" });
const filmList = (page: Page, countryName: string) =>
  page.getByRole("list", { name: `Films from ${countryName}` });
const activePosterIds = (page: Page) =>
  page
    .locator(".poster-anchor:not([data-out])")
    .evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.posterId).sort());

test.describe("country view", () => {
  test("lists the country's films with simple stats", async ({ page }) => {
    const errors = trackErrors(page);
    await openGlobe(page, { query: "/?country=FR" });
    await expect(panel(page)).toHaveText("France");

    const stats = page.getByTestId("country-stats");
    await expect(stats).toContainText("From here2");
    await expect(stats).toContainText("Co-produced0");
    await expect(stats).toContainText("2000s–2010s");

    const items = filmList(page, "France").getByRole("button");
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText("Amélie");
    await expect(items.nth(0)).toContainText("with Germany");
    await expect(items.nth(1)).toContainText("Timbuktu");
    await expect(items.nth(1)).toContainText("with Mauritania");
    expect(errors).toEqual([]);
  });

  test("keeps only the country's posters on the globe", async ({ page }) => {
    await openGlobe(page, { query: "/?country=FR" });
    await expect.poll(() => activePosterIds(page)).toEqual(["amelie", "timbuktu"]);

    await page.keyboard.press("Escape");
    await expect(mode(page)).toHaveAttribute("data-mode", "global");
    // The global set comes back: more than France's two, at most a dozen.
    await expect.poll(async () => (await activePosterIds(page)).length).toBeGreaterThan(2);
    expect((await activePosterIds(page)).length).toBeLessThanOrEqual(12);
  });

  test("opens a film from the list", async ({ page }) => {
    await openGlobe(page, { query: "/?country=US" });
    await filmList(page, "United States of America")
      .getByRole("button", { name: /The Godfather/ })
      .click();
    await expect(page.getByTestId("movie-info")).toBeVisible();
    await expect(panel(page)).toHaveText("The Godfather");
    await expect(page).toHaveURL(/\?film=the-godfather$/);
  });

  test("shows an empty state with nearby countries that have films", async ({ page }) => {
    await openGlobe(page, { query: "/?country=ML" });
    await expect(panel(page)).toHaveText("Mali");
    const empty = page.getByTestId("country-empty");
    await expect(empty).toContainText("No films from Mali in the catalogue yet.");
    await empty.getByRole("button").first().click();
    await expect(panel(page)).toHaveText("Mauritania");
    // Timbuktu is from France; Mauritania co-produced it.
    await expect(page.getByRole("list", { name: "Co-productions with Mauritania" })).toContainText(
      "Timbuktu",
    );
  });
});

test.describe("URL sync", () => {
  test("deep links open a country or a film", async ({ page }) => {
    await openGlobe(page, { query: "/?film=parasite" });
    await expect(panel(page)).toHaveText("Parasite");
    expect((await pointOfView(page)).lat).toBeCloseTo(37.57, 1);

    await openGlobe(page, { query: "/?country=jp" });
    await expect(panel(page)).toHaveText("Japan");
    expect((await pointOfView(page)).lat).toBeCloseTo(country("JPN").labelLat, 1);
  });

  test("browser Back and Forward move between views", async ({ page }) => {
    await openGlobe(page);
    await searchInput(page).fill("japan");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\?country=JP$/);
    await filmList(page, "Japan")
      .getByRole("button", { name: /Spirited Away/ })
      .click();
    await expect(page).toHaveURL(/\?film=spirited-away$/);

    await page.goBack();
    await expect(panel(page)).toHaveText("Japan");
    await page.goBack();
    await expect(mode(page)).toHaveAttribute("data-mode", "global");
    await expect(page.getByTestId("country-info")).toBeHidden();
    await page.goForward();
    await expect(panel(page)).toHaveText("Japan");
  });

  test("an unknown link shows a notice and the whole globe", async ({ page }) => {
    await openGlobe(page, { query: "/?country=Atlantis" });
    const notice = page.getByTestId("not-found");
    await expect(notice).toContainText("No country matches “Atlantis”");
    await expect(mode(page)).toHaveAttribute("data-mode", "global");
    await notice.getByRole("button", { name: "Dismiss" }).click();
    await expect(notice).toBeHidden();
    await expect(page).toHaveURL(/\/$/);
  });

  test("one globe instance serves every view", async ({ page }) => {
    await openGlobe(page);
    await page.locator("canvas").evaluate((el) => ((el as HTMLElement).dataset.marker = "same"));
    await searchInput(page).fill("brazil");
    await page.keyboard.press("Enter");
    await expect(panel(page)).toHaveText("Brazil");
    await page.goBack();
    await expect(mode(page)).toHaveAttribute("data-mode", "global");
    await expect(page.locator("canvas")).toHaveCount(1);
    await expect(page.locator("canvas")).toHaveAttribute("data-marker", "same");
  });
});

test.describe("search", () => {
  test("is keyboard-operable from anywhere", async ({ page }) => {
    await openGlobe(page);
    await page.keyboard.press("/");
    await expect(searchInput(page)).toBeFocused();
    await page.keyboard.type("bra");
    await expect(page.getByRole("option").first()).toHaveText(/Brazil/);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Enter");
    await expect(panel(page)).toHaveText("Brazil");
    await expect(page.locator("#country-info-title")).toBeFocused();
  });

  test("Escape clears the search before it leaves the country", async ({ page }) => {
    await openGlobe(page, { query: "/?country=BR" });
    await searchInput(page).fill("xyzzy");
    await expect(page.getByRole("listbox")).toContainText("No countries or films match “xyzzy”.");
    await page.keyboard.press("Escape");
    await expect(searchInput(page)).toHaveValue("");
    await expect(mode(page)).toHaveAttribute("data-mode", "country");
    await page.keyboard.press("Escape"); // empty box: blur
    await page.keyboard.press("Escape"); // now leaves the country
    await expect(mode(page)).toHaveAttribute("data-mode", "global");
  });

  test("finds films by director and opens them", async ({ page }) => {
    await openGlobe(page);
    await searchInput(page).fill("miyazaki");
    await expect(page.getByRole("option")).toHaveCount(1);
    await page.getByRole("option").click();
    await expect(panel(page)).toHaveText("Spirited Away");
  });
});

test.describe("with a mouse", () => {
  test.skip(({ hasTouch }) => hasTouch, "Mouse-only behaviour");

  test("tooltips show how many films a country has", async ({ page }) => {
    await openGlobe(page, { posters: false });
    const fra = country("FRA");
    let { x, y } = await aimAt(page, fra.labelLat, fra.labelLng);
    await page.mouse.move(x - 4, y - 4);
    await page.mouse.move(x, y);
    await expect(page.locator(".globe-tooltip")).toContainText("2 films");

    const mli = country("MLI");
    ({ x, y } = await aimAt(page, mli.labelLat, mli.labelLng));
    await page.mouse.move(x - 4, y - 4);
    await page.mouse.move(x, y);
    await expect(page.locator(".globe-tooltip")).toContainText("No films yet");
  });

  test("hovering a film in the list points at its poster", async ({ page }) => {
    await openGlobe(page, { query: "/?country=FR" });
    await filmList(page, "France")
      .getByRole("button", { name: /Amélie/ })
      .hover();
    await expect(page.locator('[data-poster-id="amelie"]')).toHaveAttribute("data-linked", "");
  });
});
