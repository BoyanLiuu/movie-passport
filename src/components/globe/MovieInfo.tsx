import { ArrowRight, ExternalLink } from "lucide-react";
import type { Ref } from "react";
import { engravedLabel, panelFrame, plateButton, plateChip } from "@/components/ui/plate";
import type { Movie } from "@/data/movies";
import { formatRuntime } from "@/lib/data/filmDetails";
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
  /** Opens the full details sheet; absent for sample films, which have no details. */
  onOpenDetails?: () => void;
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
      <h3 className={`${engravedLabel} mt-5`}>{title}</h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {countries.map((country) => (
          <li key={country.id}>
            <button type="button" onClick={() => onSelect(country.id)} className={plateChip}>
              {country.name}
            </button>
          </li>
        ))}
      </ul>
    </>
  );

/** Movie view overlay: same placement as CountryInfo (card on wide screens, sheet on phones). */
export const MovieInfo = ({
  movie,
  from,
  coProduced,
  overview,
  onSelectCountry,
  onOpenDetails,
  onReset,
  ref,
}: MovieInfoProps) => {
  const facts = [
    String(movie.year),
    movie.runtime ? formatRuntime(movie.runtime) : null,
    movie.rating ? `${movie.rating.toFixed(1)} / 10` : null,
  ].filter(Boolean);

  return (
    <section
      ref={ref}
      aria-labelledby="movie-info-title"
      data-testid="movie-info"
      className={`${panelFrame} pointer-events-auto absolute inset-x-3 bottom-3 flex max-h-[55dvh] animate-panel-in flex-col p-5 sm:inset-x-auto sm:top-48 sm:right-6 sm:bottom-auto sm:max-h-[calc(100dvh-14rem)] sm:w-[24rem] sm:p-6 lg:top-24 lg:max-h-[calc(100dvh-8rem)]`}
    >
      <div className="min-h-0 overflow-y-auto overscroll-contain">
        <div className="flex gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- TMDB CDN or generated data URL */}
          <img
            src={posterUrl(movie, "w342")}
            onError={(e) => fallBackToGeneratedArt(e.currentTarget, movie)}
            alt=""
            className="aspect-[2/3] w-24 shrink-0 self-start border border-silver/30 bg-plate-deep object-cover shadow-[0_12px_24px_-8px_rgb(0_0_0/0.95)]"
          />
          <div className="min-w-0">
            <h2
              id="movie-info-title"
              tabIndex={-1}
              className="font-display text-[22px] leading-snug tracking-[0.06em] text-silver-bright uppercase focus:outline-none"
            >
              {movie.title}
            </h2>
            {movie.originalTitle && (
              <p className="mt-1 font-serif text-sm text-pewter italic">{movie.originalTitle}</p>
            )}
            <p className="mt-2 font-serif text-sm text-silver tabular-nums">{facts.join(" · ")}</p>
            {movie.director && (
              <p className="mt-1 font-serif text-sm text-pewter">{movie.director}</p>
            )}
          </div>
        </div>

        {movie.genres && movie.genres.length > 0 && (
          <p className={`${engravedLabel} mt-4`}>{movie.genres.join(" · ")}</p>
        )}
        {overview && (
          <p
            className="mt-3 font-serif text-[15px] leading-relaxed text-silver"
            data-testid="movie-overview"
          >
            {overview}
          </p>
        )}

        <CountryChips title="From" countries={from} onSelect={onSelectCountry} />
        <CountryChips title="Co-produced with" countries={coProduced} onSelect={onSelectCountry} />

        <p className="mt-5 font-serif text-sm text-pewter">
          {movie.tmdbId ? (
            <a
              href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-silver underline decoration-pewter/50 hover:text-silver-bright hover:decoration-silver"
            >
              View on TMDB
              <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.5} />
            </a>
          ) : (
            <span className="italic">Sample film · placeholder poster art</span>
          )}
        </p>
      </div>

      <div className="shrink-0 pt-4">
        {onOpenDetails && (
          <button
            type="button"
            data-more-details
            onClick={onOpenDetails}
            className={`${plateButton} w-full`}
          >
            More details
            <ArrowRight aria-hidden className="size-3.5" strokeWidth={1.5} />
          </button>
        )}
        <BackToGlobeButton onClick={onReset} />
      </div>
    </section>
  );
};
