"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DebugPanel } from "@/components/debug/DebugPanel";
import { SearchBox } from "@/components/search/SearchBox";
import { MOCK_MOVIES, type Movie } from "@/data/movies";
import { AboutDialog } from "@/components/AboutDialog";
import { useCatalogue, useOverview } from "@/hooks/useCatalogue";
import { useCountries } from "@/hooks/useCountries";
import { usePanelOffset } from "@/hooks/usePanelOffset";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { navigateToSearch, useSearchString } from "@/hooks/useSearchParams";
import {
  countryStats,
  filmsByCountry,
  nearestCountriesWithFilms,
  splitByOrigin,
} from "@/lib/catalogue";
import { parseDebugOptions } from "@/lib/debug";
import { type FocusTarget, focusView, movieView } from "@/lib/geo/camera";
import type { Country } from "@/lib/geo/countries";
import { PLACE_COUNTRIES } from "@/lib/geo/places";
import {
  GLOBAL_MODE,
  type GlobeMode,
  modeFromSearch,
  searchForMode,
  searchWithoutSelection,
} from "@/lib/navigation";
import { stressPosters } from "@/lib/movies/posters";
import { FilmDetailsSheet } from "@/components/details/FilmDetailsSheet";
import { panelFrame } from "@/components/ui/plate";
import { CountryInfo } from "./CountryInfo";
import { PlateGauge } from "./PlateGauge";
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

  // Small places (Hong Kong, Malta, the Soviet Union…) come first: where a disc sits on a bigger
  // shape, the disc wins the click and is the film's home.
  const pinnable = useMemo(
    () => (state.status === "ready" ? [...PLACE_COUNTRIES, ...state.countries] : null),
    [state],
  );
  const catalogue = useCatalogue(pinnable);
  const ready = state.status === "ready" && catalogue.status === "ready";
  // The real (or sample) catalogue: decides which countries have films, and what search finds.
  const catalogueMovies = catalogue.status === "ready" ? catalogue.movies : EMPTY_FILMS;
  // Every map country, plus the small places that actually have films (no empty dots).
  const countries = useMemo(() => {
    if (state.status !== "ready") return [];
    const used = new Set(catalogueMovies.flatMap((m) => m.countries));
    return [...PLACE_COUNTRIES.filter((p) => p.iso2 && used.has(p.iso2)), ...state.countries];
  }, [state, catalogueMovies]);
  // What the globe draws: the catalogue, or stress-test copies of it from the debug panel.
  const movies = useMemo(
    () =>
      debug.posters === null
        ? catalogueMovies
        : stressPosters(catalogueMovies.length ? catalogueMovies : MOCK_MOVIES, debug.posters),
    [debug.posters, catalogueMovies],
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
  const films = useMemo(
    () => filmsByCountry(catalogueMovies, countries),
    [catalogueMovies, countries],
  );
  const filmCounts = useMemo(
    () => new Map([...films].map(([id, list]) => [id, list.length])),
    [films],
  );

  // The URL is the source of truth for what is selected; until the map and the films have loaded,
  // show the globe (so a deep link isn't reported as "not found" while the catalogue loads).
  const { mode, notFound } = useMemo(
    () =>
      ready ? modeFromSearch(search, countries, movieIds) : { mode: GLOBAL_MODE, notFound: null },
    [ready, search, countries, movieIds],
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
  const movieFrom = useMemo(
    () => movieCountries.filter((c) => c.iso2 && selectedMovie?.origin.includes(c.iso2)),
    [movieCountries, selectedMovie],
  );
  const movieCoProduced = useMemo(
    () => movieCountries.filter((c) => !movieFrom.includes(c)),
    [movieCountries, movieFrom],
  );
  const overview = useOverview(
    selectedMovie?.id ?? null,
    catalogue.status === "ready" && catalogue.source === "tmdb",
  );
  const countryFilms = selectedCountry ? (films.get(selectedCountry.id) ?? EMPTY_FILMS) : null;
  const countrySplit = useMemo(
    () => (countryFilms ? splitByOrigin(countryFilms, selectedCountry?.iso2 ?? null) : null),
    [countryFilms, selectedCountry],
  );

  const highlightedIds = useMemo(
    () => (selectedCountry ? [selectedCountry.id] : movieCountries.map((c) => c.id)),
    [selectedCountry, movieCountries],
  );
  // Country view keeps posters only for films *from* the country: co-productions are pinned in
  // their own home countries, so drawing them would scatter posters across the region.
  const focusMovieIds = useMemo(() => countrySplit?.from.map((f) => f.id) ?? null, [countrySplit]);
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

  // The details sheet is part of the URL (`&details`). Opened from the app it pushes a history
  // entry, so closing goes back to it; opened from a shared link, closing replaces the URL instead
  // (going back would leave the site).
  const detailsPushed = useRef(false);
  const detailsOpen = mode.kind === "movie" && !!mode.details && !!selectedMovie?.tmdbId;
  useEffect(() => {
    if (!detailsOpen) detailsPushed.current = false;
  }, [detailsOpen]);
  const openDetails = useCallback(
    (movieId: string) => {
      detailsPushed.current = true;
      go({ kind: "movie", movieId, details: true });
    },
    [go],
  );
  const closeDetails = useCallback(() => {
    if (detailsPushed.current) {
      detailsPushed.current = false;
      window.history.back();
    } else if (selectedMovie) {
      navigateToSearch(
        searchForMode(
          { kind: "movie", movieId: selectedMovie.id },
          window.location.search,
          countries,
        ),
        { replace: true },
      );
    }
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>("[data-more-details]")?.focus(),
    );
  }, [selectedMovie, countries]);
  const moreFromHome = useMemo(
    () =>
      selectedMovie
        ? catalogueMovies
            .filter((m) => m.home === selectedMovie.home && m.id !== selectedMovie.id)
            .slice(0, 10)
        : EMPTY_FILMS,
    [selectedMovie, catalogueMovies],
  );
  const catalogueIds = useMemo(() => new Set(catalogueMovies.map((m) => m.id)), [catalogueMovies]);
  const homeCountry = selectedMovie ? (countryByIso2.get(selectedMovie.home) ?? null) : null;

  // Light follows attention: the plate brightens faintly under the pointer (CSS: .attention-light).
  useEffect(() => {
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame || event.pointerType !== "mouse") return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        document.documentElement.style.setProperty("--mx", `${event.clientX}px`);
        document.documentElement.style.setProperty("--my", `${event.clientY}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);
  const reset = useCallback(() => go(GLOBAL_MODE), [go]);
  const dismissNotFound = useCallback(
    () => navigateToSearch(searchWithoutSelection(window.location.search), { replace: true }),
    [],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // The search box handles (and prevents) its own Escape; an open dialog handles its own too.
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector("dialog[open]")) return;
      reset();
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
            paused={detailsOpen}
            reducedMotion={reducedMotion}
            onHover={setHoveredId}
            onSelectCountry={selectCountry}
            onSelectMovie={selectMovie}
          />
        </GlobeErrorBoundary>
      )}

      <div aria-hidden className="attention-light pointer-events-none absolute inset-0" />

      {/* Overlay: the wrapper ignores the pointer so the globe stays draggable underneath. */}
      <div className="pointer-events-none absolute inset-0">
        {/* Phones: a velvet band behind the mark and search, so prints never cross them. */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-56 bg-[linear-gradient(to_bottom,var(--color-velvet)_0%,var(--color-velvet)_70%,transparent_100%)] sm:hidden"
        />
        <header className="absolute top-5 left-5 sm:top-7 sm:left-7">
          <h1 className="font-display text-[19px] font-medium tracking-[0.34em] text-silver-bright uppercase sm:text-[22px]">
            Movie Passport
          </h1>
          <p className="mt-1.5 font-serif text-[15px] text-pewter italic">
            Travel the world through films.
          </p>
          {catalogue.status === "ready" && (
            <AboutDialog
              source={catalogue.source}
              generatedAt={catalogue.generatedAt}
              filmCount={catalogue.movies.length}
            />
          )}
        </header>

        {state.status === "ready" && (
          <div
            ref={setTopOverlay}
            className="absolute inset-x-3 top-32 sm:inset-x-auto sm:left-6 sm:w-96 lg:top-6 lg:left-1/2 lg:-translate-x-1/2"
          >
            <SearchBox
              countries={countries}
              movies={catalogueMovies}
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
                className={`${panelFrame} pointer-events-auto mt-2 flex items-center justify-between gap-3 px-4 py-2.5 font-serif text-sm text-silver`}
              >
                <span>
                  No {notFound.param === "film" ? "film" : "country"} matches “{notFound.value}”.
                  Showing the whole globe.
                </span>
                <button
                  type="button"
                  onClick={dismissNotFound}
                  className="engraved min-h-9 shrink-0 px-2 text-[10px] text-silver-bright underline decoration-pewter/60 hover:decoration-silver"
                >
                  Dismiss
                </button>
              </p>
            )}
          </div>
        )}

        {selectedCountry && countryFilms && countrySplit && (
          <CountryInfo
            key={selectedCountry.id}
            ref={setPanel}
            country={selectedCountry}
            from={countrySplit.from}
            coProduced={countrySplit.coProduced}
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
            from={movieFrom}
            coProduced={movieCoProduced}
            overview={overview}
            onOpenDetails={selectedMovie.tmdbId ? () => openDetails(selectedMovie.id) : undefined}
            onSelectCountry={selectCountry}
            onReset={reset}
          />
        )}
        {/* The engraved caption on the plate's lower margin: what to do next. */}
        {mode.kind === "global" && state.status === "ready" && (
          <div className="absolute inset-x-0 bottom-6 px-6 text-center sm:bottom-8">
            <p className="engraved text-[12px] text-silver sm:text-[13px]">
              Silver countries have films
            </p>
            <p className="mt-2 font-serif text-[14px] text-pewter italic">
              <span className="pointer-coarse:hidden">
                Drag to rotate · Scroll to zoom · Click a country or a poster
              </span>
              <span className="hidden pointer-coarse:inline">
                Drag to rotate · Pinch to zoom · Tap a country or a poster
              </span>
            </p>
          </div>
        )}

        {ready && (
          <PlateGauge
            depth={detailsOpen ? 3 : selectedMovie ? 2 : selectedCountry ? 1 : 0}
            countryName={
              selectedCountry?.name ?? (selectedMovie ? homeCountry?.name : null) ?? null
            }
            filmTitle={selectedMovie?.title ?? null}
            onWorld={reset}
            onCountry={homeCountry ? () => selectCountry(homeCountry.id) : undefined}
            onFilm={detailsOpen ? closeDetails : undefined}
          />
        )}

        {detailsOpen && selectedMovie && (
          <FilmDetailsSheet
            // Distinct from the MovieInfo card's key: they are siblings.
            key={`details-${selectedMovie.id}`}
            movie={selectedMovie}
            countries={[...movieFrom, ...movieCoProduced]}
            moreFromHome={moreFromHome}
            homeName={countryByIso2.get(selectedMovie.home)?.name ?? null}
            catalogueIds={catalogueIds}
            onClose={closeDetails}
            onSelectCountry={selectCountry}
            onOpenFilm={openDetails}
          />
        )}

        {debug.panel && <DebugPanel options={debug} posterCount={movies.length} />}
      </div>

      <p className="sr-only" aria-live="polite" data-testid="announcer">
        {announcement}
      </p>
    </div>
  );
};
