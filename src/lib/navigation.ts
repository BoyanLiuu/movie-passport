// What is selected lives in the URL, so Back/Forward and shared links work:
//   /                    the whole globe (Mode A)
//   /?country=FR         one country (Mode B); ISO alpha-2, or Natural Earth's id when a country has none
//   /?film=amelie        one film
//   /?film=194&details   one film with its details sheet open
// Other parameters (e.g. `debug`) are left untouched.

import type { Country } from "@/lib/geo/countries";

export type GlobeMode =
  | { kind: "global" }
  | { kind: "country"; countryId: string }
  | { kind: "movie"; movieId: string; details?: boolean };

export const GLOBAL_MODE: GlobeMode = { kind: "global" };

const COUNTRY = "country";
const FILM = "film";
const DETAILS = "details";

/** The URL value for a country: its ISO alpha-2 code, or its Natural Earth id (e.g. N. Cyprus). */
export const countryParam = (country: Pick<Country, "id" | "iso2">) => country.iso2 ?? country.id;

export type ParsedMode = {
  mode: GlobeMode;
  /** The URL named a country or film that doesn't exist: shown as a notice, with a global view. */
  notFound: { param: "country" | "film"; value: string } | null;
};

export const modeFromSearch = (
  search: string,
  countries: Pick<Country, "id" | "iso2">[],
  movieIds: ReadonlySet<string>,
): ParsedMode => {
  const params = new URLSearchParams(search);

  const film = params.get(FILM)?.trim();
  if (film) {
    if (!movieIds.has(film)) return { mode: GLOBAL_MODE, notFound: { param: FILM, value: film } };
    return params.has(DETAILS)
      ? { mode: { kind: "movie", movieId: film, details: true }, notFound: null }
      : { mode: { kind: "movie", movieId: film }, notFound: null };
  }

  const code = params.get(COUNTRY)?.trim();
  if (code) {
    const upper = code.toUpperCase();
    const country =
      countries.find((c) => c.iso2 === upper) ?? countries.find((c) => c.id === upper);
    return country
      ? { mode: { kind: "country", countryId: country.id }, notFound: null }
      : { mode: GLOBAL_MODE, notFound: { param: COUNTRY, value: code } };
  }

  return { mode: GLOBAL_MODE, notFound: null };
};

/** The query string for a mode, keeping every unrelated parameter of `currentSearch`. */
export const searchForMode = (
  mode: GlobeMode,
  currentSearch: string,
  countries: Pick<Country, "id" | "iso2">[],
) => {
  const params = new URLSearchParams(currentSearch);
  params.delete(COUNTRY);
  params.delete(FILM);
  params.delete(DETAILS);
  if (mode.kind === "country") {
    const country = countries.find((c) => c.id === mode.countryId);
    if (country) params.set(COUNTRY, countryParam(country));
  } else if (mode.kind === "movie") {
    params.set(FILM, mode.movieId);
  }
  // A bare flag ("&details"), not "details=".
  const query = params.toString() + (mode.kind === "movie" && mode.details ? `&${DETAILS}` : "");
  return query ? `?${query.replace(/^&/, "")}` : "";
};

/** The query string with the selection removed (used to dismiss a not-found notice). */
export const searchWithoutSelection = (currentSearch: string) =>
  searchForMode(GLOBAL_MODE, currentSearch, []);
