import type { Ref } from "react";
import { engravedLabel, panelFrame, plateChip } from "@/components/ui/plate";
import type { Movie } from "@/data/movies";
import { type CountryStats, decadeRangeLabel } from "@/lib/catalogue";
import type { Country } from "@/lib/geo/countries";
import { BackToGlobeButton } from "./BackToGlobeButton";
import { fallBackToGeneratedArt, posterUrl } from "./posters/htmlPosters";

type CountryInfoProps = {
  country: Country;
  /** Films whose main country this is, best-known first. */
  from: Movie[];
  /** Films it helped make. */
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
  <div className="min-w-0">
    <dt className={engravedLabel}>{label}</dt>
    <dd className="mt-1 font-serif text-lg whitespace-nowrap text-silver-bright tabular-nums">
      {value}
    </dd>
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
      className="group flex w-full items-center gap-3.5 px-2 py-2.5 text-left transition-colors duration-150 hover:bg-silver/5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- TMDB CDN or generated data URL */}
      <img
        src={posterUrl(film, "w92")}
        onError={(e) => fallBackToGeneratedArt(e.currentTarget, film)}
        alt=""
        loading="lazy"
        className="aspect-[2/3] w-10 shrink-0 border border-silver/20 bg-plate-deep object-cover brightness-90 transition group-hover:brightness-100"
      />
      <span className="min-w-0">
        <span className="block truncate font-serif text-[15px] text-silver-bright">
          {film.title}
        </span>
        <span className="block truncate font-serif text-[13px] text-pewter">
          {[film.year, film.director].filter(Boolean).join(" · ")}
        </span>
        {partners.length > 0 && (
          <span className="block truncate font-serif text-[13px] text-pewter/80 italic">
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
    className={`${panelFrame} pointer-events-auto absolute inset-x-3 bottom-3 flex max-h-[50dvh] animate-panel-in flex-col p-5 sm:inset-x-auto sm:top-48 sm:right-6 sm:bottom-auto sm:max-h-[calc(100dvh-14rem)] sm:w-[24rem] sm:p-6 lg:top-24 lg:max-h-[calc(100dvh-8rem)]`}
  >
    <div className="shrink-0">
      <h2
        id="country-info-title"
        tabIndex={-1}
        className="font-display text-[28px] leading-tight tracking-[0.08em] text-silver-bright uppercase focus:outline-none sm:text-[32px]"
      >
        {country.name}
      </h2>
      <p className={`${engravedLabel} mt-2`}>
        {country.continent}
        {country.iso2 && <> · Plate {country.iso2}</>}
      </p>
      {country.note && <p className="mt-2 font-serif text-sm text-silver italic">{country.note}</p>}
      {country.formalName !== country.name && (
        <p className="mt-1 hidden font-serif text-sm text-pewter italic sm:block">
          {country.formalName}
        </p>
      )}

      {stats.films > 0 && (
        <dl
          className="mt-5 grid grid-cols-[repeat(3,auto)] justify-between gap-x-4 border-t border-smoke pt-4"
          data-testid="country-stats"
        >
          <Stat label="From here" value={from.length} />
          <Stat label="Co-produced" value={coProduced.length} />
          <Stat label="Decades" value={decadeRangeLabel(stats) ?? "–"} />
        </dl>
      )}
    </div>

    {from.length + coProduced.length > 0 ? (
      <div className="-mx-2 mt-5 min-h-0 overflow-y-auto overscroll-contain border-t border-smoke pt-2">
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
            <section key={group.label} aria-label={group.label} className="pb-3">
              <h3 className={`${engravedLabel} px-2 pt-3 pb-1.5`}>
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
      <div data-testid="country-empty" className="mt-5 border-t border-smoke pt-5">
        <p className="font-serif text-[15px] text-silver">
          No films from {country.name} in the catalogue yet.
        </p>
        {nearby.length > 0 && (
          <>
            <p className={`${engravedLabel} mt-4`}>Nearby countries with films</p>
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {nearby.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => onSelectCountry(c.id)} className={plateChip}>
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    )}

    <div className="shrink-0 pt-2">
      <BackToGlobeButton onClick={onReset} />
    </div>
  </section>
);
