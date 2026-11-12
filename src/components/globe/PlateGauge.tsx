// Depth as navigation: World, Country, Film, Details read as ever-brighter burnished marks on one
// vertical line. The current level is fully burnished; the levels above it are links back out;
// the levels below are still dark. Wide screens only: phones navigate with the sheet's Back.

type Level = { label: string; detail?: string | null; onSelect?: () => void };

type PlateGaugeProps = {
  /** 0 world, 1 country, 2 film, 3 details. */
  depth: number;
  countryName: string | null;
  filmTitle: string | null;
  onWorld: () => void;
  /** Back to the film's (or the country's) country view; absent when there is none. */
  onCountry?: () => void;
  /** Close the details sheet back to the film card. */
  onFilm?: () => void;
};

export const PlateGauge = ({
  depth,
  countryName,
  filmTitle,
  onWorld,
  onCountry,
  onFilm,
}: PlateGaugeProps) => {
  const levels: Level[] = [
    { label: "World", onSelect: onWorld },
    { label: "Country", detail: countryName, onSelect: onCountry },
    { label: "Film", detail: filmTitle, onSelect: onFilm },
    { label: "Details" },
  ];

  return (
    <nav
      aria-label="Depth"
      data-testid="plate-gauge"
      className="pointer-events-auto absolute top-1/2 left-6 hidden -translate-y-1/2 sm:block"
    >
      <ol className="relative flex flex-col gap-7 border-l border-smoke pl-5">
        {levels.map((level, i) => {
          const current = i === depth;
          const reachable = i < depth && level.onSelect;
          const tone = current
            ? "text-silver-bright"
            : i < depth
              ? "text-pewter"
              : "text-pewter/75";
          const dot = current
            ? "bg-silver-bright"
            : i < depth
              ? "bg-pewter"
              : "border border-pewter/40 bg-velvet";
          const content = (
            <>
              <span
                aria-hidden
                className={`absolute top-1 -left-[25px] size-2 rounded-full ${dot}`}
              />
              <span className={`engraved block text-[10px] ${tone}`}>{level.label}</span>
              {level.detail && i <= depth && (
                <span className="mt-0.5 block max-w-32 truncate font-serif text-xs text-pewter italic">
                  {level.detail}
                </span>
              )}
            </>
          );
          return (
            <li key={level.label} className="relative" aria-current={current ? "step" : undefined}>
              {reachable ? (
                <button
                  type="button"
                  onClick={level.onSelect}
                  className="text-left transition-colors hover:[&_span]:text-silver-bright"
                >
                  {content}
                </button>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
