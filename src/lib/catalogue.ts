// Country-level views of the film catalogue: which films belong to a country, simple stats, and
// where to go next when a country has none.

import type { Movie } from "@/data/movies";
import { angularDistance, type Country } from "@/lib/geo/countries";

/** Films per country id, best-known first. A co-production belongs to every producing country. */
export const filmsByCountry = (movies: Movie[], countries: Country[]) => {
  const idByIso2 = new Map(
    countries.flatMap((c): [string, string][] => (c.iso2 ? [[c.iso2, c.id]] : [])),
  );
  const byCountry = new Map<string, Movie[]>();
  for (const movie of movies) {
    for (const code of movie.countries) {
      const id = idByIso2.get(code);
      if (!id) continue;
      const list = byCountry.get(id) ?? [];
      list.push(movie);
      byCountry.set(id, list);
    }
  }
  for (const list of byCountry.values()) {
    list.sort((a, b) => b.rank - a.rank || a.title.localeCompare(b.title));
  }
  return byCountry;
};

/**
 * A country's films split into those whose main country it is ("From") and those it helped make.
 * TMDB lists several origin countries for about half of all films; only the first one on the map
 * (`home`) makes a film "from" a country, so a US–French Terminator 2 is from the US and a French
 * co-production.
 */
export const splitByOrigin = (films: Movie[], iso2: string | null) => ({
  from: films.filter((f) => iso2 !== null && f.home === iso2),
  coProduced: films.filter((f) => iso2 === null || f.home !== iso2),
});

export const decadeOf = (year: number) => Math.floor(year / 10) * 10;

export type CountryStats = {
  films: number;
  /** First and last decade, e.g. 1950 and 2010. */
  firstDecade: number | null;
  lastDecade: number | null;
  /** Films made with at least one other country. */
  coProductions: number;
};

export const countryStats = (films: Movie[]): CountryStats => {
  const decades = films.map((f) => decadeOf(f.year));
  return {
    films: films.length,
    firstDecade: decades.length ? Math.min(...decades) : null,
    lastDecade: decades.length ? Math.max(...decades) : null,
    coProductions: films.filter((f) => f.countries.length > 1).length,
  };
};

export const decadeRangeLabel = ({ firstDecade, lastDecade }: CountryStats) => {
  if (firstDecade === null || lastDecade === null) return null;
  return firstDecade === lastDecade ? `${firstDecade}s` : `${firstDecade}s–${lastDecade}s`;
};

/** The closest countries (by label point) that do have films: the empty state's way onward. */
export const nearestCountriesWithFilms = (
  country: Country,
  countries: Country[],
  films: Map<string, Movie[]>,
  limit = 3,
) =>
  countries
    .filter((c) => c.id !== country.id && (films.get(c.id)?.length ?? 0) > 0)
    .map((c) => ({
      country: c,
      distance: angularDistance(country.labelLat, country.labelLng, c.labelLat, c.labelLng),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ country: c }) => c);

export const filmCountLabel = (count: number) =>
  count === 0 ? "No films yet" : count === 1 ? "1 film" : `${count} films`;
