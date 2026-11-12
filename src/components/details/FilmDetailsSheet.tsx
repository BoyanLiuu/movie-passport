"use client";

// The film details sheet: rises from the bottom over the globe with what a TMDB film page shows
// (in Movie Passport's own layout), plus links back into the globe. A native modal <dialog>, so
// focus, Escape and screen readers behave; closing is navigation (the URL owns `&details`).
// Velvet Night: the backdrop is printed as a dim mezzotint behind the title; the body reads as a
// page with a hairline-ruled side column for the facts.

import { ChevronDown, ExternalLink, Globe, Play, X } from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { fallBackToGeneratedArt, posterUrl } from "@/components/globe/posters/htmlPosters";
import { engravedLabel, plateButton, plateChip } from "@/components/ui/plate";
import type { Movie } from "@/data/movies";
import { useFilmDetails } from "@/hooks/useFilmDetails";
import {
  type FilmDetails,
  formatDate,
  formatMoney,
  formatRuntime,
  justWatchUrl,
  languageName,
  preferredRegion,
  PROVIDER_GROUPS,
  regionName,
  tmdbImage,
  trailerEmbedUrl,
} from "@/lib/data/filmDetails";
import type { Country } from "@/lib/geo/countries";

type FilmDetailsSheetProps = {
  movie: Movie;
  /** Production countries on the map: main country first. */
  countries: Country[];
  /** Other films from this film's main country, best-known first. */
  moreFromHome: Movie[];
  homeName: string | null;
  /** Ids in our catalogue, so similar films we have open in the app. */
  catalogueIds: ReadonlySet<string>;
  onClose: () => void;
  onSelectCountry: (countryId: string) => void;
  onOpenFilm: (movieId: string) => void;
};

const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h3 className="engraved mb-4 text-[11px] text-pewter">{children}</h3>
);

