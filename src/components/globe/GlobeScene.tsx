"use client";

// The only component that touches react-globe.gl and three.js. Loaded with `ssr: false` from
// MovieGlobe, because WebGL needs a browser. It owns no app state: props in, events out. Camera
// moves are effects of `focus` changing, so the view always matches the selection.

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { MeshPhongMaterial, type PerspectiveCamera } from "three";
import type { Movie } from "@/data/movies";
import { useElementSize } from "@/hooks/useElementSize";
import {
  FOCUS_DURATION_MS,
  type FocusTarget,
  globalViewFrom,
  initialView,
  RESET_DURATION_MS,
} from "@/lib/geo/camera";
import { countryAt, type Country } from "@/lib/geo/countries";
import { filmCountLabel } from "@/lib/catalogue";
import { countryTooltipHtml, globeTheme as theme, landColorFor } from "@/lib/globe/theme";
import { angularDistance } from "@/lib/geo/countries";
import {
  FILM_VIEW_POSTERS,
  MAX_RENDERED_POSTERS,
  posterLimit,
  posterWidth,
  printSpacing,
  selectPosters,
} from "@/lib/movies/posters";
import { createPosterElement, posterAt, setPosterVisibility } from "./posters/htmlPosters";
import { createSpritePosters, type SpritePosters } from "./posters/spritePosters";
import { createPlateTexture } from "./plateTexture";
import { createNightSky } from "./nightSky";
import { installTestHook } from "./testHook";

export type PosterRenderer = "html" | "sprites";

export type GlobeSceneProps = {
  countries: Country[];
  /** Drawn as selected: the country in country view, every production country in movie view. */
  highlightedIds: string[];
  hoveredId: string | null;
  /** What the camera frames; null is the global view. */
  focus: FocusTarget | null;
  /** Films in the catalogue per country id: lit countries, and the count in the tooltip. */
  filmCounts: ReadonlyMap<string, number>;
  movies: Movie[];
  /** In country view, the films that keep their posters (those from it); the rest fade out. */
  focusMovieIds: string[] | null;
  selectedMovieId: string | null;
  /** A film highlighted from outside the globe (e.g. hovering it in the country's film list). */
  linkedMovieId: string | null;
  /** Shift (px) of the globe's centre, to keep the focus clear of an open panel. Eased here. */
  viewOffset: [number, number];
  posterRenderer: PosterRenderer;
  /** Show only the top-ranked posters when zoomed out (on unless stress-testing). */
  capPosters: boolean;
  /** Turn slowly when idle. MovieGlobe enables it in the global view only. */
  autoRotate: boolean;
  /** Stop rendering while something covers the globe (the details sheet). */
  paused?: boolean;
  reducedMotion: boolean;
  onHover: (countryId: string | null) => void;
  onSelectCountry: (countryId: string) => void;
  onSelectMovie: (movieId: string) => void;
};

/** Pointer travel (px) between press and release above which it counts as a drag, not a click. */
const CLICK_SLOP_PX = 6;
/** Posters float just above the polygons, in globe radii. */
const POSTER_ALTITUDE = 0.01;
/** How long the globe takes to slide out from under a panel. */
const OFFSET_DURATION_MS = 900;
/** The globe's build-in spin (react-globe.gl `animateIn`) lasts 1.2 s. */
const ANIMATE_IN_MS = 1300;

const asCountry = (d: object) => d as Country;

