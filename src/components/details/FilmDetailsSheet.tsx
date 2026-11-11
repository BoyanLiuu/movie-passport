"use client";

// The film details sheet: rises from the bottom over the globe with what a TMDB film page shows
// (in Movie Passport's own layout), plus links back into the globe. A native modal <dialog>, so
// focus, Escape and screen readers behave; closing is navigation (the URL owns `&details`).

import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { fallBackToGeneratedArt, posterUrl } from "@/components/globe/posters/htmlPosters";
import type { Movie } from "@/data/movies";
import { useFilmDetails } from "@/hooks/useFilmDetails";
import {
  type FilmDetails,
  formatDate,
  formatMoney,
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
  <h3 className="mb-3 text-xs font-medium tracking-[0.18em] text-slate-400 uppercase">
    {children}
  </h3>
);

const linkClass =
  "text-amber-200 underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none";

const External = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
    {children}
  </a>
);

const Trailer = ({ details, title }: { details: FilmDetails; title: string }) => {
  const [playing, setPlaying] = useState(false);
  if (!details.trailer) return null;
  return (
    <section className="mt-8" data-testid="details-trailer">
      <SectionTitle>Trailer</SectionTitle>
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
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
            className="group absolute inset-0 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none"
          >
            {details.backdrop && (
              // eslint-disable-next-line @next/next/no-img-element -- TMDB CDN
              <img
                src={tmdbImage(details.backdrop, "w780")}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-60 transition group-hover:opacity-80"
              />
            )}
            <span className="relative flex items-center gap-2 rounded-full bg-slate-950/80 px-5 py-3 text-sm font-medium text-slate-50">
              <span aria-hidden>▶</span> Play trailer
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
    <section className="mt-8" data-testid="details-watch">
      <SectionTitle>Where to watch</SectionTitle>
      {regions.length === 0 || !region ? (
        <p className="text-sm text-slate-400">No streaming, rental or purchase options listed.</p>
      ) : (
        <>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            In
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="rounded-lg border border-white/15 bg-slate-900 px-2 py-1 text-slate-100"
            >
              {regions.map((r) => (
                <option key={r} value={r}>
                  {regionName(r)}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4 space-y-4">
            {PROVIDER_GROUPS.map(({ key, label }) => {
              const providers = entry?.[key];
              if (!providers?.length) return null;
              return (
                <div key={key}>
                  <p className="text-xs text-slate-500">{label}</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {providers.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center gap-2 rounded-lg bg-white/5 py-1 pr-3 pl-1 text-sm text-slate-200"
                      >
                        {p.logo && (
                          // eslint-disable-next-line @next/next/no-img-element -- TMDB CDN
                          <img
                            src={tmdbImage(p.logo, "w92")}
                            alt=""
                            loading="lazy"
                            className="size-7 rounded"
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
      <p className="mt-4 text-xs text-slate-500" data-testid="justwatch-credit">
        Data from JustWatch ·{" "}
        <External href={justWatchUrl(region ?? "US", title)}>See on JustWatch ↗</External>
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
  <ul aria-label={label} className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
    {items.map((item) => {
      const body = (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- TMDB CDN or generated art */}
          <img
            src={item.src}
            alt=""
            loading="lazy"
            className="aspect-[2/3] w-28 rounded-lg bg-slate-800 object-cover ring-1 ring-white/10"
          />
          <span className="mt-1.5 block truncate text-sm text-slate-200">{item.title}</span>
          {item.year && <span className="block text-xs text-slate-500">{item.year}</span>}
        </>
      );
      const className =
        "block w-28 rounded-lg text-left focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none";
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

  return (
    <>
      {/* Header: backdrop behind poster, title and key facts. */}
      <header className="relative overflow-hidden">
        {details.backdrop && (
          // eslint-disable-next-line @next/next/no-img-element -- TMDB CDN
          <img
            src={tmdbImage(details.backdrop, "w1280")}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/30" />
        <div className="relative flex flex-col gap-6 px-6 pt-10 pb-6 sm:flex-row sm:px-10">
          {/* eslint-disable-next-line @next/next/no-img-element -- TMDB CDN or generated art */}
          <img
            src={posterUrl(movie, "w342")}
            onError={(e) => fallBackToGeneratedArt(e.currentTarget, movie)}
            alt=""
            className="aspect-[2/3] w-36 shrink-0 self-start rounded-xl bg-slate-800 object-cover shadow-2xl ring-1 ring-white/15 sm:w-52"
          />
          <div className="min-w-0">
            <h2
              id="details-title"
              className="font-display text-4xl leading-tight text-slate-50 sm:text-5xl"
            >
              {movie.title} <span className="text-slate-400">({movie.year})</span>
            </h2>
            {movie.originalTitle && (
              <p className="mt-1 text-sm text-slate-400">{movie.originalTitle}</p>
            )}
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-300">
              {certification && (
                <span className="rounded border border-white/30 px-1.5 text-xs">
                  {certification}
                </span>
              )}
              {details.releaseDate && <span>{formatDate(details.releaseDate)}</span>}
              {movie.genres?.length ? <span>{movie.genres.join(", ")}</span> : null}
              {movie.runtime ? (
                <span>
                  {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                </span>
              ) : null}
            </p>
            {movie.rating ? (
              <p className="mt-3 text-sm text-slate-300" data-testid="details-score">
                <span className="text-2xl font-semibold text-amber-300">
                  {Math.round(movie.rating * 10)}%
                </span>{" "}
                user score · {movie.rank.toLocaleString("en-GB")} votes on TMDB
              </p>
            ) : null}
            {details.tagline && (
              <p className="mt-4 text-slate-300 italic" data-testid="details-tagline">
                {details.tagline}
              </p>
            )}
            {details.overview && (
              <>
                <h3 className="mt-4 text-sm font-medium text-slate-100">Overview</h3>
                <p className="mt-1 max-w-prose text-sm leading-relaxed text-slate-300">
                  {details.overview}
                </p>
              </>
            )}
            {(details.directors.length > 0 || details.writers.length > 0) && (
              <dl
                className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3"
                data-testid="details-crew"
              >
                {keyCrew(details).map((person) => (
                  <div key={person.name}>
                    <dt className="text-sm font-medium text-slate-100">{person.name}</dt>
                    <dd className="text-xs text-slate-400">{person.jobs.join(", ")}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </header>

      <div className="px-6 pb-10 sm:px-10">
        {details.cast.length > 0 && (
          <section className="mt-6" data-testid="details-cast">
            <SectionTitle>Top billed cast</SectionTitle>
            <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
              {details.cast.map((person) => (
                <li key={`${person.name}-${person.character}`} className="w-28 shrink-0">
                  {person.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- TMDB CDN
                    <img
                      src={tmdbImage(person.photo, "w185")}
                      alt=""
                      loading="lazy"
                      className="aspect-[2/3] w-full rounded-lg bg-slate-800 object-cover ring-1 ring-white/10"
                    />
                  ) : (
                    <div className="flex aspect-[2/3] w-full items-center justify-center rounded-lg bg-slate-800 text-2xl text-slate-500">
                      {person.name.charAt(0)}
                    </div>
                  )}
                  <p className="mt-1.5 truncate text-sm font-medium text-slate-100">
                    {person.name}
                  </p>
                  {person.character && (
                    <p className="truncate text-xs text-slate-400">{person.character}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <Trailer details={details} title={movie.title} />
        <WhereToWatch details={details} title={movie.title} />

        <section className="mt-8">
          <SectionTitle>Facts</SectionTitle>
          <dl
            className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3"
            data-testid="details-facts"
          >
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="text-sm text-slate-100">{value}</dd>
              </div>
            ))}
          </dl>
          {countries.length > 0 && (
            <>
              <p className="mt-5 text-xs text-slate-500">
                Production countries — show on the globe
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {countries.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onSelectCountry(c.id)}
                      className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-sm text-amber-100 transition hover:bg-amber-300/20 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none"
                    >
                      🌍 {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {moreFromHome.length > 0 && homeName && (
          <section className="mt-8">
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
          <section className="mt-8">
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

        {details.keywords.length > 0 && (
          <section className="mt-8">
            <SectionTitle>Keywords</SectionTitle>
            <ul className="flex flex-wrap gap-2" data-testid="details-keywords">
              {details.keywords.map((k) => (
                <li key={k} className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                  {k}
                </li>
              ))}
            </ul>
          </section>
        )}

        {links.length > 0 && (
          <section className="mt-8">
            <SectionTitle>Links</SectionTitle>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {links.map((l) => (
                <li key={l.label}>
                  <External href={l.href}>{l.label} ↗</External>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-10 text-xs text-slate-500">
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
    if (el && !el.open) el.showModal();
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
      className="details-sheet pointer-events-auto fixed inset-x-0 top-auto bottom-0 mx-auto mb-0 h-[94dvh] max-h-none w-full max-w-5xl overflow-hidden rounded-t-3xl border border-b-0 border-white/10 bg-slate-950 p-0 text-slate-200 shadow-2xl backdrop:bg-black/60 sm:h-[90dvh]"
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
          <span className="h-1.5 w-12 rounded-full bg-white/25" />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="absolute top-3 right-4 z-10 flex size-9 items-center justify-center rounded-full bg-slate-900/80 text-lg text-slate-200 ring-1 ring-white/15 transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none"
        >
          ✕
        </button>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          data-testid="details-scroll"
        >
          {state.status === "ready" ? (
            <Body {...props} details={state.details} />
          ) : (
            <div className="px-6 pt-6 sm:px-10">
              <h2 id="details-title" className="font-display text-4xl text-slate-50">
                {movie.title} <span className="text-slate-400">({movie.year})</span>
              </h2>
              <p className="mt-4 text-sm text-slate-400" role="status">
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