const External = ({ href, children }: { href: string; children: ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1.5 text-silver underline decoration-pewter/50 transition-colors hover:text-silver-bright hover:decoration-silver"
  >
    {children}
    <ExternalLink aria-hidden className="size-3.5 shrink-0" strokeWidth={1.5} />
  </a>
);

/** The plate's rule: a hairline with a small lozenge at its centre. */
const Fleuron = () => (
  <div aria-hidden className="flex items-center gap-3 px-6 sm:px-12">
    <span className="h-px flex-1 bg-smoke" />
    <span className="size-1.5 rotate-45 border border-pewter/70" />
    <span className="h-px flex-1 bg-smoke" />
  </div>
);

const Title = ({ movie }: { movie: Movie }) => (
  <h2
    id="details-title"
    tabIndex={-1}
    className="font-display text-[32px] leading-[1.1] tracking-[0.05em] text-balance text-silver-bright uppercase focus:outline-none sm:text-[44px]"
  >
    {movie.title} <span className="text-pewter">({movie.year})</span>
  </h2>
);

const Trailer = ({ details, title }: { details: FilmDetails; title: string }) => {
  const [playing, setPlaying] = useState(false);
  if (!details.trailer) return null;
  return (
    <section data-testid="details-trailer">
      <SectionTitle>Trailer</SectionTitle>
      <div className="relative aspect-video w-full overflow-hidden border border-smoke bg-velvet-raised">
        {playing ? (
          <iframe
            src={trailerEmbedUrl(details.trailer.key)}
            title={`${title}: ${details.trailer.name}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          // Nothing loads from YouTube until the viewer asks for it.
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 flex items-center justify-center focus-visible:outline-offset-[-4px]"
          >
            {details.backdrop && (
              // eslint-disable-next-line @next/next/no-img-element -- TMDB CDN
              <img
                src={tmdbImage(details.backdrop, "w780")}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-40 grayscale transition-[opacity,filter] duration-300 group-hover:opacity-70 group-hover:grayscale-0"
              />
            )}
            <span className={`${plateButton} relative`}>
              <Play aria-hidden className="size-3.5 fill-current" strokeWidth={1.5} />
              Play trailer
            </span>
          </button>
        )}
      </div>
    </section>
  );
};

const WhereToWatch = ({ details, title }: { details: FilmDetails; title: string }) => {
  const regions = Object.keys(details.watch).sort((a, b) =>
    regionName(a).localeCompare(regionName(b)),
  );
  const [region, setRegion] = useState(() =>
    preferredRegion(regions, typeof navigator === "undefined" ? [] : navigator.languages),
  );
  const entry = region ? details.watch[region] : undefined;
  return (
    <section data-testid="details-watch">
      <SectionTitle>Where to watch</SectionTitle>
      {regions.length === 0 || !region ? (
        <p className="font-serif text-[15px] text-pewter italic">
          No streaming, rental or purchase options listed.
        </p>
      ) : (
        <>
          <label className="flex flex-col gap-2">
            <span className={engravedLabel}>Region</span>
            <span className="relative">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="min-h-10 w-full appearance-none border border-pewter/40 bg-velvet-raised pr-9 pl-3 font-serif text-[15px] text-silver-bright transition-colors hover:border-silver"
              >
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {regionName(r)}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-pewter"
                strokeWidth={1.5}
              />
            </span>
          </label>
          <div className="mt-5 space-y-5">
            {PROVIDER_GROUPS.map(({ key, label }) => {
              const providers = entry?.[key];
              if (!providers?.length) return null;
              return (
                <div key={key}>
                  <p className={engravedLabel}>{label}</p>
                  <ul className="mt-2.5 flex flex-wrap gap-2">
                    {providers.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center gap-2.5 border border-smoke py-1 pr-3 pl-1 font-serif text-sm text-silver"
                      >
                        {p.logo && (
                          // eslint-disable-next-line @next/next/no-img-element -- TMDB CDN
                          <img
                            src={tmdbImage(p.logo, "w92")}
                            alt=""
                            loading="lazy"
                            className="size-7"
                          />
                        )}
                        {p.name}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}
      {/* TMDB's terms: watch-provider data must be credited to JustWatch. */}
      <p className="mt-5 font-serif text-[13px] text-pewter" data-testid="justwatch-credit">
        Data from JustWatch ·{" "}
        <External href={justWatchUrl(region ?? "US", title)}>See on JustWatch</External>
      </p>
    </section>
  );
};

const PosterRow = ({
  items,
  label,
}: {
  label: string;
  items: {
    key: string;
    title: string;
    year: number | null;
    src: string;
    onOpen?: () => void;
    href?: string;
  }[];
}) => (
  <ul aria-label={label} className="-mx-1 flex gap-4 overflow-x-auto px-1 pt-1 pb-3">
    {items.map((item) => {
      const body = (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- TMDB CDN or generated art */}
          <img
            src={item.src}
            alt=""
            loading="lazy"
            className="aspect-[2/3] w-28 border border-silver/25 bg-plate-deep object-cover shadow-[0_10px_20px_-8px_rgb(0_0_0/0.95)] brightness-[0.82] saturate-[0.85] transition-[filter,border-color] duration-200 group-hover:border-silver-bright/80 group-hover:brightness-100 group-hover:saturate-100 group-focus-visible:brightness-100"
          />
          <span className="mt-2 block truncate font-serif text-sm text-silver transition-colors group-hover:text-silver-bright">
            {item.title}
          </span>
          {item.year && (
            <span className="block font-serif text-[13px] text-pewter tabular-nums">
              {item.year}
            </span>
          )}
        </>
      );
      const className = "group block w-28 text-left";
      return (
        <li key={item.key} className="shrink-0">
          {item.onOpen ? (
            <button type="button" onClick={item.onOpen} className={className}>
              {body}
            </button>
          ) : (
            <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
              {body}
            </a>
          )}
        </li>
      );
    })}
  </ul>
);

/** Directors and writers as one list, each person once with all their jobs. */
const keyCrew = (details: FilmDetails) => {
  const people = new Map<string, string[]>();
  for (const name of details.directors) people.set(name, ["Director"]);
  for (const w of details.writers) people.set(w.name, [...(people.get(w.name) ?? []), ...w.jobs]);
  return [...people].map(([name, jobs]) => ({ name, jobs }));
};

const Body = ({
  details,
  movie,
  countries,
  moreFromHome,
  homeName,
  catalogueIds,
  onSelectCountry,
  onOpenFilm,
}: Omit<FilmDetailsSheetProps, "onClose"> & { details: FilmDetails }) => {
  const certification =
    details.certifications.US ??
    details.certifications[movie.home] ??
    Object.values(details.certifications)[0];
  const facts: [string, string][] = [
    ["Status", details.status ?? "–"],
    ["Original language", details.originalLanguage ? languageName(details.originalLanguage) : "–"],
    ["Release date", details.releaseDate ? formatDate(details.releaseDate) : String(movie.year)],
    ["Budget", details.budget ? formatMoney(details.budget) : "–"],
    ["Box office", details.revenue ? formatMoney(details.revenue) : "–"],
  ];
  const links = [
    details.homepage && { label: "Official site", href: details.homepage },
    movie.tmdbId && { label: "TMDB", href: `https://www.themoviedb.org/movie/${movie.tmdbId}` },
    details.links.imdb && {
      label: "IMDb",
      href: `https://www.imdb.com/title/${details.links.imdb}/`,
    },
    details.links.wikidata && {
      label: "Wikidata",
      href: `https://www.wikidata.org/wiki/${details.links.wikidata}`,
    },
    details.links.facebook && {
      label: "Facebook",
      href: `https://www.facebook.com/${details.links.facebook}`,
    },
    details.links.instagram && {
      label: "Instagram",
      href: `https://www.instagram.com/${details.links.instagram}/`,
    },
    details.links.twitter && { label: "X", href: `https://x.com/${details.links.twitter}` },
  ].filter(Boolean) as { label: string; href: string }[];
  const headerFacts = [
    details.releaseDate ? formatDate(details.releaseDate) : String(movie.year),
    movie.genres?.length ? movie.genres.join(", ") : null,
    movie.runtime ? formatRuntime(movie.runtime) : null,
  ].filter(Boolean);

  return (
    <>
      {/* Header: backdrop behind poster, title and key facts. */}
      <header className="relative overflow-hidden">
        {details.backdrop && (
          // A still from the film, printed dim and colourless into the plate behind the title.
          // eslint-disable-next-line @next/next/no-img-element -- TMDB CDN
          <img
            src={tmdbImage(details.backdrop, "w1280")}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-[0.22] grayscale"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-velvet via-velvet/85 to-velvet/40" />
        <div className="relative flex flex-col gap-7 px-6 pt-8 pb-10 sm:flex-row sm:gap-10 sm:px-12 sm:pt-10">
          {/* eslint-disable-next-line @next/next/no-img-element -- TMDB CDN or generated art */}
          <img
            src={posterUrl(movie, "w342")}
            onError={(e) => fallBackToGeneratedArt(e.currentTarget, movie)}
            alt=""
            className="aspect-[2/3] w-36 shrink-0 self-start border border-silver/30 bg-plate-deep object-cover shadow-[0_24px_40px_-14px_rgb(0_0_0/0.95)] sm:w-52"
          />
          <div className="min-w-0">
            <Title movie={movie} />
            {movie.originalTitle && (
              <p className="mt-2 font-serif text-base text-pewter italic">{movie.originalTitle}</p>
            )}
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-serif text-[15px] text-silver tabular-nums">
              {certification && (
                <span className="border border-pewter/50 px-1.5 text-[12px] leading-5 text-silver">
                  {certification}
                </span>
              )}
              <span>{headerFacts.join(" · ")}</span>
            </p>
            {movie.rating ? (
              <p
                className="mt-2 font-serif text-[15px] text-pewter tabular-nums"
                data-testid="details-score"
              >
                <span className="text-silver-bright">{Math.round(movie.rating * 10)}%</span> user
                score · {movie.rank.toLocaleString("en-GB")} votes on TMDB
              </p>
            ) : null}
            {details.tagline && (
              <p
                className="mt-5 font-serif text-lg text-silver italic"
                data-testid="details-tagline"
              >
                {details.tagline}
              </p>
            )}
            {details.overview && (
              <>
                <h3 className={`${engravedLabel} mt-6`}>Overview</h3>
                <p className="mt-2 max-w-[62ch] font-serif text-base leading-relaxed text-silver">
                  {details.overview}
                </p>
              </>
            )}
            {(details.directors.length > 0 || details.writers.length > 0) && (
              <dl
                className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3"
                data-testid="details-crew"
              >
                {keyCrew(details).map((person) => (
                  <div key={person.name} className="min-w-0">
                    <dt className="font-serif text-[15px] text-silver-bright">{person.name}</dt>
                    <dd className="font-serif text-[13px] text-pewter italic">
                      {person.jobs.join(", ")}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </header>

      <Fleuron />

      <div className="px-6 pt-8 pb-12 sm:px-12 lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-x-12">
        <div className="min-w-0 space-y-10">
          {details.cast.length > 0 && (
            <section data-testid="details-cast">
              <SectionTitle>Top billed cast</SectionTitle>
              <ul className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-3">
                {details.cast.map((person) => (
                  <li key={`${person.name}-${person.character}`} className="group w-28 shrink-0">
                    {person.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- TMDB CDN
                      <img
                        src={tmdbImage(person.photo, "w185")}
                        alt=""
                        loading="lazy"
                        className="aspect-[2/3] w-full border border-silver/20 bg-plate-deep object-cover opacity-80 grayscale transition-[opacity,filter] duration-300 group-hover:opacity-100 group-hover:grayscale-0"
                      />
                    ) : (
                      <div className="flex aspect-[2/3] w-full items-center justify-center border border-smoke bg-plate-deep font-display text-2xl text-pewter">
                        {person.name.charAt(0)}
                      </div>
                    )}
                    <p className="mt-2 truncate font-serif text-sm text-silver-bright">
                      {person.name}
                    </p>
                    {person.character && (
                      <p className="truncate font-serif text-[13px] text-pewter italic">
                        {person.character}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Trailer details={details} title={movie.title} />

          {moreFromHome.length > 0 && homeName && (
            <section>
              <SectionTitle>More from {homeName}</SectionTitle>
              <PosterRow
                label={`More from ${homeName}`}
                items={moreFromHome.map((m) => ({
                  key: m.id,
                  title: m.title,
                  year: m.year,
                  src: posterUrl(m, "w185"),
                  onOpen: () => onOpenFilm(m.id),
                }))}
              />
            </section>
          )}

          {details.recommendations.length > 0 && (
            <section>
              <SectionTitle>Similar films</SectionTitle>
              <PosterRow
                label="Similar films"
                items={details.recommendations.map((r) => ({
                  key: r.id,
                  title: r.title,
                  year: r.year,
                  src: r.poster
                    ? tmdbImage(r.poster, "w185")
                    : posterUrl({ ...movie, id: r.id, title: r.title, poster: null }),
                  ...(catalogueIds.has(r.id)
                    ? { onOpen: () => onOpenFilm(r.id) }
                    : { href: `https://www.themoviedb.org/movie/${r.id}` }),
                }))}
              />
            </section>
          )}
        </div>

        {/* The side column: a hairline-ruled margin of facts, like the plate's printed key. */}
        <aside className="mt-10 space-y-10 border-t border-smoke pt-8 lg:mt-0 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
          <WhereToWatch details={details} title={movie.title} />

          <section>
            <SectionTitle>Facts</SectionTitle>
            <dl
              className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-1"
              data-testid="details-facts"
            >
              {facts.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className={engravedLabel}>{label}</dt>
                  <dd className="mt-1 font-serif text-[15px] text-silver-bright tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {countries.length > 0 && (
            <section>
              <SectionTitle>Production countries</SectionTitle>
              <ul className="flex flex-wrap gap-2">
                {countries.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onSelectCountry(c.id)}
                      className={plateChip}
                    >
                      <Globe aria-hidden className="size-3.5" strokeWidth={1.5} />
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 font-serif text-[13px] text-pewter italic">
                Each opens on the globe.
              </p>
            </section>
          )}

          {details.keywords.length > 0 && (
            <section>
              <SectionTitle>Keywords</SectionTitle>
              <ul
                className="flex flex-wrap gap-x-2 gap-y-1 font-serif text-sm text-pewter italic"
                data-testid="details-keywords"
              >
                {details.keywords.map((k) => (
                  <li
                    key={k}
                    className="after:ml-2 after:text-smoke after:not-italic after:content-['·'] last:after:content-none"
                  >
                    {k}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {links.length > 0 && (
            <section>
              <SectionTitle>Links</SectionTitle>
              <ul className="flex flex-wrap gap-x-5 gap-y-2.5 font-serif text-[15px] lg:flex-col">
                {links.map((l) => (
                  <li key={l.label}>
                    <External href={l.href}>{l.label}</External>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        <p className="mt-12 border-t border-smoke pt-5 font-serif text-[13px] text-pewter italic lg:col-span-2">
          Film data and images from TMDB. This product uses the TMDB API but is not endorsed or
          certified by TMDB. Streaming data from JustWatch.
        </p>
      </div>
    </>
  );
};

/** Pointer travel (px) on the drag handle that closes the sheet. */
const SWIPE_CLOSE_PX = 120;

export const FilmDetailsSheet = (props: FilmDetailsSheetProps) => {
  const { movie, onClose } = props;
  const dialog = useRef<HTMLDialogElement>(null);
  const state = useFilmDetails(movie.id);
  const [drag, setDrag] = useState<{ startY: number; dy: number } | null>(null);

  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) {
      el.showModal();
      // Start on the title (read out first), not the close button the browser would pick.
      el.querySelector<HTMLElement>("#details-title")?.focus();
    }
    return () => el?.close();
  }, []);

  const onHandleDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ startY: e.clientY, dy: 0 });
  };
  const onHandleMove = (e: ReactPointerEvent<HTMLDivElement>) =>
    setDrag((d) => (d ? { ...d, dy: Math.max(0, e.clientY - d.startY) } : d));
  const onHandleUp = () => {
    if (drag && drag.dy > SWIPE_CLOSE_PX) onClose();
    setDrag(null);
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="details-title"
      data-testid="film-details"
      // Escape: let the URL close it (keeps Back/Forward consistent) instead of closing directly.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={drag ? { transform: `translateY(${drag.dy}px)`, transition: "none" } : undefined}
      // pointer-events-auto: the overlay it sits in ignores the pointer (so the globe drags).
      className="details-sheet velvet-grain pointer-events-auto fixed inset-x-0 top-auto bottom-0 mx-auto mb-0 h-[94dvh] max-h-none w-full max-w-5xl overflow-hidden border border-b-0 border-smoke bg-velvet p-0 text-silver shadow-[0_-24px_60px_-24px_rgb(0_0_0/0.95)] backdrop:bg-black/75 sm:h-[90dvh]"
    >
      <div className="flex h-full flex-col">
        <div
          className="relative flex shrink-0 cursor-grab touch-none justify-center py-3 active:cursor-grabbing"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={() => setDrag(null)}
          aria-hidden
        >
          <span className="h-0.5 w-14 bg-pewter/40" />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="absolute top-3 right-4 z-10 flex size-10 items-center justify-center border border-pewter/40 bg-velvet/80 text-silver transition-colors hover:border-silver hover:text-silver-bright"
        >
          <X aria-hidden className="size-4" strokeWidth={1.5} />
        </button>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          data-testid="details-scroll"
        >
          {state.status === "ready" ? (
            <Body {...props} details={state.details} />
          ) : (
            <div className="px-6 pt-8 sm:px-12 sm:pt-10">
              <Title movie={movie} />
              <p className="mt-4 font-serif text-[15px] text-pewter italic" role="status">
                {state.status === "loading"
                  ? "Loading details…"
                  : "Details aren’t available for this film yet. Run `pnpm data:catalogue` to fetch them."}
              </p>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
};
