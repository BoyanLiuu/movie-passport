import type { Ref } from "react";
import type { Movie } from "@/data/movies";
import { type CountryStats, decadeRangeLabel } from "@/lib/catalogue";
import type { Country } from "@/lib/geo/countries";
import { BackToGlobeButton } from "./BackToGlobeButton";
import { fallBackToGeneratedArt, posterUrl } from "./posters/htmlPosters";

type CountryInfoProps = {
  country: Country;
  /** Films from this country (TMDB origin), best-known first. */
  from: Movie[];
  /** Films it only helped make. */
  coProduced: Movie[];
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

type FilmRowProps = {
  film: Movie;
  partners: string[];
  onSelect: (movieId: string) => void;
  onPointAt: (movieId: string | null) => void;
};

const FilmRow = ({ film, partners, onSelect, onPointAt }: FilmRowProps) => (
  <li>
    <button
      type="button"
      onClick={() => onSelect(film.id)}
      onPointerEnter={() => onPointAt(film.id)}
      onPointerLeave={() => onPointAt(null)}
      onFocus={() => onPointAt(film.id)}
      onBlur={() => onPointAt(null)}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- TMDB CDN or generated data URL */}
      <img
        src={posterUrl(film, "w92")}
        onError={(e) => fallBackToGeneratedArt(e.currentTarget, film)}
        alt=""
        loading="lazy"
        className="aspect-[2/3] w-9 shrink-0 rounded-sm bg-slate-800 object-cover ring-1 ring-white/15"
      />
      <span className="min-w-0">
        <span className="block truncate font-medium text-slate-100">{film.title}</span>
        <span className="block truncate text-xs text-slate-400">
          {[film.year, film.director].filter(Boolean).join(" · ")}
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

/** Country view panel: a card on the right on wide screens, a bottom sheet on phones. */
export const CountryInfo = ({
  country,
  from,
  coProduced,
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
    className="pointer-events-auto absolute inset-x-3 bottom-3 flex max-h-[50dvh] animate-panel-in flex-col rounded-2xl border border-white/10 bg-slate-950/80 p-4 shadow-2xl shadow-black/50 backdrop-blur-md sm:inset-x-auto sm:top-48 sm:right-6 sm:bottom-auto sm:max-h-[calc(100dvh-14rem)] sm:w-80 sm:p-5 lg:top-24 lg:max-h-[calc(100dvh-8rem)]"
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
      {country.note && <p className="mt-1 text-sm text-amber-200/80">{country.note}</p>}
      {country.formalName !== country.name && (
        <p className="mt-1 hidden text-sm text-slate-400 sm:block">{country.formalName}</p>
      )}

      {stats.films > 0 && (
        <dl className="mt-3 flex gap-6 sm:mt-4" data-testid="country-stats">
          <Stat label="From here" value={from.length} />
          <Stat label="Co-produced" value={coProduced.length} />
          <Stat label="Decades" value={decadeRangeLabel(stats) ?? "–"} />
        </dl>
      )}
    </div>

    {from.length + coProduced.length > 0 ? (
      <div className="-mx-2 mt-4 min-h-0 overflow-y-auto overscroll-contain border-t border-white/10 pt-2">
        {[
          { films: from, title: `From ${country.name}`, label: `Films from ${country.name}` },
          {
            films: coProduced,
            title: `Co-produced with ${country.name}`,
            label: `Co-productions with ${country.name}`,
          },
        ]
          .filter((group) => group.films.length > 0)
          .map((group) => (
            <section key={group.label} aria-label={group.label} className="pb-2">
              <h3 className="px-2 pt-2 pb-1 text-[11px] tracking-wide text-slate-500 uppercase">
                {group.title} · {group.films.length}
              </h3>
              <ul aria-label={group.label}>
                {group.films.map((film) => (
                  <FilmRow
                    key={film.id}
                    film={film}
                    partners={partnersOf(film)}
                    onSelect={onSelectMovie}
                    onPointAt={onPointAtMovie}
                  />
                ))}
              </ul>
            </section>
          ))}
      </div>
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
