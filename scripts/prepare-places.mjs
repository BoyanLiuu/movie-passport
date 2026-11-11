// Builds src/data/places.json: places TMDB uses as film countries that our 1:110m country map has
// no shape for. The app draws each as a small clickable disc (only when it has films).
//
//   pnpm data:places                     # downloads Natural Earth's tiny-countries points
//   pnpm data:places ./path/to.geojson   # uses a local copy
//
// Sources: Natural Earth 1:50m "admin 0 tiny countries" points (public domain) for small countries
// and territories; a short hand-entered list below for places Natural Earth has no point for, and
// for historical states (at their historical capitals). Old ISO codes for countries that are on the
// map are listed as aliases instead.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_tiny_countries.geojson";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MAP = resolve(root, "public/data/countries-110m.geojson");
const OUTPUT = resolve(root, "src/data/places.json");

/**
 * Codes TMDB still uses for countries that are on the map under a newer code, or that the 1:110m
 * map draws as part of a bigger shape.
 */
const ALIASES = {
  BU: "MM", // Burma -> Myanmar
  TP: "TL", // East Timor -> Timor-Leste
  ZR: "CD", // Zaire -> DR Congo
  XI: "GB", // Northern Ireland: part of the UK's shape
  GF: "FR", // French Guiana: part of France's shape at this scale
  SJ: "NO", // Svalbard & Jan Mayen: part of Norway's shape at this scale
};

/** Places Natural Earth has no tiny-country point for. Coordinates: the capital or main town. */
const EXTRA = [
  {
    iso2: "CV",
    id: "CPV",
    name: "Cape Verde",
    formalName: "Republic of Cabo Verde",
    continent: "Africa",
    lat: 14.93,
    lng: -23.51,
  },
  {
    iso2: "RE",
    id: "REU",
    name: "Réunion",
    formalName: "Réunion",
    continent: "Africa",
    lat: -21.11,
    lng: 55.53,
  },
  {
    iso2: "YT",
    id: "MYT",
    name: "Mayotte",
    formalName: "Mayotte",
    continent: "Africa",
    lat: -12.82,
    lng: 45.15,
  },
];

/**
 * States that no longer exist, at their historical capitals. Where two would sit on the same city
 * (Belgrade; Willemstad next to Curaçao) the later or smaller one is nudged so both stay clickable.
 */
const HISTORICAL = [
  {
    iso2: "SU",
    id: "SUN",
    name: "Soviet Union",
    formalName: "Union of Soviet Socialist Republics",
    continent: "Europe",
    lat: 55.75,
    lng: 37.62,
    note: "Historical state, 1922–1991",
  },
  {
    iso2: "YU",
    id: "YUG",
    name: "Yugoslavia",
    formalName: "Yugoslavia",
    continent: "Europe",
    lat: 44.82,
    lng: 20.46,
    note: "Historical state, 1918–1992",
  },
  {
    iso2: "CS",
    id: "SCG",
    name: "Serbia and Montenegro",
    formalName: "Serbia and Montenegro",
    continent: "Europe",
    lat: 44.2,
    lng: 20.9,
    note: "Historical state, 2003–2006",
  },
  {
    iso2: "XC",
    id: "CSK",
    name: "Czechoslovakia",
    formalName: "Czechoslovakia",
    continent: "Europe",
    lat: 50.08,
    lng: 14.44,
    note: "Historical state, 1918–1992",
  },
  {
    iso2: "XG",
    id: "DDR",
    name: "East Germany",
    formalName: "German Democratic Republic",
    continent: "Europe",
    lat: 52.52,
    lng: 13.4,
    note: "Historical state, 1949–1990",
  },
  {
    iso2: "AN",
    id: "ANT",
    name: "Netherlands Antilles",
    formalName: "Netherlands Antilles",
    continent: "North America",
    lat: 12.6,
    lng: -68.4,
    note: "Historical, 1954–2010",
  },
];

const code = (...candidates) =>
  candidates.find((c) => typeof c === "string" && /^[A-Z]{2}$/.test(c)) ?? null;
const round = (n) => Number(n.toFixed(3));

const loadTiny = async (path) => {
  if (path) return JSON.parse(await readFile(path, "utf8"));
  const response = await fetch(SOURCE_URL);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  return response.json();
};

const main = async () => {
  const tiny = await loadTiny(process.argv[2]);
  const mapFeatures = JSON.parse(await readFile(MAP, "utf8")).features;
  const onMap = new Set(mapFeatures.map((f) => f.properties.iso2).filter(Boolean));
  const mapIds = new Set(mapFeatures.map((f) => f.properties.id));

  const fromNaturalEarth = tiny.features.flatMap((f) => {
    const p = f.properties;
    const iso2 = code(p.ISO_A2_EH, p.ISO_A2);
    const [lng, lat] = f.geometry?.type === "Point" ? f.geometry.coordinates : [];
    if (!iso2 || onMap.has(iso2) || typeof lat !== "number" || typeof lng !== "number") return [];
    return [
      {
        iso2,
        // Territories share their sovereign's ADM0_A3 (French ones are all "FRA"): use the
        // geo-unit code, which is unique per place.
        id: p.GU_A3 || p.SU_A3 || p.ADM0_A3,
        name: p.NAME,
        formalName: p.FORMAL_EN || p.NAME,
        continent: p.CONTINENT,
        lat: round(lat),
        lng: round(lng),
      },
    ];
  });

  const places = [...fromNaturalEarth, ...EXTRA, ...HISTORICAL];
  for (const [label, list] of [
    ["iso2", places.map((p) => p.iso2)],
    ["id", places.map((p) => p.id)],
  ]) {
    const dupes = list.filter((v, i) => list.indexOf(v) !== i);
    if (dupes.length) throw new Error(`Duplicate ${label}: ${dupes.join(", ")}`);
  }
  const clash = places.find((p) => onMap.has(p.iso2) || mapIds.has(p.id));
  if (clash) throw new Error(`${clash.iso2} / ${clash.id} is already on the map`);

  places.sort((a, b) => a.iso2.localeCompare(b.iso2));
  const output = {
    source:
      "Natural Earth 1:50m admin-0 tiny countries (public domain), plus hand-entered places and historical states: scripts/prepare-places.mjs",
    aliases: ALIASES,
    places,
  };
  await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
  console.log(
    `Wrote ${places.length} places (${fromNaturalEarth.length} from Natural Earth) -> ${OUTPUT}`,
  );
};

await main();
