"use client";

import { useRef } from "react";

type AboutDialogProps = {
  source: "tmdb" | "mock";
  generatedAt: string | null;
  filmCount: number;
};

/**
 * About and credits. TMDB requires its logo (an approved, unmodified version, less prominent than
 * ours) and the non-endorsement notice in an About/Credits section: docs/decisions/0002.
 */
export const AboutDialog = ({ source, generatedAt, filmCount }: AboutDialogProps) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const fetched = generatedAt
    ? new Date(generatedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="pointer-events-auto mt-2 text-xs text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none"
      >
        About &amp; credits
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="about-title"
        // Clicking the backdrop (the dialog element itself, outside its content) closes it.
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        // pointer-events-auto: the overlay it sits in ignores the pointer (so the globe drags).
        className="pointer-events-auto m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-slate-950 p-0 text-slate-300 shadow-2xl backdrop:bg-black/70"
      >
        <div className="p-6">
          <h2 id="about-title" className="font-display text-3xl text-slate-50">
            Movie Passport
          </h2>
          <p className="mt-2 text-sm">
            Travel the world through films: spin the globe, pick a country, and see what it has
            made. A non-commercial project.
          </p>

          <h3 className="mt-5 text-xs tracking-wide text-slate-500 uppercase">Film data</h3>
          {source === "tmdb" ? (
            <div className="mt-2 space-y-3 text-sm" data-testid="tmdb-credit">
              {/* eslint-disable-next-line @next/next/no-img-element -- TMDB's approved logo, unmodified */}
              <img src="/brand/tmdb-logo.svg" alt="TMDB" className="h-3" />
              <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
              <p className="text-slate-400">
                {filmCount.toLocaleString("en-GB")} films and poster images from{" "}
                <a
                  href="https://www.themoviedb.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-200 underline-offset-2 hover:underline"
                >
                  The Movie Database
                </a>
                {fetched ? `, fetched ${fetched}` : ""}. Posters © their respective owners.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-400" data-testid="mock-credit">
              Showing {filmCount} hand-picked sample films with generated placeholder posters. Real
              data comes from TMDB once a catalogue has been fetched (`pnpm data:catalogue`).
            </p>
          )}

          <h3 className="mt-5 text-xs tracking-wide text-slate-500 uppercase">Map</h3>
          <p className="mt-2 text-sm text-slate-400">
            Country borders from{" "}
            <a
              href="https://www.naturalearthdata.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-200 underline-offset-2 hover:underline"
            >
              Natural Earth
            </a>{" "}
            (public domain), 1:110m.
          </p>

          <form method="dialog" className="mt-6">
            <button
              type="submit"
              className="w-full rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:border-amber-300/60 hover:bg-amber-300/10 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none"
            >
              Close
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
};
