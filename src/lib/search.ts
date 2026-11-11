// Search across countries and films. Case- and accent-insensitive ("cote" finds Côte d'Ivoire,
// "amelie" finds Amélie); prefix matches rank above matches inside a word.

import type { Movie } from "@/data/movies";
import type { Country } from "@/lib/geo/countries";

export const normalizeText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

/** 0 = starts with the query, 1 = a word starts with it, 2 = contains it; null = no match. */
const matchRank = (text: string | null | undefined, query: string) => {
  if (!text) return null;
  const t = normalizeText(text);
  if (t.startsWith(query)) return 0;
  if (t.split(/[^\p{L}\p{N}]+/u).some((word) => word.startsWith(query))) return 1;
  if (t.includes(query)) return 2;
  return null;
};

const best = (...ranks: (number | null)[]) => {
  const found = ranks.filter((r): r is number => r !== null);
  return found.length ? Math.min(...found) : null;
};

const rankAndTrim = <T>(items: { item: T; rank: number; name: string }[], limit: number) =>
  items
    .sort(
      (a, b) => a.rank - b.rank || a.name.length - b.name.length || a.name.localeCompare(b.name),
    )
    .slice(0, limit)
    .map(({ item }) => item);

export type SearchResults = { countries: Country[]; movies: Movie[] };

export const searchCatalogue = (
  query: string,
  countries: Country[],
  movies: Movie[],
  limit = 5,
): SearchResults => {
  const q = normalizeText(query);
  if (!q) return { countries: [], movies: [] };

  const countryHits = countries.flatMap((c) => {
    // An exact ISO code ("fr", "jpn") is as good as a name prefix.
    const code = q === c.iso2?.toLowerCase() || q === c.iso3?.toLowerCase() ? 0 : null;
    const rank = best(code, matchRank(c.name, q), matchRank(c.formalName, q));
    return rank === null ? [] : [{ item: c, rank, name: c.name }];
  });

  const movieHits = movies.flatMap((m) => {
    const director = matchRank(m.director, q);
    const rank = best(
      matchRank(m.title, q),
      matchRank(m.originalTitle, q),
      director === null ? null : director + 1, // a director match ranks just below a title match
    );
    return rank === null ? [] : [{ item: m, rank, name: m.title }];
  });

  return { countries: rankAndTrim(countryHits, limit), movies: rankAndTrim(movieHits, limit) };
};
