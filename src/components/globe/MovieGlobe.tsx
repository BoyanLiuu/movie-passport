"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DebugPanel } from "@/components/debug/DebugPanel";
import { SearchBox } from "@/components/search/SearchBox";
import { MOCK_MOVIES, type Movie } from "@/data/movies";
import { useCountries } from "@/hooks/useCountries";
import { usePanelOffset } from "@/hooks/usePanelOffset";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { navigateToSearch, useSearchString } from "@/hooks/useSearchParams";
import { countryStats, filmsByCountry, nearestCountriesWithFilms } from "@/lib/catalogue";
import { parseDebugOptions } from "@/lib/debug";
import { type FocusTarget, focusView, movieView } from "@/lib/geo/camera";
import type { Country } from "@/lib/geo/countries";
import {
  GLOBAL_MODE,
  type GlobeMode,
  modeFromSearch,
  searchForMode,
  searchWithoutSelection,
} from "@/lib/navigation";
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

const EMPTY_FILMS: Movie[] = [];

/** Moves keyboard focus to a panel heading once it has rendered (after a search pick). */
const focusPanelHeading = () =>
  requestAnimationFrame(() =>
    document.querySelector<HTMLElement>("#country-info-title, #movie-info-title")?.focus(),
  );

export const MovieGlobe = () => {
  const { state, retry } = useCountries();
  const reducedMotion = usePrefersReducedMotion();
  const search = useSearchString();
  const debug = parseDebugOptions(search);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pointedMovieId, setPointedMovieId] = useState<string | null>(null);
  // The open panel, measured so the globe can slide its centre out from under it.
  const [panel, setPanel] = useState<HTMLElement | null>(null);
  const [topOverlay, setTopOverlay] = useState<HTMLElement | null>(null);
  const viewOffset = usePanelOffset(panel, topOverlay);

  const countries = useMemo(() => (state.status === "ready" ? state.countries : []), [state]);
  const movies = useMemo(
    () => (debug.posters === null ? MOCK_MOVIES : stressPosters(MOCK_MOVIES, debug.posters)),
    [debug.posters],
  );
  const movieIds = useMemo(() => new Set(movies.map((m) => m.id)), [movies]);
  const countryByIso2 = useMemo(
    () => new Map(countries.flatMap((c): [string, Country][] => (c.iso2 ? [[c.iso2, c]] : []))),
    [countries],
  );
  const countryNames = useCallback(
    (codes: string[]) => codes.flatMap((code) => countryByIso2.get(code)?.name ?? []),
    [countryByIso2],
  );
  // The catalogue's films, not stress-test copies, decide which countries "have films".
  const films = useMemo(() => filmsByCountry(MOCK_MOVIES, countries), [countries]);
  const filmCounts = useMemo(
    () => new Map([...films].map(([id, list]) => [id, list.length])),
    [films],
  );

  // The URL is the source of truth for what is selected; until the map has loaded, show the globe.
  const { mode, notFound } = useMemo(
    () =>
      state.status === "ready"
        ? modeFromSearch(search, countries, movieIds)
        : { mode: GLOBAL_MODE, notFound: null },
    [state.status, search, countries, movieIds],
  );
  const go = useCallback(
    (next: GlobeMode) => navigateToSearch(searchForMode(next, window.location.search, countries)),
    [countries],
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
    () => (selectedMovie?.countries ?? []).flatMap((code) => countryByIso2.get(code) ?? []),
    [selectedMovie, countryByIso2],
  );
  const countryFilms = selectedCountry ? (films.get(selectedCountry.id) ?? EMPTY_FILMS) : null;

  const highlightedIds = useMemo(
    () => (selectedCountry ? [selectedCountry.id] : movieCountries.map((c) => c.id)),
    [selectedCountry, movieCountries],
  );
  const focusMovieIds = useMemo(() => countryFilms?.map((f) => f.id) ?? null, [countryFilms]);
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
    (countryId: string) => go({ kind: "country", countryId }),
    [go],
  );
  const selectMovie = useCallback((movieId: string) => go({ kind: "movie", movieId }), [go]);
  const reset = useCallback(() => go(GLOBAL_MODE), [go]);
  const dismissNotFound = useCallback(
    () => navigateToSearch(searchWithoutSelection(window.location.search), { replace: true }),
    [],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // The search box handles (and prevents) its own Escape.
      if (event.key === "Escape" && !event.defaultPrevented) reset();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [reset]);

  const partnersOf = useCallback(
    (movie: Movie) =>
      countryNames(movie.countries.filter((code) => code !== selectedCountry?.iso2)),
    [countryNames, selectedCountry],
  );

  const announcement = selectedCountry
    ? `${selectedCountry.name} selected, ${countryFilms?.length ?? 0} films. Press Escape to return to the globe.`
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
            filmCounts={filmCounts}
            movies={movies}
            focusMovieIds={focusMovieIds}
            selectedMovieId={selectedMovie?.id ?? null}
            linkedMovieId={pointedMovieId}
            viewOffset={viewOffset}
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

        {state.status === "ready" && (
          <div
            ref={setTopOverlay}
            className="absolute inset-x-3 top-24 sm:inset-x-auto sm:left-6 sm:w-96 lg:top-6 lg:left-1/2 lg:-translate-x-1/2"
          >
            <SearchBox
              countries={countries}
              movies={MOCK_MOVIES}
              filmCounts={filmCounts}
              countryNames={countryNames}
              onSelectCountry={(id) => {
                selectCountry(id);
                focusPanelHeading();
              }}
              onSelectMovie={(id) => {
                selectMovie(id);
                focusPanelHeading();
              }}
            />
            {notFound && (
              <p
                role="status"
                data-testid="not-found"
                className="pointer-events-auto mt-2 flex items-center justify-between gap-3 rounded-xl border border-amber-300/30 bg-slate-950/85 px-4 py-2 text-sm text-slate-200 backdrop-blur"
              >
                <span>
                  No {notFound.param === "film" ? "film" : "country"} matches “{notFound.value}”.
                  Showing the whole globe.
                </span>
                <button
                  type="button"
                  onClick={dismissNotFound}
                  className="shrink-0 text-amber-200 underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none"
                >
                  Dismiss
                </button>
              </p>
            )}
          </div>
        )}

        {selectedCountry && countryFilms && (
          <CountryInfo
            key={selectedCountry.id}
            ref={setPanel}
            country={selectedCountry}
            films={countryFilms}
            stats={countryStats(countryFilms)}
            nearby={
              countryFilms.length === 0
                ? nearestCountriesWithFilms(selectedCountry, countries, films)
                : []
            }
            partnersOf={partnersOf}
            onSelectMovie={selectMovie}
            onSelectCountry={selectCountry}
            onPointAtMovie={setPointedMovieId}
            onReset={reset}
          />
        )}
        {selectedMovie && (
          <MovieInfo
            key={selectedMovie.id}
            ref={setPanel}
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
            <span className="mt-1 block text-slate-600">Warmer countries have films</span>
          </p>
        )}

        {debug.panel && <DebugPanel options={debug} posterCount={movies.length} />}
      </div>

      <p className="sr-only" aria-live="polite" data-testid="announcer">
        {announcement}
      </p>
    </div>
  );
};
