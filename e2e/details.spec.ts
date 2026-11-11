import { expect, test, type Page } from "@playwright/test";
import { openGlobe } from "./helpers";

const film = (over: Record<string, unknown>) => ({
  directors: ["Someone"],
  genres: ["Drama"],
  runtime: 100,
  rating: 7.5,
  poster: "/poster.jpg",
  ...over,
});
const catalogue = {
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
        genres: ["Comedy", "Romance"],
        runtime: 122,
        rating: 7.9,
      }),
      film({
        id: "5",
        title: "Another French Film",
        year: 1995,
        origin: ["FR"],
        countries: ["FR"],
        votes: 900,
      }),
    ],
  },
};
// Synthetic details in the shape scripts/fetch-catalogue.mjs writes.
const details = {
  id: "194",
  tagline: "She’ll change your life.",
  overview: "A shy waitress decides to change the lives of those around her.",
  backdrop: "/backdrop.jpg",
  releaseDate: "2001-04-25",
  status: "Released",
  originalLanguage: "fr",
  budget: 10000000,
  revenue: 173921954,
  homepage: "https://example.org/amelie",
  certifications: { US: "R", FR: "TP" },
  directors: ["Jean-Pierre Jeunet"],
  writers: [{ name: "Guillaume Laurant", jobs: ["Screenplay"] }],
  cast: [
    { name: "Audrey Tautou", character: "Amélie Poulain", photo: "/a.jpg" },
    { name: "Mathieu Kassovitz", character: "Nino Quincampoix", photo: null },
  ],
  trailer: { key: "abc123XYZ", name: "Official Trailer" },
  keywords: ["paris", "love triangle"],
  recommendations: [
    { id: "5", title: "Another French Film", year: 1995, poster: null },
    { id: "999", title: "Not In Catalogue", year: 2003, poster: "/n.jpg" },
  ],
  links: { imdb: "tt0211915", wikidata: null, facebook: null, instagram: null, twitter: null },
  watch: {
    GB: { link: null, stream: [{ id: 8, name: "Streamer UK", logo: "/8.png" }] },
    US: {
      link: null,
      stream: [{ id: 9, name: "Streamer US", logo: "/9.png" }],
      rent: [{ id: 10, name: "Rental Store", logo: "/10.png" }],
    },
  },
};

const sheet = (page: Page) => page.getByTestId("film-details");

test.use({ locale: "en-GB" });

test.beforeEach(async ({ page }) => {
  await page.route("https://image.tmdb.org/**", (route) => route.abort());
  await page.route("https://www.youtube-nocookie.com/**", (route) => route.abort());
  await page.route("**/data/films/194.json", (route) => route.fulfill({ json: details }));
  await page.route("**/data/films/5.json", (route) => route.fulfill({ status: 404 }));
});

test("More details opens the sheet with the film's full details", async ({ page }) => {
  await openGlobe(page, { catalogue, query: "/?film=194" });
  await page.getByRole("button", { name: "More details" }).click();
  await expect(sheet(page)).toBeVisible();
  await expect(page).toHaveURL(/\?film=194&details$/);

  await expect(sheet(page).getByRole("heading", { level: 2 })).toHaveText("Amélie (2001)");
  await expect(page.getByTestId("details-tagline")).toHaveText("She’ll change your life.");
  await expect(page.getByTestId("details-score")).toContainText("79%");
  await expect(page.getByTestId("details-crew")).toContainText("Jean-Pierre Jeunet");
  await expect(page.getByTestId("details-crew")).toContainText("Screenplay");
  await expect(page.getByTestId("details-cast")).toContainText("Audrey Tautou");
  await expect(page.getByTestId("details-cast")).toContainText("Nino Quincampoix");
  await expect(page.getByTestId("details-facts")).toContainText("French");
  await expect(page.getByTestId("details-facts")).toContainText("$10,000,000");
  await expect(page.getByTestId("details-facts")).toContainText("$173,921,954");
  await expect(page.getByTestId("details-keywords")).toContainText("love triangle");
  await expect(sheet(page).getByRole("link", { name: /IMDb/ })).toHaveAttribute(
    "href",
    "https://www.imdb.com/title/tt0211915/",
  );
});

