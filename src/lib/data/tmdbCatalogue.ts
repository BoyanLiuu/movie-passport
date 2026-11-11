// Turns public/data/catalogue.json (written by scripts/fetch-catalogue.mjs from TMDB) into the
// app's Movie list, pinning each poster inside the film's first origin country on the map.

import type { Movie } from "@/data/movies";
import { type Country, geometryContains, normalizeLng } from "@/lib/geo/countries";
import { normalizeCountryCodes } from "@/lib/geo/places";

export const CATALOGUE_URL = "/data/catalogue.json";
export const OVERVIEWS_URL = "/data/catalogue-overviews.json";

type CatalogueFilm = {
  id: string;
  title: string;
  originalTitle?: string;
  year: number;
  directors: string[];
  origin: string[];
  countries: string[];
  genres: string[];
  runtime: number | null;
  rating: number | null;
  votes: number;
  poster: string | null;
};

export type ParsedCatalogue = { movies: Movie[]; generatedAt: string | null };

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const toRadians = (deg: number) => (deg * Math.PI) / 180;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Where the `index`-th poster of a country stands: the first on Natural Earth's label point, the
 * rest on a sunflower spiral around it, scaled to the country's size and kept on its land.
 */
export const pinPosition = (country: Country, index: number) => {
  const origin = { lat: country.labelLat, lng: country.labelLng };
  if (index <= 0) return origin;
  const cosLat = Math.max(0.2, Math.cos(toRadians(origin.lat)));
  const size = Math.min(country.bounds.latSpan, country.bounds.lngSpan * cosLat);
  const step = clamp(size / 7, 0.3, 3);
  const angle = index * GOLDEN_ANGLE;
  for (let shrink = 1; shrink >= 0.25; shrink /= 2) {
    const radius = step * Math.sqrt(index) * shrink;
    const lat = origin.lat + radius * Math.sin(angle);
    const lng = normalizeLng(origin.lng + (radius * Math.cos(angle)) / cosLat);
    if (geometryContains(country.geometry, lat, lng)) return { lat, lng };
  }
  return origin;
};

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

const isFilm = (f: unknown): f is CatalogueFilm => {
  const film = f as Partial<CatalogueFilm> | null;
  return (
    typeof film?.id === "string" &&
    typeof film.title === "string" &&
    typeof film.year === "number" &&
    isStringArray(film.origin) &&
    isStringArray(film.countries) &&
    isStringArray(film.directors) &&
    film.countries.length > 0
  );
};

export const parseCatalogue = (data: unknown, countries: Country[]): ParsedCatalogue => {
  const root = data as { films?: unknown; generatedAt?: unknown } | null;
  if (!root || !Array.isArray(root.films)) throw new Error("Catalogue has no films array");

  const byIso2 = new Map(
    countries.flatMap((c): [string, Country][] => (c.iso2 ? [[c.iso2, c]] : [])),
  );
  const pinned = new Map<string, number>();
  // Most-voted first, so each country's best-known film takes the label point.
  const films = root.films.filter(isFilm).sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));

  const movies = films.flatMap((raw): Movie[] => {
    // Old codes (Burma, Zaire…) count as the country the map knows them as.
    const film = {
      ...raw,
      origin: normalizeCountryCodes(raw.origin),
      countries: normalizeCountryCodes(raw.countries),
    };
    const home =
      film.origin.map((c) => byIso2.get(c)).find(Boolean) ??
      film.countries.map((c) => byIso2.get(c)).find(Boolean);
    if (!home) return [];
    const index = pinned.get(home.id) ?? 0;
    pinned.set(home.id, index + 1);
    const { lat, lng } = pinPosition(home, index);
    const tmdbId = Number(film.id);
    return [
      {
        id: film.id,
        title: film.title,
        ...(film.originalTitle ? { originalTitle: film.originalTitle } : {}),
        year: film.year,
        director: film.directors.join(", "),
        origin: film.origin.length ? film.origin : [film.countries[0]],
        home: home.iso2 ?? film.countries[0],
        countries: film.countries,
        place: home.name,
        lat,
        lng,
        rank: typeof film.votes === "number" ? film.votes : 0,
        poster: typeof film.poster === "string" ? film.poster : null,
        genres: isStringArray(film.genres) ? film.genres : [],
        runtime: typeof film.runtime === "number" ? film.runtime : null,
        rating: typeof film.rating === "number" ? film.rating : null,
        ...(Number.isInteger(tmdbId) && tmdbId > 0 ? { tmdbId } : {}),
      },
    ];
  });

  return {
    movies,
    generatedAt: typeof root.generatedAt === "string" ? root.generatedAt : null,
  };
};
