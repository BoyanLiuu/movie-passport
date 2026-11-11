// Builds public/data/countries-110m.geojson from Natural Earth's 1:110m admin-0 countries
// (public domain, https://www.naturalearthdata.com/).
//
//   pnpm data:countries                 # downloads the source GeoJSON
//   pnpm data:countries ./path/to.json  # uses a local copy
//
// Keeps only the properties the app reads and rounds coordinates to 3 decimals (~100 m, far
// finer than the 1:110m source), which cuts the file from ~840 KB to ~210 KB (~75 KB gzipped).

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";
const OUTPUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../public/data/countries-110m.geojson",
);
const PRECISION = 3;

const loadSource = async (path) => {
  if (path) return JSON.parse(await readFile(path, "utf8"));
  const response = await fetch(SOURCE_URL);
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  return response.json();
};

// Natural Earth uses "-99" for "no code". The *_EH ("extended handling") columns fill in codes the
// plain columns leave empty, e.g. France and Norway have ISO_A2 = -99 but ISO_A2_EH = FR / NO.
const code = (...candidates) =>
  candidates.find((c) => typeof c === "string" && c !== "-99") ?? null;

const round = (n) => Number(n.toFixed(PRECISION));
const roundCoordinates = (coords) =>
  typeof coords[0] === "number" ? coords.map(round) : coords.map(roundCoordinates);

const toFeature = ({ properties: p, geometry }) => {
  if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") {
    throw new Error(`${p.NAME}: unexpected geometry ${geometry.type}`);
  }
  return {
    type: "Feature",
    properties: {
      id: p.ADM0_A3,
      iso2: code(p.ISO_A2_EH, p.ISO_A2),
      iso3: code(p.ISO_A3_EH, p.ISO_A3),
      name: p.NAME,
      formalName: p.FORMAL_EN || p.ADMIN,
      continent: p.CONTINENT,
      labelLat: round(p.LABEL_Y),
      labelLng: round(p.LABEL_X),
    },
    geometry: { type: geometry.type, coordinates: roundCoordinates(geometry.coordinates) },
  };
};

const main = async () => {
  const source = await loadSource(process.argv[2]);
  if (source?.type !== "FeatureCollection" || !Array.isArray(source.features)) {
    throw new Error("Source is not a GeoJSON FeatureCollection");
  }

  const features = source.features
    .map(toFeature)
    .sort((a, b) => a.properties.id.localeCompare(b.properties.id));
  const ids = new Set(features.map((f) => f.properties.id));
  if (ids.size !== features.length) throw new Error("Duplicate ADM0_A3 ids in source");

  const output = JSON.stringify({ type: "FeatureCollection", features });
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${output}\n`);
  console.log(
    `Wrote ${features.length} countries, ${(output.length / 1024).toFixed(0)} KB -> ${OUTPUT}`,
  );
};

await main();
