"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DebugPanel } from "@/components/debug/DebugPanel";
import { MOCK_MOVIES } from "@/data/movies";
import { useCountries } from "@/hooks/useCountries";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useSearchString } from "@/hooks/useSearchParams";
import { type FocusTarget, focusView, movieView } from "@/lib/geo/camera";
import type { Country } from "@/lib/geo/countries";
import { parseDebugOptions } from "@/lib/debug";
import { stressPosters } from "@/lib/movies/posters";
import { CountryInfo } from "./CountryInfo";
import { GlobeErrorBoundary } from "./GlobeErrorBoundary";
import { GlobeStatus } from "./GlobeStatus";
import { MovieInfo } from "./MovieInfo";

// WebGL needs a browser: never render the scene on the server.
const GlobeScene = dynamic(() => import("./GlobeScene"), {
  ssr: false,
  loading: () => <GlobeStatus kind="loading" />,
});

/**
 * Mode A is the whole globe; Mode B focuses one country; a selected film focuses its poster and
 * lights up every country that produced it. One globe instance serves all three.
 */
export type GlobeMode =
  { kind: "global" } | { kind: "country"; countryId: string } | { kind: "movie"; movieId: string };

const GLOBAL: GlobeMode = { kind: "global" };

export const MovieGlobe = () => {
  const { state, retry } = useCountries();
  const reducedMotion = usePrefersReducedMotion();
  const debug = parseDebugOptions(useSearchString());
  const [mode, setMode] = useState<GlobeMode>(GLOBAL);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const countries = useMemo(() => (state.status === "ready" ? state.countries : []), [state]);
  const countryByIso2 = useMemo(
    () => new Map(countries.flatMap((c): [string, Country][] => (c.iso2 ? [[c.iso2, c]] : []))),
    [countries],
  );
  const movies = useMemo(
    () => (debug.posters === null ? MOCK_MOVIES : stressPosters(MOCK_MOVIES, debug.posters)),
    [debug.posters],
  );

  const selectedCountry = useMemo(
    () =>
      mode.kind === "country" ? (countries.find((c) => c.id === mode.countryId) ?? null) : null,
    [countries, mode],
  );
  const selectedMovie = useMemo(
    () => (mode.kind === "movie" ? (movies.find((m) => m.id === mode.movieId) ?? null) : null),
    [movies, mode],
  );
  const movieCountries = useMemo(
    () =>
      (selectedMovie?.countries ?? []).flatMap((code) => {
        const country = countryByIso2.get(code);
        return country ? [country] : [];
      }),
    [selectedMovie, countryByIso2],
  );

  const highlightedIds = useMemo(
    () => (selectedCountry ? [selectedCountry.id] : movieCountries.map((c) => c.id)),
    [selectedCountry, movieCountries],
  );
  const focus = useMemo<FocusTarget | null>(() => {
    if (selectedCountry) {
      return { key: `country:${selectedCountry.id}`, view: (a) => focusView(selectedCountry, a) };
    }
    if (selectedMovie) {
      return { key: `movie:${selectedMovie.id}`, view: (a) => movieView(selectedMovie, a) };
    }
    return null;
  }, [selectedCountry, selectedMovie]);

  const selectCountry = useCallback(
    (countryId: string) => setMode({ kind: "country", countryId }),
    [],
  );
  const selectMovie = useCallback((movieId: string) => setMode({ kind: "movie", movieId }), []);
  const reset = useCallback(() => setMode(GLOBAL), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") reset();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [reset]);

  const announcement = selectedCountry
    ? `${selectedCountry.name} selected. Press Escape to return to the globe.`
    : selectedMovie
      ? `${selectedMovie.title} (${selectedMovie.year}) selected. Press Escape to return to the globe.`
      : state.status === "ready"
        ? "Globe view."
        : "";

  return (
    <div className="relative h-full w-full" data-mode={mode.kind}>
      {state.status === "loading" && <GlobeStatus kind="loading" />}
      {state.status === "error" && (
        <GlobeStatus
          kind="error"
          title="Couldn’t load the country map"
          detail={state.message}
          onRetry={retry}
        />
      )}
      {state.status === "ready" && (
        <GlobeErrorBoundary>
          <GlobeScene
            countries={countries}
            highlightedIds={highlightedIds}
            hoveredId={hoveredId}
            focus={focus}
            movies={movies}
            selectedMovieId={selectedMovie?.id ?? null}
            posterRenderer={debug.renderer}
            capPosters={debug.cap}
            autoRotate={mode.kind === "global"}
            reducedMotion={reducedMotion}
            onHover={setHoveredId}
            onSelectCountry={selectCountry}
            onSelectMovie={selectMovie}
          />
        </GlobeErrorBoundary>
      )}

      {/* Overlay: the wrapper ignores the pointer so the globe stays draggable underneath. */}
      <div className="pointer-events-none absolute inset-0">
        <header className="absolute top-5 left-5 sm:top-6 sm:left-6">
          <h1 className="font-display text-3xl text-slate-50 sm:text-4xl">Movie Passport</h1>
          <p className="mt-1 text-sm text-slate-400">Travel the world through films.</p>
        </header>

        {selectedCountry && (
          <CountryInfo key={selectedCountry.id} country={selectedCountry} onReset={reset} />
        )}
        {selectedMovie && (
          <MovieInfo
            key={selectedMovie.id}
            movie={selectedMovie}
            countries={movieCountries}
            onSelectCountry={selectCountry}
            onReset={reset}
          />
        )}
        {mode.kind === "global" && state.status === "ready" && (
          <p className="absolute inset-x-0 bottom-6 text-center text-xs tracking-wide text-slate-500">
            <span className="pointer-coarse:hidden">
              Drag to rotate · Scroll to zoom · Click a country or a poster
            </span>
            <span className="hidden pointer-coarse:inline">
              Drag to rotate · Pinch to zoom · Tap a country or a poster
            </span>
          </p>
        )}

        {debug.enabled && <DebugPanel options={debug} posterCount={movies.length} />}
      </div>

      <p className="sr-only" aria-live="polite" data-testid="announcer">
        {announcement}
      </p>
    </div>
  );
};
