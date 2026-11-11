// Camera viewpoints. Altitude is in globe radii above the surface, as react-globe.gl expects.
// (react-globe.gl already tweens longitude the short way round, so targets need no unwrapping.)

import type { Bounds, Country } from "./countries";

export type PointOfView = { lat: number; lng: number; altitude: number };

/** Whole globe in view, slightly tilted north where most land (and most film industries) are. */
export const GLOBAL_LAT = 20;
export const GLOBAL_ALTITUDE = 2.4;
export const INITIAL_LNG = 10;

export const MIN_FOCUS_ALTITUDE = 0.35;
export const MAX_FOCUS_ALTITUDE = 2;

export const FOCUS_DURATION_MS = 1200;
export const RESET_DURATION_MS = 1000;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Portrait screens show less longitude than latitude, so pull the camera back on them; landscape
 * screens need no correction because countries are framed by their larger extent anyway.
 */
const aspectFactor = (aspect: number) => (aspect >= 1 ? 1 : Math.min(1.6, 1 / Math.sqrt(aspect)));

/**
 * How far out the camera sits to frame a country. The extent is the larger of the latitude span and
 * the longitude span scaled by cos(latitude), i.e. roughly the country's size in degrees of arc.
 */
export const focusAltitude = (bounds: Bounds, aspect = 16 / 9) => {
  const midLat = (bounds.south + bounds.north) / 2;
  const extent = Math.max(bounds.latSpan, bounds.lngSpan * Math.cos((midLat * Math.PI) / 180));
  const altitude = (0.25 + extent / 40) * aspectFactor(aspect);
  return clamp(altitude, MIN_FOCUS_ALTITUDE, MAX_FOCUS_ALTITUDE * aspectFactor(aspect));
};

export const globalAltitude = (aspect = 16 / 9) => GLOBAL_ALTITUDE * aspectFactor(aspect);

export const initialView = (aspect?: number): PointOfView => ({
  lat: GLOBAL_LAT,
  lng: INITIAL_LNG,
  altitude: globalAltitude(aspect),
});

/** Centre on the label point (not the raw click point, which may sit on a border). */
export const focusView = (country: Country, aspect?: number): PointOfView => ({
  lat: country.labelLat,
  lng: country.labelLng,
  altitude: focusAltitude(country.bounds, aspect),
});

/** Zoom straight out above the current longitude, rather than spinning back to a fixed meridian. */
export const globalViewFrom = (
  current: Pick<PointOfView, "lng">,
  aspect?: number,
): PointOfView => ({
  lat: GLOBAL_LAT,
  lng: current.lng,
  altitude: globalAltitude(aspect),
});
