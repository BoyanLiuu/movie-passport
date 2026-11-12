"use client";

import { useRef } from "react";
import { engravedLabel, plateButton } from "@/components/ui/plate";

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
        className="engraved pointer-events-auto mt-3 min-h-8 text-[10px] text-pewter underline decoration-smoke underline-offset-4 hover:text-silver hover:decoration-pewter"
      >
        About &amp; credits
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="about-title"
        // Clicking the backdrop (the dialog element itself, outside its content) closes it.
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        // pointer-events-auto: the overlay it sits in ignores the pointer (so the globe drags).
        className="pointer-events-auto m-auto w-[min(30rem,calc(100vw-2rem))] border border-smoke bg-velvet-raised p-0 text-silver shadow-[0_32px_64px_-20px_rgb(0_0_0/0.95)] backdrop:bg-black/75"
      >
        <div className="p-7 font-serif text-[15px] leading-relaxed">
          <h2
            id="about-title"
            className="font-display text-2xl tracking-[0.2em] text-silver-bright uppercase"
          >
            Movie Passport
          </h2>
          <p className="mt-3">
            Travel the world through films: spin the globe, pick a country, and see what it has
            made. A non-commercial project.
          </p>

          <h3 className={`${engravedLabel} mt-6`}>Film data</h3>
          {source === "tmdb" ? (
            <div className="mt-2 space-y-3" data-testid="tmdb-credit">
              {/* eslint-disable-next-line @next/next/no-img-element -- TMDB's approved logo, unmodified */}
              <img src="/brand/tmdb-logo.svg" alt="TMDB" className="h-3" />
              <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
              <p className="text-pewter">
                {filmCount.toLocaleString("en-GB")} films and poster images from{" "}
                <a
                  href="https://www.themoviedb.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-silver underline decoration-pewter/60 hover:text-silver-bright"
                >
                  The Movie Database
                </a>
                {fetched ? `, fetched ${fetched}` : ""}. Posters © their respective owners.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-pewter" data-testid="mock-credit">
              Showing {filmCount} hand-picked sample films with generated placeholder posters. Real
              data comes from TMDB once a catalogue has been fetched (`pnpm data:catalogue`).
            </p>
          )}

          <h3 className={`${engravedLabel} mt-6`}>Map</h3>
          <p className="mt-2 text-pewter">
            Country borders from{" "}
            <a
              href="https://www.naturalearthdata.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-silver underline decoration-pewter/60 hover:text-silver-bright"
            >
              Natural Earth
            </a>{" "}
            (public domain), 1:110m.
          </p>

          <form method="dialog" className="mt-7">
            <button type="submit" className={`${plateButton} w-full`}>
              Close
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
};
