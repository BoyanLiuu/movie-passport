// Places TMDB uses as film countries that the 1:110m map has no shape for (Hong Kong, Malta,
// the Soviet Union…). Each becomes a small disc-shaped Country, so clicking, hovering, focusing,
// poster pins, search and links all work unchanged. Data: src/data/places.json
// (scripts/prepare-places.mjs).

import placesData from "@/data/places.json";
import { angularDistance, type Country, countryBounds, type Position } from "./countries";

export type Place = {
  iso2: string;
  id: string;
  name: string;
  formalName: string;
  continent: string;
  lat: number;
  lng: number;
  note?: string;
};

export const PLACES: Place[] = placesData.places;

/** Old or alternative codes TMDB uses, mapped to the code the map knows (Burma -> Myanmar). */
export const COUNTRY_ALIASES: Readonly<Record<string, string>> = placesData.aliases;

/**
 * Disc radius in degrees, at most 0.25° and at most 45% of the gap to the nearest other place, so
 * neighbours (Hong Kong and Macao; Anguilla and Saint-Barthélemy) never overlap.
 */
export const PLACE_RADIUS_DEG = 0.25;
export const placeRadius = (place: Place, places: Place[] = PLACES) => {
  const nearest = Math.min(
    ...places
      .filter((p) => p !== place)
      .map((p) => angularDistance(place.lat, place.lng, p.lat, p.lng)),
  );
  return Math.min(PLACE_RADIUS_DEG, nearest * 0.45);
};
const SIDES = 20;

/**
 * A closed ring approximating a circle around a point, wound clockwise like Natural Earth's
 * shapes. (The globe reads rings the spherical way: wound the other way, a disc would mean
 * "everything except this disc" and cover the whole planet.)
 */
export const discRing = (lat: number, lng: number, radius = PLACE_RADIUS_DEG): Position[] => {
  const cosLat = Math.max(0.05, Math.cos((lat * Math.PI) / 180));
  const ring = Array.from({ length: SIDES }, (_, i): Position => {
    const angle = -(i / SIDES) * 2 * Math.PI;
    return [lng + (radius * Math.cos(angle)) / cosLat, lat + radius * Math.sin(angle)];
  });
  return [...ring, ring[0]];
};

export const placeToCountry = (place: Place, radius = PLACE_RADIUS_DEG): Country => {
  const geometry = {
    type: "Polygon" as const,
    coordinates: [discRing(place.lat, place.lng, radius)],
  };
  return {
    id: place.id,
    iso2: place.iso2,
    iso3: place.id,
    name: place.name,
    formalName: place.formalName,
    continent: place.continent,
    labelLat: place.lat,
    labelLng: place.lng,
    geometry,
    bounds: countryBounds(geometry, place.lat, place.lng),
    kind: "place",
    ...(place.note ? { note: place.note } : {}),
  };
};

export const PLACE_COUNTRIES: Country[] = PLACES.map((p) => placeToCountry(p, placeRadius(p)));

/** A film's country codes with aliases resolved and duplicates removed. */
export const normalizeCountryCodes = (codes: string[]) => [
  ...new Set(codes.map((code) => COUNTRY_ALIASES[code] ?? code)),
];
