"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCountries } from "@/hooks/useCountries";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { CountryInfo } from "./CountryInfo";
import { GlobeErrorBoundary } from "./GlobeErrorBoundary";
import { GlobeStatus } from "./GlobeStatus";

// WebGL needs a browser: never render the scene on the server.
const GlobeScene = dynamic(() => import("./GlobeScene"), {
  ssr: false,
  loading: () => <GlobeStatus kind="loading" />,
});

/** Mode A is the whole globe; Mode B focuses one country. One globe instance serves both. */
export type GlobeMode = { kind: "global" } | { kind: "country"; countryId: string };

const GLOBAL: GlobeMode = { kind: "global" };

export const MovieGlobe = () => {
  const { state, retry } = useCountries();
  const reducedMotion = usePrefersReducedMotion();
  const [mode, setMode] = useState<GlobeMode>(GLOBAL);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const countries = useMemo(() => (state.status === "ready" ? state.countries : []), [state]);
  const selectedId = mode.kind === "country" ? mode.countryId : null;
  const selected = useMemo(
    () => countries.find((c) => c.id === selectedId) ?? null,
    [countries, selectedId],
  );

  const select = useCallback((countryId: string) => setMode({ kind: "country", countryId }), []);
  const reset = useCallback(() => setMode(GLOBAL), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") reset();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [reset]);

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
            selectedId={selectedId}
            hoveredId={hoveredId}
            autoRotate={mode.kind === "global"}
            reducedMotion={reducedMotion}
            onHover={setHoveredId}
            onSelect={select}
          />
        </GlobeErrorBoundary>
      )}

      {/* Overlay: the wrapper ignores the pointer so the globe stays draggable underneath. */}
      <div className="pointer-events-none absolute inset-0">
        <header className="absolute top-5 left-5 sm:top-6 sm:left-6">
          <h1 className="font-display text-3xl text-slate-50 sm:text-4xl">Movie Passport</h1>
          <p className="mt-1 text-sm text-slate-400">Travel the world through films.</p>
        </header>

        {selected ? (
          <CountryInfo key={selected.id} country={selected} onReset={reset} />
        ) : (
          state.status === "ready" && (
            <p className="absolute inset-x-0 bottom-6 text-center text-xs tracking-wide text-slate-500">
              <span className="pointer-coarse:hidden">
                Drag to rotate · Scroll to zoom · Click a country
              </span>
              <span className="hidden pointer-coarse:inline">
                Drag to rotate · Pinch to zoom · Tap a country
              </span>
            </p>
          )
        )}
      </div>

      <p className="sr-only" aria-live="polite" data-testid="announcer">
        {selected
          ? `${selected.name} selected. Press Escape to return to the globe.`
          : state.status === "ready"
            ? "Globe view."
            : ""}
      </p>
    </div>
  );
};
