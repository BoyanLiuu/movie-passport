"use client";

import { useEffect, useMemo, useState } from "react";
import { MOCK_MOVIES, type Movie } from "@/data/movies";
import { CATALOGUE_URL, OVERVIEWS_URL, parseCatalogue } from "@/lib/data/tmdbCatalogue";
import type { Country } from "@/lib/geo/countries";

export type CatalogueState =
  | { status: "loading" }
  | {
      status: "ready";
      movies: Movie[];
      /** "tmdb" when the fetched catalogue loaded; "mock" without one (no token yet) or in tests. */
      source: "tmdb" | "mock";
      generatedAt: string | null;
    };

type Raw = { status: "loading" } | { status: "loaded"; data: unknown } | { status: "missing" };

const MOCK: CatalogueState = {
  status: "ready",
  movies: MOCK_MOVIES,
  source: "mock",
  generatedAt: null,
};

/** Loads the TMDB catalogue once; pins posters once the country shapes are available. */
export const useCatalogue = (countries: Country[] | null): CatalogueState => {
  const [raw, setRaw] = useState<Raw>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch(CATALOGUE_URL, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: unknown) => setRaw(data ? { status: "loaded", data } : { status: "missing" }))
      .catch(() => {
        if (!controller.signal.aborted) setRaw({ status: "missing" });
      });
    return () => controller.abort();
  }, []);

  return useMemo(() => {
    if (raw.status === "loading" || !countries) return { status: "loading" };
    if (raw.status === "missing") return MOCK;
    try {
      const { movies, generatedAt } = parseCatalogue(raw.data, countries);
      return movies.length ? { status: "ready", movies, source: "tmdb", generatedAt } : MOCK;
    } catch (error) {
      console.warn("Catalogue unreadable, using the sample films instead", error);
      return MOCK;
    }
  }, [raw, countries]);
};

let overviews: Promise<Record<string, string>> | null = null;

/** Plot summaries live in their own file (half the catalogue's bytes), fetched on first use. */
const loadOverviews = () =>
  (overviews ??= fetch(OVERVIEWS_URL)
    .then((response) => (response.ok ? response.json() : {}))
    .then((data: unknown): Record<string, string> =>
      data && typeof data === "object" ? (data as Record<string, string>) : {},
    )
    .catch((): Record<string, string> => ({})));

/** A film's plot summary, or null while loading or when there is none (e.g. mock films). */
export const useOverview = (movieId: string | null, enabled: boolean) => {
  const [loaded, setLoaded] = useState<{ id: string; text: string | null } | null>(null);

  useEffect(() => {
    if (!movieId || !enabled) return;
    let current = true;
    loadOverviews().then((all) => {
      const text = all[movieId];
      if (current) setLoaded({ id: movieId, text: typeof text === "string" ? text : null });
    });
    return () => {
      current = false;
    };
  }, [movieId, enabled]);

  return loaded?.id === movieId ? loaded.text : null;
};
