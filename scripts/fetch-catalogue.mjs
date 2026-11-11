// Builds public/data/catalogue.json from TMDB: the most-voted films from every country on our map.
//
//   pnpm data:catalogue                 # top 10 per country (needs TMDB_READ_TOKEN in .env.local)
//   pnpm data:catalogue --per-country 20
//
// The output is gitignored: TMDB's terms forbid redistributing its data, so every build fetches it
// fresh. Without the file the app falls back to the mock catalogue. See
// docs/decisions/0002-movie-data-source.md.

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { discoverIds, discoverPath, TMDB_API, toCatalogue, toFilm } from "./catalogue/tmdb.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const COUNTRIES = resolve(root, "public/data/countries-110m.geojson");
const PLACES = resolve(root, "src/data/places.json");
const OUTPUT = resolve(root, "public/data/catalogue.json");
const OVERVIEWS = resolve(root, "public/data/catalogue-overviews.json");
const CONCURRENCY = 8;
const MIN_VOTES = 10;

const { values } = parseArgs({
  options: { "per-country": { type: "string", default: "10" } },
});
const perCountry = Math.min(50, Math.max(1, Number.parseInt(values["per-country"], 10) || 10));

const token = process.env.TMDB_READ_TOKEN;
if (!token) {
  console.error(
    "TMDB_READ_TOKEN is not set. Copy .env.example to .env.local and add your TMDB API Read Access Token.",
  );
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** GET a TMDB path. Retries rate limits and transient failures; never logs the token. */
const tmdb = async (path, attempt = 1) => {
  const response = await fetch(`${TMDB_API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  if (response.status === 401)
    throw new Error("TMDB rejected the token (401). Check TMDB_READ_TOKEN.");
  if ((response.status === 429 || response.status >= 500) && attempt < 4) {
    const wait = Number(response.headers.get("retry-after")) * 1000 || 500 * 2 ** attempt;
    await sleep(wait);
    return tmdb(path, attempt + 1);
  }
  if (!response.ok) throw new Error(`TMDB ${response.status} for ${path.split("?")[0]}`);
  return response.json();
};

/** Runs `task` over `items` with a fixed number of requests in flight. */
const pool = async (items, task) => {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await task(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
};

const main = async () => {
  const started = Date.now();
  const geo = JSON.parse(await readFile(COUNTRIES, "utf8"));
  const places = JSON.parse(await readFile(PLACES, "utf8"));
  // Map countries, small places (Hong Kong, Malta…), and old codes TMDB still uses for older films
  // (Zaire, Burma…), which the app maps to today's countries.
  const codes = [
    ...new Set([
      ...geo.features.map((f) => f.properties.iso2).filter(Boolean),
      ...places.places.map((p) => p.iso2),
      ...Object.keys(places.aliases),
    ]),
  ];

  const perCountryIds = await pool(codes, async (code) =>
    discoverIds(await tmdb(discoverPath(code, MIN_VOTES)), perCountry),
  );
  const ids = [...new Set(perCountryIds.flat())];
  console.log(`Discovered ${ids.length} films across ${codes.length} countries`);

  let skipped = 0;
  const films = (
    await pool(ids, async (id) => {
      try {
        return toFilm(await tmdb(`/movie/${id}?append_to_response=credits`));
      } catch (error) {
        skipped++;
        console.warn(`  skipped ${id}: ${error.message}`);
        return null;
      }
    })
  ).filter(Boolean);

  const { catalogue, overviews } = toCatalogue(films, {
    perCountry,
    minVotes: MIN_VOTES,
    generatedAt: new Date().toISOString(),
  });
  const json = JSON.stringify(catalogue);
  await mkdir(dirname(OUTPUT), { recursive: true });
  // Write then rename, so a failed run never leaves a half-written file for the app to load.
  for (const [path, data] of [
    [OVERVIEWS, JSON.stringify(overviews)],
    [OUTPUT, json],
  ]) {
    await writeFile(`${path}.tmp`, `${data}\n`);
    await rename(`${path}.tmp`, path);
  }

  const covered = new Set(films.flatMap((f) => f.origin));
  console.log(
    `Wrote ${films.length} films (${skipped} skipped), ${covered.size} origin countries, ` +
      `${(json.length / 1024).toFixed(0)} KB in ${((Date.now() - started) / 1000).toFixed(1)} s -> ${OUTPUT}`,
  );
};

await main();
