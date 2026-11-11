import type { Movie } from "@/data/movies";
import type { Country } from "@/lib/geo/countries";
import { BackToGlobeButton } from "./BackToGlobeButton";
import { posterUrl } from "./posters/htmlPosters";

type MovieInfoProps = {
  movie: Movie;
  /** The film's production countries that exist on the map, primary first. */
  countries: Country[];
  onSelectCountry: (countryId: string) => void;
  onReset: () => void;
};

/** Movie view overlay: same placement as CountryInfo (card on wide screens, sheet on phones). */
export const MovieInfo = ({ movie, countries, onSelectCountry, onReset }: MovieInfoProps) => (
  <section
    aria-labelledby="movie-info-title"
    data-testid="movie-info"
    className="pointer-events-auto absolute inset-x-3 bottom-3 animate-panel-in rounded-2xl border border-white/10 bg-slate-950/75 p-5 shadow-2xl shadow-black/50 backdrop-blur-md sm:inset-x-auto sm:top-24 sm:right-6 sm:bottom-auto sm:w-80"
  >
    <div className="flex gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- generated SVG data URL */}
      <img
        src={posterUrl(movie)}
        alt=""
        className="w-20 shrink-0 self-start rounded shadow-lg ring-1 shadow-black/50 ring-white/15 sm:w-24"
      />
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-[0.2em] text-amber-300/80 uppercase">
          {movie.year}
        </p>
        <h2
          id="movie-info-title"
          className="mt-1 font-display text-3xl leading-tight text-slate-50"
        >
          {movie.title}
        </h2>
        {movie.originalTitle && (
          <p className="mt-1 text-sm text-slate-400">{movie.originalTitle}</p>
        )}
        <p className="mt-2 text-sm text-slate-300">{movie.director}</p>
      </div>
    </div>

    <h3 className="mt-5 text-xs text-slate-500">
      {countries.length > 1 ? "Production countries" : "Production country"}
    </h3>
    <ul className="mt-2 flex flex-wrap gap-2">
      {countries.map((country) => (
        <li key={country.id}>
          <button
            type="button"
            onClick={() => onSelectCountry(country.id)}
            className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-sm text-amber-100 transition hover:bg-amber-300/20 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none"
          >
            {country.name}
          </button>
        </li>
      ))}
    </ul>
    <p className="mt-3 text-xs text-slate-500">Pinned at {movie.place} · placeholder poster art</p>

    <BackToGlobeButton onClick={onReset} />
  </section>
);