const GlobeScene = ({
  countries,
  highlightedIds,
  hoveredId,
  focus,
  filmCounts,
  movies,
  focusMovieIds,
  selectedMovieId,
  linkedMovieId,
  viewOffset,
  posterRenderer,
  capPosters,
  autoRotate,
  paused = false,
  reducedMotion,
  onHover,
  onSelectCountry,
  onSelectMovie,
}: GlobeSceneProps) => {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [containerRef, size] = useElementSize<HTMLDivElement>();
  const [ready, setReady] = useState(false);
  // Sprites live in the root scene, outside the globe group that spins during `animateIn`.
  const [settled, setSettled] = useState(false);
  const sizeRef = useRef(size);
  const lastFocusKey = useRef<string | null>(null);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);
  const aspect = useCallback(() => {
    const { width, height } = sizeRef.current;
    return width > 0 && height > 0 ? width / height : 16 / 9;
  }, []);

  // The rocked plate: velvet grain under a soft Phong shading, so the sphere still reads as a sphere.
  const globeMaterial = useMemo(
    () =>
      new MeshPhongMaterial({
        map: createPlateTexture(),
        color: "#ffffff",
        emissive: theme.oceanEmissive,
        specular: theme.oceanSpecular,
        shininess: 3,
      }),
    [],
  );
  useEffect(
    () => () => {
      globeMaterial.map?.dispose();
      globeMaterial.dispose();
    },
    [globeMaterial],
  );

  const highlightKey = highlightedIds.join(",");
  const highlighted = useMemo(
    () => new Set(highlightKey ? highlightKey.split(",") : []),
    [highlightKey],
  );

  // ---- Posters -------------------------------------------------------------------------------

  // Where the camera looked when the poster set was last chosen. Updated only when the camera has
  // moved a few degrees or changed zoom band, so the set doesn't churn every frame.
  const [posterView, setPosterView] = useState<{
    lat: number;
    lng: number;
    altitude: number;
  } | null>(null);
  const posterViewRef = useRef(posterView);
  const focusKey = focusMovieIds?.join(",") ?? null;
  const focusSet = useMemo(
    () => (focusKey === null ? null : new Set(focusKey ? focusKey.split(",") : [])),
    [focusKey],
  );
  // The capped, spaced set for the current view. In country view, the country's own films are
  // chosen the same way (best first, spaced so no print covers another); the global set stays
  // rendered but faded out (data-out) so posters animate both ways. In film view, only a few
  // spaced prints stay around the selected one, so the film remains the subject.
  const shownPosters = useMemo(() => {
    const altitude = posterView?.altitude ?? initialView().altitude;
    const always = new Set(selectedMovieId ? [selectedMovieId] : []);
    const pick = (list: Movie[], limit: number, spacing?: number) =>
      selectPosters(list, {
        limit: capPosters ? limit : Infinity,
        center: capPosters ? posterView : null,
        altitude,
        always,
        spacing,
      });
    if (!focusSet && selectedMovieId) {
      return pick(movies, FILM_VIEW_POSTERS, printSpacing(altitude));
    }
    const global = pick(movies, posterLimit(altitude));
    if (!focusSet) return global;
    const local = pick(
      movies.filter((m) => focusSet.has(m.id)),
      MAX_RENDERED_POSTERS,
      printSpacing(altitude),
    );
    const ids = new Set(local.map((m) => m.id));
    return [...local, ...global.filter((m) => !ids.has(m.id))];
  }, [movies, capPosters, posterView, selectedMovieId, focusSet]);
  const focusSetRef = useRef(focusSet);
  const anchors = useRef(new Map<string, HTMLElement>());
  // While the pointer is on a poster, the country underneath shouldn't light up as well.
  const [posterHovered, setPosterHovered] = useState(false);
  const sprites = useRef<SpritePosters | null>(null);
  const selectedMovieRef = useRef(selectedMovieId);
  const onSelectMovieRef = useRef(onSelectMovie);
  useEffect(() => {
    selectedMovieRef.current = selectedMovieId;
    onSelectMovieRef.current = onSelectMovie;
    focusSetRef.current = focusSet;
  });

  /** Poster width in world units that appears `px` wide at this altitude (sprites only). */
  const spriteWidth = useCallback((px: number, altitude: number) => {
    const globe = globeRef.current;
    if (!globe) return 1;
    const camera = globe.camera() as PerspectiveCamera;
    const distance = altitude * globe.getGlobeRadius();
    const worldPerPx =
      (2 * distance * Math.tan((camera.fov * Math.PI) / 360)) / (sizeRef.current.height || 1);
    return px * worldPerPx;
  }, []);

  /** Poster size and how many posters show both follow the camera altitude. */
  const applyAltitude = useCallback(
    (altitude: number) => {
      const px = posterWidth(altitude);
      containerRef.current?.style.setProperty("--poster-width", `${px}px`);
      sprites.current?.resize(spriteWidth(px, altitude));
    },
    [containerRef, spriteWidth],
  );
  const handleZoom = useCallback(
    (pov: { lat: number; lng: number; altitude: number }) => {
      applyAltitude(pov.altitude);
      const last = posterViewRef.current;
      const moved =
        !last ||
        angularDistance(last.lat, last.lng, pov.lat, pov.lng) > 4 ||
        posterLimit(last.altitude) !== posterLimit(pov.altitude) ||
        Math.abs(last.altitude - pov.altitude) > 0.25;
      if (moved) {
        const view = { lat: pov.lat, lng: pov.lng, altitude: pov.altitude };
        posterViewRef.current = view;
        setPosterView(view);
      }
    },
    [applyAltitude],
  );

  const htmlElement = useCallback((d: object) => {
    const movie = d as Movie;
    const anchor = createPosterElement(movie, (id) => onSelectMovieRef.current(id));
    anchor.toggleAttribute("data-selected", movie.id === selectedMovieRef.current);
    anchor.toggleAttribute("data-out", !!focusSetRef.current && !focusSetRef.current.has(movie.id));
    anchors.current.set(movie.id, anchor);
    return anchor;
  }, []);

  // Preview before commit: hovering a country brings all of its posters up to full light.
  const homeById = useMemo(() => new Map(movies.map((m) => [m.id, m.home])), [movies]);
  const previewHome = useMemo(
    () => (hoveredId ? (countries.find((c) => c.id === hoveredId)?.iso2 ?? null) : null),
    [hoveredId, countries],
  );

  useEffect(() => {
    for (const [id, anchor] of anchors.current) {
      anchor.toggleAttribute("data-selected", id === selectedMovieId);
      anchor.toggleAttribute("data-linked", id === linkedMovieId);
      anchor.toggleAttribute("data-out", !!focusSet && !focusSet.has(id));
      anchor.toggleAttribute("data-preview", !!previewHome && homeById.get(id) === previewHome);
    }
  }, [selectedMovieId, linkedMovieId, focusSet, shownPosters, previewHome, homeById]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => setSettled(true), reducedMotion ? 0 : ANIMATE_IN_MS);
    return () => window.clearTimeout(timer);
  }, [ready, reducedMotion]);

  // Sprite spike: rebuild the sprite group whenever the visible set changes.
  useEffect(() => {
    const globe = globeRef.current;
    if (!settled || !globe || posterRenderer !== "sprites") return;
    const spriteSet = focusSet ? shownPosters.filter((m) => focusSet.has(m.id)) : shownPosters;
    const group = createSpritePosters(spriteSet, (lat, lng) =>
      globe.getCoords(lat, lng, POSTER_ALTITUDE),
    );
    const { altitude } = globe.pointOfView();
    group.resize(spriteWidth(posterWidth(altitude), altitude));
    globe.scene().add(group.group);
    sprites.current = group;
    return () => {
      globe.scene().remove(group.group);
      group.dispose();
      sprites.current = null;
    };
  }, [settled, posterRenderer, shownPosters, focusSet, spriteWidth]);

  // ---- Scene and camera ----------------------------------------------------------------------

  // Ease the globe's centre towards the requested offset alongside the camera move.
  const [targetX, targetY] = viewOffset;
  const [offset, setOffset] = useState<[number, number]>([0, 0]);
  const offsetRef = useRef(offset);
  useEffect(() => {
    const from = offsetRef.current;
    if (from[0] === targetX && from[1] === targetY) return;
    const duration = reducedMotion ? 0 : OFFSET_DURATION_MS;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = duration ? Math.min(1, (now - start) / duration) : 1;
      const eased = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      const next: [number, number] = [
        from[0] + (targetX - from[0]) * eased,
        from[1] + (targetY - from[1]) * eased,
      ];
      offsetRef.current = next;
      setOffset(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [targetX, targetY, reducedMotion]);

  // Scene setup once the globe exists: first viewpoint, zoom limits.
  useEffect(() => {
    const globe = globeRef.current;
    if (!ready || !globe) return;

    const view = initialView(aspect());
    globe.pointOfView(view);
    handleZoom(view);

    const controls = globe.controls();
    const radius = globe.getGlobeRadius();
    controls.minDistance = radius * 1.2;
    controls.maxDistance = radius * 5;
    controls.enablePan = false;

    return installTestHook(globe);
  }, [ready, handleZoom, aspect]);

  // The night sky. Built in idle time after the globe is up: it is scenery, so it shouldn't hold up
  // the first interaction.
  useEffect(() => {
    const globe = globeRef.current;
    if (!ready || !globe) return;
    let sky: ReturnType<typeof createNightSky> | null = null;
    const build = () => {
      sky = createNightSky();
      globe.scene().add(sky.group);
    };
    const idle = typeof requestIdleCallback === "function";
    const handle = idle
      ? requestIdleCallback(build, { timeout: 2000 })
      : window.setTimeout(build, 300);
    return () => {
      if (idle) cancelIdleCallback(handle);
      else window.clearTimeout(handle);
      if (sky) {
        globe.scene().remove(sky.group);
        sky.dispose();
      }
    };
  }, [ready]);

  // Camera follows the focus target, or zooms back out when it is cleared.
  useEffect(() => {
    const globe = globeRef.current;
    if (!ready || !globe) return;
    const previous = lastFocusKey.current;
    lastFocusKey.current = focus?.key ?? null;

    if (focus) {
      if (focus.key === previous) return;
      globe.pointOfView(focus.view(aspect()), reducedMotion ? 0 : FOCUS_DURATION_MS);
    } else if (previous) {
      const view = globalViewFrom(globe.pointOfView(), aspect());
      globe.pointOfView(view, reducedMotion ? 0 : RESET_DURATION_MS);
    }
  }, [ready, focus, reducedMotion, aspect]);

  // The details sheet covers the globe: stop rendering frames until it closes.
  useEffect(() => {
    const globe = globeRef.current;
    if (!ready || !globe) return;
    if (paused) globe.pauseAnimation();
    else globe.resumeAnimation();
  }, [ready, paused]);

  // Idle auto-rotation: starts after any camera transition settles, pauses while the user drags,
  // and resumes a few seconds after they let go.
  useEffect(() => {
    const globe = globeRef.current;
    if (!ready || !globe) return;
    const controls = globe.controls();
    controls.autoRotateSpeed = theme.autoRotateSpeed;
    controls.autoRotate = false;
    if (!autoRotate || reducedMotion) return;

    let timer = window.setTimeout(() => (controls.autoRotate = true), RESET_DURATION_MS);
    const pause = () => {
      window.clearTimeout(timer);
      controls.autoRotate = false;
    };
    const resumeLater = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => (controls.autoRotate = true), theme.idleResumeMs);
    };
    controls.addEventListener("start", pause);
    controls.addEventListener("end", resumeLater);
    return () => {
      window.clearTimeout(timer);
      controls.removeEventListener("start", pause);
      controls.removeEventListener("end", resumeLater);
      controls.autoRotate = false;
    };
  }, [ready, autoRotate, reducedMotion]);

  // ---- Country layer accessors (identity changes tell the globe to restyle) -----------------

  const hoveredCountryId = posterHovered ? null : hoveredId;

  const capColor = useCallback(
    (d: object) => {
      const { id } = asCountry(d);
      if (highlighted.has(id)) {
        return (filmCounts.get(id) ?? 0) > 0 ? theme.landSelected : theme.landSelectedEmpty;
      }
      if (id === hoveredCountryId) return theme.landHover;
      return highlighted.size > 0 ? theme.landDimmed : landColorFor(filmCounts.get(id) ?? 0);
    },
    [highlighted, hoveredCountryId, filmCounts],
  );
  const sideColor = useCallback(
    (d: object) => {
      const { id } = asCountry(d);
      return highlighted.has(id) && (filmCounts.get(id) ?? 0) > 0 ? theme.sideSelected : theme.side;
    },
    [highlighted, filmCounts],
  );
  const strokeColor = useCallback(
    (d: object) => {
      const { id } = asCountry(d);
      if (highlighted.has(id)) return theme.strokeSelected;
      return highlighted.size > 0 && id !== hoveredCountryId ? theme.strokeDimmed : theme.stroke;
    },
    [highlighted, hoveredCountryId],
  );
  const altitude = useCallback(
    (d: object) => {
      const { id, kind } = asCountry(d);
      // Discs for small places sit above the bigger shape they may overlap (Hong Kong on China).
      const lift = kind === "place" ? theme.altitude.place : 0;
      if (highlighted.has(id)) return theme.altitude.selected + lift;
      if (id === hoveredCountryId) return theme.altitude.hover + lift;
      return theme.altitude.base + lift;
    },
    [highlighted, hoveredCountryId],
  );
  // No tooltip on highlighted countries: the panel already names them.
  const label = useCallback(
    (d: object) => {
      const { id, name, continent, note } = asCountry(d);
      if (highlighted.has(id)) return "";
      const films = filmCountLabel(filmCounts.get(id) ?? 0);
      return countryTooltipHtml(name, note ?? continent, films);
    },
    [highlighted, filmCounts],
  );

  const handleHover = useCallback(
    (d: object | null) => onHover(d ? asCountry(d).id : null),
    [onHover],
  );
  const handleReady = useCallback(() => setReady(true), []);

  // ---- Pointer: clicks, taps and poster hover ------------------------------------------------
  //
  // Resolved here from the pointer position rather than with the library's onPolygonClick: that
  // reports its last throttled (50 ms) hover raycast, so a quick tap could select nothing or the
  // wrong country. Posters are checked first so a poster wins over the country beneath it.

  const posterUnder = (clientX: number, clientY: number, rect: DOMRect) => {
    if (posterRenderer === "html") return posterAt(anchors.current.values(), clientX, clientY);
    const globe = globeRef.current;
    if (!sprites.current || !globe) return null;
    const ndc = {
      x: ((clientX - rect.left) / rect.width) * 2 - 1,
      y: -((clientY - rect.top) / rect.height) * 2 + 1,
    };
    return sprites.current.hit(ndc, globe.camera(), globe.getGlobeRadius());
  };

  const press = useRef<{ x: number; y: number } | null>(null);
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    press.current =
      event.isPrimary && event.button === 0 ? { x: event.clientX, y: event.clientY } : null;
  };
  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = press.current;
    press.current = null;
    const globe = globeRef.current;
    if (!start || !globe || !event.isPrimary) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > CLICK_SLOP_PX) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const movieId = posterUnder(event.clientX, event.clientY, rect);
    if (movieId) return onSelectMovie(movieId);

    const coords = globe.toGlobeCoords(event.clientX - rect.left, event.clientY - rect.top);
    const country = coords && countryAt(countries, coords.lat, coords.lng);
    if (country) onSelectCountry(country.id);
  };

  const hover = useRef({ frame: 0, x: 0, y: 0, posterId: null as string | null });
  const setPosterHover = useCallback(
    (posterId: string | null) => {
      const state = hover.current;
      if (state.posterId === posterId) return;
      if (state.posterId) anchors.current.get(state.posterId)?.removeAttribute("data-hover");
      if (posterId) anchors.current.get(posterId)?.setAttribute("data-hover", "");
      state.posterId = posterId;
      containerRef.current?.toggleAttribute("data-poster-hover", posterId !== null);
      setPosterHovered(posterId !== null);
    },
    [containerRef],
  );
  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || posterRenderer !== "html") return;
    const state = hover.current;
    state.x = event.clientX;
    state.y = event.clientY;
    if (state.frame) return;
    state.frame = requestAnimationFrame(() => {
      state.frame = 0;
      setPosterHover(posterAt(anchors.current.values(), state.x, state.y));
    });
  };
  useEffect(() => {
    const state = hover.current;
    return () => cancelAnimationFrame(state.frame);
  }, []);

  return (
    <div
      ref={containerRef}
      // `isolate`: poster markers carry large z-indexes; keep them below the React overlays.
      className="globe-root absolute inset-0 isolate"
      data-testid="globe-canvas"
      data-ready={ready}
      data-highlighted={highlightKey}
      data-poster-renderer={posterRenderer}
      data-posters-shown={shownPosters.length}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setPosterHover(null)}
      style={{ cursor: hoveredCountryId ? "pointer" : "grab" }}
      role="img"
      aria-label="Interactive 3D globe. Drag to rotate, scroll or pinch to zoom, select a country or a poster to focus on it."
    >
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          globeOffset={offset}
          rendererConfig={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          globeMaterial={globeMaterial}
          animateIn={!reducedMotion}
          showAtmosphere
          atmosphereColor={theme.atmosphere}
          atmosphereAltitude={theme.atmosphereAltitude}
          onGlobeReady={handleReady}
          onZoom={handleZoom}
          polygonsData={countries}
          polygonCapColor={capColor}
          polygonSideColor={sideColor}
          polygonStrokeColor={strokeColor}
          polygonAltitude={altitude}
          polygonLabel={label}
          polygonsTransitionDuration={reducedMotion ? 0 : theme.polygonTransitionMs}
          onPolygonHover={handleHover}
          htmlElementsData={posterRenderer === "html" ? shownPosters : []}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude={POSTER_ALTITUDE}
          htmlElement={htmlElement}
          htmlElementVisibilityModifier={setPosterVisibility}
          htmlTransitionDuration={0}
        />
      )}
    </div>
  );
};

export default GlobeScene;
