"use client";

import { useEffect, useState } from "react";
import { detailsUrl, type FilmDetails, parseFilmDetails } from "@/lib/data/filmDetails";

export type FilmDetailsState =
  | { status: "loading" }
  | { status: "ready"; details: FilmDetails }
  /** No details file: a sample film, or the catalogue was fetched before M5. */
  | { status: "missing" };

/** Loads one film's details file when the sheet opens. */
export const useFilmDetails = (movieId: string | null): FilmDetailsState => {
  const [loaded, setLoaded] = useState<{ id: string; state: FilmDetailsState } | null>(null);

  useEffect(() => {
    const url = movieId && detailsUrl(movieId);
    if (!movieId || !url) return;
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: unknown) => {
        const state: FilmDetailsState = data
          ? { status: "ready", details: parseFilmDetails(data) }
          : { status: "missing" };
        setLoaded({ id: movieId, state });
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoaded({ id: movieId, state: { status: "missing" } });
      });
    return () => controller.abort();
  }, [movieId]);

  if (!movieId || !detailsUrl(movieId)) return { status: "missing" };
  return loaded?.id === movieId ? loaded.state : { status: "loading" };
};
