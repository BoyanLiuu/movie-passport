import type { Ref } from "react";
import type { Movie } from "@/data/movies";
import type { Country } from "@/lib/geo/countries";
import { BackToGlobeButton } from "./BackToGlobeButton";
import { fallBackToGeneratedArt, posterUrl } from "./posters/htmlPosters";

type MovieInfoProps = {
  movie: Movie;
  /** Countries the film is from, and the others that helped make it (map countries only). */
  from: Country[];
  coProduced: Country[];
  /** Plot summary, loaded lazily; null while loading or when there is none. */
  overview: string | null;
  onSelectCountry: (countryId: string) => void;
  onReset: () => void;
  ref?: Ref<HTMLElement>;
};

const CountryChips = ({
  title,
  countries,
  onSelect,
}: {
  title: string;
  countries: Country[];
  onSelect: (countryId: string) => void;
}) =>
  countries.length === 0 ? null : (
    <>
      <h3 className="mt-4 text-xs text-slate-500">{title}</h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {countries.map((country) => (
          <li key={country.id}>
            <button
              type="button"
              onClick={() => onSelect(country.id)}
              className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-sm text-amber-100 transition hover:bg-amber-300/20 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none"
            >
              {country.name}
            </button>
          </li>
        ))}
      </ul>
    </>
  );

const formatRuntime = (minutes: number) =>
  minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;

/** Movie view overlay: same placement as CountryInfo (card on wide screens, sheet on phones). */
export const MovieInfo = ({
  movie,
  from,
  coProduced,
  overview,
  onSelectCountry,
  onReset,
  ref,
}: MovieInfoProps) => {
  const facts = [
    String(movie.year),
    movie.runtime ? formatRuntime(movie.runtime) : null,
    movie.rating ? `★ ${movie.rating.toFixed(1)}` : null,
  ].filter(Boolean);

  return (
    <section
      ref={ref}
      aria-labelledby="movie-info-title"
      data-testid="movie-info"
      className="pointer-events-auto absolute inset-x-3 bottom-3 flex max-h-[55dvh] animate-panel-in flex-col rounded-2xl border border-white/10 bg-slate-950/80 p-4 shadow-2xl shadow-black/50 backdrop-blur-md sm:inset-x-auto sm:top-48 sm:right-6 sm:bottom-auto sm:max-h-[calc(100dvh-14rem)] sm:w-80 sm:p-5 lg:top-24 lg:max-h-[calc(100dvh-8rem)]"
    >
      <div className="min-h-0 overflow-y-auto overscroll-contain">
        <div className="flex gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- TMDB CDN or generated data URL */}
          <img
            src={posterUrl(movie, "w342")}
            onError={(e) => fallBackToGeneratedArt(e.currentTarget, movie)}
            alt=""
            className="aspect-[2/3] w-20 shrink-0 self-start rounded bg-slate-800 object-cover shadow-lg ring-1 shadow-black/50 ring-white/15 sm:w-24"
          />
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-[0.15em] text-amber-300/80 uppercase">
              {facts.join(" · ")}
            </p>
            <h2
              id="movie-info-title"
              tabIndex={-1}
              className="mt-1 font-display text-3xl leading-tight text-slate-50 focus:outline-none"
            >
              {movie.title}
            </h2>
            {movie.originalTitle && (
              <p className="mt-1 text-sm text-slate-400">{movie.originalTitle}</p>
            )}
            {movie.director && <p className="mt-2 text-sm text-slate-300">{movie.director}</p>}
          </div>
        </div>

        {movie.genres && movie.genres.length > 0 && (
          <p className="mt-3 text-xs text-slate-400">{movie.genres.join(" · ")}</p>
        )}
        {overview && (
          <p className="mt-3 text-sm leading-relaxed text-slate-300" data-testid="movie-overview">
            {overview}
          </p>
        )}

        <CountryChips title="From" countries={from} onSelect={onSelectCountry} />
        <CountryChips title="Co-produced with" countries={coProduced} onSelect={onSelectCountry} />

        <p className="mt-4 text-xs text-slate-500">
          {movie.tmdbId ? (
            <a
              href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-200 underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none"
            >
              View on TMDB ↗
            </a>
          ) : (
            "Sample film · placeholder poster art"
          )}
        </p>
      </div>

      <div className="shrink-0">
        <BackToGlobeButton onClick={onReset} />
      </div>
    </section>
  );
};
