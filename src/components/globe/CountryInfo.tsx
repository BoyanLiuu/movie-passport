import type { Country } from "@/lib/geo/countries";

type CountryInfoProps = {
  country: Country;
  onReset: () => void;
};

/** Mode B overlay: a card on the right on wide screens, a bottom sheet on phones. */
export const CountryInfo = ({ country, onReset }: CountryInfoProps) => (
  <section
    aria-labelledby="country-info-title"
    data-testid="country-info"
    className="pointer-events-auto absolute inset-x-3 bottom-3 animate-panel-in rounded-2xl border border-white/10 bg-slate-950/75 p-5 shadow-2xl shadow-black/50 backdrop-blur-md sm:inset-x-auto sm:top-24 sm:right-6 sm:bottom-auto sm:w-80"
  >
    <p className="text-xs font-medium tracking-[0.2em] text-amber-300/80 uppercase">
      {country.continent}
    </p>
    <h2 id="country-info-title" className="mt-1 font-display text-4xl leading-tight text-slate-50">
      {country.name}
    </h2>
    {country.formalName !== country.name && (
      <p className="mt-1 text-sm text-slate-400">{country.formalName}</p>
    )}

    {(country.iso2 || country.iso3) && (
      <dl className="mt-4 flex gap-6 text-sm">
        {country.iso2 && (
          <div>
            <dt className="text-slate-500">ISO</dt>
            <dd className="font-mono text-slate-200">{country.iso2}</dd>
          </div>
        )}
        {country.iso3 && (
          <div>
            <dt className="text-slate-500">ISO-3</dt>
            <dd className="font-mono text-slate-200">{country.iso3}</dd>
          </div>
        )}
      </dl>
    )}

    <button
      type="button"
      onClick={onReset}
      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:border-amber-300/60 hover:bg-amber-300/10 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none"
    >
      <span aria-hidden>←</span> Back to globe
      <kbd className="ml-1 hidden rounded border border-white/15 px-1.5 font-sans text-[11px] text-slate-400 pointer-fine:inline">
        Esc
      </kbd>
    </button>
  </section>
);
