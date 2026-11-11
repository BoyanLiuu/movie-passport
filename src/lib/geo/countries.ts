// Country data as the app uses it, derived from the stripped Natural Earth GeoJSON in
// public/data/countries-110m.geojson (see scripts/prepare-countries.mjs).

/** [longitude, latitude], GeoJSON order. */
export type Position = [number, number];
type Ring = Position[];
type PolygonCoordinates = Ring[];

export type CountryGeometry =
  | { type: "Polygon"; coordinates: PolygonCoordinates }
  | { type: "MultiPolygon"; coordinates: PolygonCoordinates[] };

export type CountryProperties = {
  /** Natural Earth ADM0_A3. Always present and unique, unlike ISO codes. */
  id: string;
  iso2: string | null;
  iso3: string | null;
  name: string;
  formalName: string;
  continent: string;
  /** Natural Earth's representative label point: inside the country, away from its edges. */
  labelLat: number;
  labelLng: number;
};

export type CountryFeature = {
  type: "Feature";
  properties: CountryProperties;
  geometry: CountryGeometry;
};

export type CountryFeatureCollection = {
  type: "FeatureCollection";
  features: CountryFeature[];
};

/** The extent the camera frames when a country is selected. */
export type Bounds = {
  south: number;
  north: number;
  /** Western edge; may be greater than `east` when the country crosses the antimeridian. */
  west: number;
  east: number;
  latSpan: number;
  lngSpan: number;
};

/** A country as passed to the globe's polygon layer (which reads `geometry`). */
export type Country = CountryProperties & {
  geometry: CountryGeometry;
  bounds: Bounds;
};

/**
 * Polygons further than this from the label point are treated as overseas territories and left out
 * of the camera framing, so France frames Europe rather than Europe plus French Guiana, and the USA its contiguous states.
 */
export const FRAMING_RADIUS_DEG = 30;

const toRadians = (deg: number) => (deg * Math.PI) / 180;

export const normalizeLng = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180;

/** Great-circle distance between two points, in degrees of arc. */
export const angularDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δλ = toRadians(lng2 - lng1);
  const cos = Math.sin(φ1) * Math.sin(φ2) + Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
};

export const polygonsOf = (geometry: CountryGeometry): PolygonCoordinates[] =>
  geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

/** Mean vertex of a polygon's outer ring: good enough to tell which landmass it is. */
const ringCenter = (ring: Ring) => {
  const lngs = longitudeExtent(ring.map(([lng]) => lng));
  const lat = ring.reduce((sum, [, la]) => sum + la, 0) / ring.length;
  return { lat, lng: lngs.center };
};

/**
 * The shortest longitude interval containing every value, which may cross ±180°: Fiji's islands at
 * 178°E and 179°W span 3°, not 357°. Found by removing the largest gap between sorted longitudes.
 */
export const longitudeExtent = (lngs: number[]) => {
  const sorted = [...new Set(lngs.map(normalizeLng))].sort((a, b) => a - b);
  if (sorted.length === 0) throw new Error("longitudeExtent needs at least one longitude");

  // The wrap-around gap, from the easternmost value round to the westernmost.
  let largestGap = sorted[0] + 360 - sorted[sorted.length - 1];
  let west = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1];
    if (gap > largestGap) {
      largestGap = gap;
      west = sorted[i];
    }
  }
  const span = 360 - largestGap;
  return { west, east: normalizeLng(west + span), span, center: normalizeLng(west + span / 2) };
};

export const countryBounds = (
  geometry: CountryGeometry,
  labelLat: number,
  labelLng: number,
): Bounds => {
  const outerRings = polygonsOf(geometry).map(([outer]) => outer);
  const framed = outerRings.filter((ring) => {
    const center = ringCenter(ring);
    return angularDistance(labelLat, labelLng, center.lat, center.lng) <= FRAMING_RADIUS_DEG;
  });
  const points = (framed.length > 0 ? framed : outerRings).flat();

  const lats = points.map(([, lat]) => lat);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const lngs = longitudeExtent(points.map(([lng]) => lng));
  return {
    south,
    north,
    west: lngs.west,
    east: lngs.east,
    latSpan: north - south,
    lngSpan: lngs.span,
  };
};

/** Even-odd ray casting in lng/lat space. Natural Earth splits shapes at ±180°, so this holds. */
const ringContains = (ring: Ring, lng: number, lat: number) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

export const geometryContains = (geometry: CountryGeometry, lat: number, lng: number) => {
  const x = normalizeLng(lng);
  return polygonsOf(geometry).some(
    ([outer, ...holes]) =>
      ringContains(outer, x, lat) && !holes.some((h) => ringContains(h, x, lat)),
  );
};

/** The country under a point, or null for open ocean. Holes count: Lesotho is not South Africa. */
export const countryAt = <C extends { geometry: CountryGeometry }>(
  countries: C[],
  lat: number,
  lng: number,
): C | null => countries.find((c) => geometryContains(c.geometry, lat, lng)) ?? null;

export const toCountry = ({ properties, geometry }: CountryFeature): Country => ({
  ...properties,
  geometry,
  bounds: countryBounds(geometry, properties.labelLat, properties.labelLng),
});

export const parseCountries = (data: unknown): Country[] => {
  const collection = data as Partial<CountryFeatureCollection> | null;
  if (collection?.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
    throw new Error("Country data is not a GeoJSON FeatureCollection");
  }
  return collection.features.map(toCountry);
};
