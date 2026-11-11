import { expect, test, type Page } from "@playwright/test";
import { aimAt, openGlobe, press, trackErrors } from "./helpers";

// A tiny TMDB-shaped catalogue, as written by scripts/fetch-catalogue.mjs.
const film = (over: Record<string, unknown>) => ({
  directors: ["Someone"],
  genres: ["Drama"],
  runtime: 100,
  rating: 7.5,
  poster: "/poster.jpg",
  ...over,
});
const fixture = {
  catalogue: {
    source: "TMDB",
    generatedAt: "2026-11-11T12:00:00.000Z",
    films: [
      film({
        id: "194",
        title: "Amélie",
        year: 2001,
        origin: ["FR"],
        countries: ["FR", "DE"],
        votes: 12000,
        directors: ["Jean-Pierre Jeunet"],
        runtime: 122,
        rating: 7.9,
      }),
      film({
        id: "104",
        title: "Run Lola Run",
        year: 1998,
        origin: ["DE"],
        countries: ["DE"],
        votes: 3000,
      }),
      film({
        id: "496243",
        title: "Parasite",
        year: 2019,
        origin: ["KR"],
        countries: ["KR"],
        votes: 20000,
      }),
    ],
  },
  overviews: {
    "194":
      "At a tiny Parisian café, a shy waitress decides to change the lives of those around her.",
  },
};

const panel = (page: Page) => page.getByRole("heading", { level: 2 });

test.beforeEach(async ({ page }) => {
  // Never reach the real image CDN from tests: failed posters must fall back to generated art.
  await page.route("https://image.tmdb.org/**", (route) => route.abort());
});

test("without a catalogue, shows the sample films and says so", async ({ page }) => {
  await openGlobe(page);
  await page.getByRole("button", { name: "About & credits" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByTestId("mock-credit")).toContainText("20 hand-picked sample films");
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("with a TMDB catalogue, splits a country's films into From and Co-produced", async ({
  page,
}) => {
  const errors = trackErrors(page, [/^https:\/\/image\.tmdb\.org\//]);
  await openGlobe(page, { catalogue: fixture, query: "/?country=DE" });
  await expect(panel(page)).toHaveText("Germany");
  await expect(page.getByRole("list", { name: "Films from Germany" })).toHaveText(/Run Lola Run/);
  await expect(page.getByRole("list", { name: "Co-productions with Germany" })).toHaveText(
    /Amélie/,
  );
  expect(errors).toEqual([]);
});

test("the film card shows TMDB details, the plot, and a link back to TMDB", async ({ page }) => {
  await openGlobe(page, { catalogue: fixture, query: "/?film=194" });
  const card = page.getByTestId("movie-info");
  await expect(panel(page)).toHaveText("Amélie");
  await expect(card).toContainText("2001 · 2 h 2 min · ★ 7.9");
  await expect(card).toContainText("Jean-Pierre Jeunet");
  await expect(page.getByTestId("movie-overview")).toContainText("shy waitress");
  await expect(card.getByRole("link", { name: /View on TMDB/ })).toHaveAttribute(
    "href",
    "https://www.themoviedb.org/movie/194",
  );
  await expect(card.getByRole("button", { name: "France" })).toBeVisible(); // From
  await expect(card.getByRole("button", { name: "Germany" })).toBeVisible(); // Co-produced with
});

test("posters that fail to load fall back to generated art", async ({ page }) => {
  await openGlobe(page, { catalogue: fixture, query: "/?film=194" });
  await expect(page.getByTestId("movie-info").locator("img")).toHaveAttribute(
    "src",
    /^data:image\/svg\+xml/,
  );
});

test("credits TMDB as required by its terms", async ({ page }) => {
  await openGlobe(page, { catalogue: fixture });
  await page.getByRole("button", { name: "About & credits" }).click();
  const credit = page.getByTestId("tmdb-credit");
  await expect(credit).toContainText(
    "This product uses the TMDB API but is not endorsed or certified by TMDB.",
  );
  await expect(credit.getByRole("img", { name: "TMDB" })).toBeVisible();
  await expect(credit).toContainText("3 films");
  await expect(credit).toContainText("fetched 11 November 2026");
});

test.describe("small places", () => {
  const withPlaces = {
    catalogue: {
      source: "TMDB",
      generatedAt: "2026-11-11T12:00:00.000Z",
      films: [
        film({
          id: "843",
          title: "In the Mood for Love",
          year: 2000,
          origin: ["HK"],
          countries: ["HK", "FR"],
          votes: 3000,
        }),
        film({
          id: "25237",
          title: "Come and See",
          year: 1985,
          origin: ["SU"],
          countries: ["SU"],
          votes: 2000,
        }),
        film({
          id: "194",
          title: "Amélie",
          year: 2001,
          origin: ["FR"],
          countries: ["FR", "DE"],
          votes: 12000,
        }),
      ],
    },
  };

  test("a place without a map shape gets a disc you can click", async ({ page }) => {
    await openGlobe(page, { catalogue: withPlaces, posters: false });
    const { x, y } = await aimAt(page, 22.437, 114.108, 0.4); // Hong Kong, close up
    await press(page, x, y);
    await expect(panel(page)).toHaveText("Hong Kong");
    await expect(page.getByRole("list", { name: "Films from Hong Kong" })).toHaveText(
      /In the Mood for Love/,
    );
  });

  test("historical states are labelled as such and linkable", async ({ page }) => {
    await openGlobe(page, { catalogue: withPlaces, query: "/?country=SU" });
    await expect(panel(page)).toHaveText("Soviet Union");
    await expect(page.getByTestId("country-info")).toContainText("Historical state, 1922–1991");
    await expect(page.getByRole("list", { name: "Films from Soviet Union" })).toHaveText(
      /Come and See/,
    );
  });

  test("places with no films aren't drawn", async ({ page }) => {
    await openGlobe(page, { catalogue: withPlaces, query: "/?country=MC" });
    await expect(page.getByTestId("not-found")).toContainText("No country matches “MC”");
  });
});
