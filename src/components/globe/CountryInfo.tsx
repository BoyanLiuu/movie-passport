import type { Ref } from "react";
import type { Movie } from "@/data/movies";
import { type CountryStats, decadeRangeLabel } from "@/lib/catalogue";
import type { Country } from "@/lib/geo/countries";
import { BackToGlobeButton } from "./BackToGlobeButton";
import { posterUrl } from "./posters/htmlPosters";

type CountryInfoProps = {
  country: Country;
  /** Films produced (or co-produced) in this country, oldest first. */
  films: Movie[];
  stats: CountryStats;
  /** Nearest countries that do have films: the empty state's way onward. */
  nearby: Country[];
  /** Names of a film's other production countries, for "with Germany" lines. */
  partnersOf: (movie: Movie) => string[];
  onSelectMovie: (movieId: string) => void;
  onSelectCountry: (countryId: string) => void;
  /** Hovering or focusing a film in the list highlights its poster on the globe. */
  onPointAtMovie: (movieId: string | null) => void;
  onReset: () => void;
  ref?: Ref<HTMLElement>;
};

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div>
    <dt className="text-[11px] tracking-wide text-slate-500 uppercase">{label}</dt>
    <dd className="mt-0.5 text-sm text-slate-100">{value}</dd>
  </div>
);

/** Country view panel: a card on the right on wide screens, a bottom sheet on phones. */
export const CountryInfo = ({
  country,
  films,
  stats,
  nearby,
  partnersOf,
  onSelectMovie,
  onSelectCountry,
  onPointAtMovie,
  onReset,
  ref,
}: CountryInfoProps) => (
  <section
    ref={ref}
    aria-labelledby="country-info-title"
    data-testid="country-info"
    className="pointer-events-auto absolute inset-x-3 bottom-3 flex max-h-[50dvh] animate-panel-in flex-col rounded-2xl border border-white/10 bg-slate-950/80 p-4 shadow-2xl shadow-black/50 backdrop-blur-md sm:inset-x-auto sm:top-40 sm:right-6 sm:bottom-auto sm:max-h-[calc(100dvh-12rem)] sm:w-80 sm:p-5 lg:top-24 lg:max-h-[calc(100dvh-8rem)]"
  >
    <div className="shrink-0">
      <p className="text-xs font-medium tracking-[0.2em] text-amber-300/80 uppercase">
        {country.continent}
      </p>
      <h2
        id="country-info-title"
        tabIndex={-1}
        className="mt-1 font-display text-3xl leading-tight text-slate-50 focus:outline-none sm:text-4xl"
      >
        {country.name}
      </h2>
      {country.formalName !== country.name && (
        <p className="mt-1 hidden text-sm text-slate-400 sm:block">{country.formalName}</p>
      )}

      {stats.films > 0 && (
        <dl className="mt-3 flex gap-6 sm:mt-4" data-testid="country-stats">
          <Stat label="Films" value={stats.films} />
          <Stat label="Decades" value={decadeRangeLabel(stats) ?? "–"} />
          <Stat label="Co-prod." value={stats.coProductions} />
        </dl>
      )}
    </div>

    {films.length > 0 ? (
      <ul
        aria-label={`Films from ${country.name}`}
        className="-mx-2 mt-4 min-h-0 overflow-y-auto overscroll-contain border-t border-white/10 pt-2"
      >
        {films.map((film) => {
          const partners = partnersOf(film);
          return (
            <li key={film.id}>
              <button
                type="button"
                onClick={() => onSelectMovie(film.id)}
                onPointerEnter={() => onPointAtMovie(film.id)}
                onPointerLeave={() => onPointAtMovie(null)}
                onFocus={() => onPointAtMovie(film.id)}
                onBlur={() => onPointAtMovie(null)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- generated SVG data URL */}
                <img
                  src={posterUrl(film)}
                  alt=""
                  className="w-9 shrink-0 rounded-sm ring-1 ring-white/15"
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-100">{film.title}</span>
                  <span className="block truncate text-xs text-slate-400">
                    {film.year} · {film.director}
                  </span>
                  {partners.length > 0 && (
                    <span className="block truncate text-xs text-amber-200/70">
                      with {partners.join(", ")}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    ) : (
      <div
        data-testid="country-empty"
        className="mt-4 rounded-xl border border-dashed border-white/15 p-4"
      >
        <p className="text-sm text-slate-300">No films from {country.name} in the catalogue yet.</p>
        {nearby.length > 0 && (
          <>
            <p className="mt-3 text-xs text-slate-500">Nearby countries with films</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {nearby.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelectCountry(c.id)}
                    className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-sm text-amber-100 transition hover:bg-amber-300/20 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none"
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    )}

    <div className="shrink-0">
      {(country.iso2 || country.iso3) && (
        <p className="mt-4 hidden font-mono text-[11px] text-slate-500 sm:block">
          {[country.iso2, country.iso3].filter(Boolean).join(" · ")}
        </p>
      )}
      <BackToGlobeButton onClick={onReset} />
    </div>
  </section>
);