test("the trailer loads only when played, from YouTube's privacy-enhanced domain", async ({
  page,
}) => {
  await openGlobe(page, { catalogue, query: "/?film=194&details" });
  const trailer = page.getByTestId("details-trailer");
  await expect(trailer.locator("iframe")).toHaveCount(0);
  await trailer.getByRole("button", { name: /Play trailer/ }).click();
  await expect(trailer.locator("iframe")).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/abc123XYZ?autoplay=1&rel=0",
  );
});

test("where to watch follows the viewer's region and credits JustWatch", async ({ page }) => {
  await openGlobe(page, { catalogue, query: "/?film=194&details" });
  const watch = page.getByTestId("details-watch");
  await expect(watch.getByRole("combobox")).toHaveValue("GB"); // from the en-GB locale
  await expect(watch).toContainText("Streamer UK");
  await watch.getByRole("combobox").selectOption("US");
  await expect(watch).toContainText("Streamer US");
  await expect(watch).toContainText("Rental Store");
  await expect(page.getByTestId("justwatch-credit")).toContainText("Data from JustWatch");
  await expect(page.getByTestId("justwatch-credit").getByRole("link")).toHaveAttribute(
    "href",
    /^https:\/\/www\.justwatch\.com\/us\/search\?q=Am%C3%A9lie$/,
  );
});

test("Escape and browser Back close the sheet but keep the film", async ({ page }) => {
  await openGlobe(page, { catalogue, query: "/?film=194" });
  await page.getByRole("button", { name: "More details" }).click();
  await expect(sheet(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet(page)).toBeHidden();
  await expect(page.locator("[data-mode]")).toHaveAttribute("data-mode", "movie");
  await expect(page).toHaveURL(/\?film=194$/);

  await page.getByRole("button", { name: "More details" }).click();
  await expect(sheet(page)).toBeVisible();
  await page.goBack();
  await expect(sheet(page)).toBeHidden();
  await expect(page.getByTestId("movie-info")).toBeVisible();
});

test("a shared details link opens the sheet; closing keeps you on the site", async ({ page }) => {
  await openGlobe(page, { catalogue, query: "/?film=194&details" });
  await expect(sheet(page)).toBeVisible();
  await sheet(page).getByRole("button", { name: "Close details" }).click();
  await expect(sheet(page)).toBeHidden();
  await expect(page).toHaveURL(/\?film=194$/);
  await expect(page.getByTestId("movie-info")).toBeVisible();
});

test("links back into the globe: countries and more films", async ({ page }) => {
  await openGlobe(page, { catalogue, query: "/?film=194&details" });
  // "More from France" opens another film's sheet (this one has no details file yet).
  await sheet(page)
    .getByRole("list", { name: "More from France" })
    .getByRole("button", { name: /Another French Film/ })
    .click();
  await expect(sheet(page).getByRole("heading", { level: 2 })).toHaveText(
    "Another French Film (1995)",
  );
  await expect(sheet(page)).toContainText("Details aren’t available for this film yet.");

  await openGlobe(page, { catalogue, query: "/?film=194&details" });
  // Similar films outside the catalogue link to TMDB.
  await expect(
    sheet(page)
      .getByRole("list", { name: "Similar films" })
      .getByRole("link", { name: /Not In Catalogue/ }),
  ).toHaveAttribute("href", "https://www.themoviedb.org/movie/999");
  // A production country flies the globe there.
  await sheet(page)
    .getByRole("button", { name: /Germany/ })
    .click();
  await expect(sheet(page)).toBeHidden();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Germany");
});

test("sample films have no details button", async ({ page }) => {
  await openGlobe(page, { query: "/?film=amelie" });
  await expect(page.getByTestId("movie-info")).toBeVisible();
  await expect(page.getByRole("button", { name: "More details" })).toHaveCount(0);
});
