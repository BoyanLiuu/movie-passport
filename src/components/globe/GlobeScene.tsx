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
import { countryTooltipHtml, globeTheme as theme } from "@/lib/globe/theme";
import { posterLimit, posterWidth, visiblePosters } from "@/lib/movies/posters";
import { createPosterElement, posterAt, setPosterVisibility } from "./posters/htmlPosters";
import { createSpritePosters, type SpritePosters } from "./posters/spritePosters";
import { createStarfield } from "./starfield";
import { installTestHook } from "./testHook";

export type PosterRenderer = "html" | "sprites";

export type GlobeSceneProps = {
  countries: Country[];
  /** Drawn as selected: the country in country view, every production country in movie view. */
  highlightedIds: string[];
  hoveredId: string | null;
  /** What the camera frames; null is the global view. */
  focus: FocusTarget | null;
  movies: Movie[];
  selectedMovieId: string | null;
  posterRenderer: PosterRenderer;
  /** Show only the top-ranked posters when zoomed out (on unless stress-testing). */
  capPosters: boolean;
  /** Turn slowly when idle. MovieGlobe enables it in the global view only. */
  autoRotate: boolean;
  reducedMotion: boolean;
  onHover: (countryId: string | null) => void;
  onSelectCountry: (countryId: string) => void;
  onSelectMovie: (movieId: string) => void;
};

/** Pointer travel (px) between press and release above which it counts as a drag, not a click. */
const CLICK_SLOP_PX = 6;
/** Posters float just above the polygons, in globe radii. */
const POSTER_ALTITUDE = 0.01;
/** The globe's build-in spin (react-globe.gl `animateIn`) lasts 1.2 s. */
const ANIMATE_IN_MS = 1300;

const asCountry = (d: object) => d as Country;

const GlobeScene = ({
  countries,
  highlightedIds,
  hoveredId,
  focus,
  movies,
  selectedMovieId,
  posterRenderer,
  capPosters,
  autoRotate,
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

  const globeMaterial = useMemo(
    () =>
      new MeshPhongMaterial({
        color: theme.ocean,
        emissive: theme.oceanEmissive,
        specular: theme.oceanSpecular,
        shininess: 14,
      }),
    [],
  );
  useEffect(() => () => globeMaterial.dispose(), [globeMaterial]);

  const highlightKey = highlightedIds.join(",");
  const highlighted = useMemo(
    () => new Set(highlightKey ? highlightKey.split(",") : []),
    [highlightKey],
  );

  // ---- Posters -------------------------------------------------------------------------------

  const [posterCap, setPosterCap] = useState(() => posterLimit(initialView().altitude));
  const shownPosters = useMemo(
    () => visiblePosters(movies, capPosters ? posterCap : Infinity, selectedMovieId),
    [movies, capPosters, posterCap, selectedMovieId],
  );
  const anchors = useRef(new Map<string, HTMLElement>());
  // While the pointer is on a poster, the country underneath shouldn't light up as well.
  const [posterHovered, setPosterHovered] = useState(false);
  const sprites = useRef<SpritePosters | null>(null);
  const selectedMovieRef = useRef(selectedMovieId);
  const onSelectMovieRef = useRef(onSelectMovie);
  useEffect(() => {
    selectedMovieRef.current = selectedMovieId;
    onSelectMovieRef.current = onSelectMovie;
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
      setPosterCap(posterLimit(altitude));
    },
    [containerRef, spriteWidth],
  );
  const handleZoom = useCallback(
    (pov: { altitude: number }) => applyAltitude(pov.altitude),
    [applyAltitude],
  );

  const htmlElement = useCallback((d: object) => {
    const movie = d as Movie;
    const anchor = createPosterElement(movie, (id) => onSelectMovieRef.current(id));
    anchor.toggleAttribute("data-selected", movie.id === selectedMovieRef.current);
    anchors.current.set(movie.id, anchor);
    return anchor;
  }, []);

  useEffect(() => {
    for (const [id, anchor] of anchors.current) {
      anchor.toggleAttribute("data-selected", id === selectedMovieId);
    }
  }, [selectedMovieId, shownPosters]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => setSettled(true), reducedMotion ? 0 : ANIMATE_IN_MS);
    return () => window.clearTimeout(timer);
  }, [ready, reducedMotion]);

  // Sprite spike: rebuild the sprite group whenever the visible set changes.
  useEffect(() => {
    const globe = globeRef.current;
    if (!settled || !globe || posterRenderer !== "sprites") return;
    const group = createSpritePosters(shownPosters, (lat, lng) =>
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
  }, [settled, posterRenderer, shownPosters, spriteWidth]);

  // ---- Scene and camera ----------------------------------------------------------------------

  // Scene setup once the globe exists: first viewpoint, zoom limits, starfield.
  useEffect(() => {
    const globe = globeRef.current;
    if (!ready || !globe) return;

    const view = initialView(aspect());
    globe.pointOfView(view);
    applyAltitude(view.altitude);

    const controls = globe.controls();
    const radius = globe.getGlobeRadius();
    controls.minDistance = radius * 1.2;
    controls.maxDistance = radius * 5;
    controls.enablePan = false;

    const { stars, dispose } = createStarfield();
    globe.scene().add(stars);
    const removeTestHook = installTestHook(globe);
    return () => {
      removeTestHook();
      globe.scene().remove(stars);
      dispose();
    };
  }, [ready, applyAltitude, aspect]);

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
      if (highlighted.has(id)) return theme.landSelected;
      if (id === hoveredCountryId) return theme.landHover;
      return highlighted.size > 0 ? theme.landDimmed : theme.land;
    },
    [highlighted, hoveredCountryId],
  );
  const sideColor = useCallback(
    (d: object) => (highlighted.has(asCountry(d).id) ? theme.sideSelected : theme.side),
    [highlighted],
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
      const { id } = asCountry(d);
      if (highlighted.has(id)) return theme.altitude.selected;
      if (id === hoveredCountryId) return theme.altitude.hover;
      return theme.altitude.base;
    },
    [highlighted, hoveredCountryId],
  );
  // No tooltip on highlighted countries: the panel already names them.
  const label = useCallback(
    (d: object) => {
      const { id, name, continent } = asCountry(d);
      return highlighted.has(id) ? "" : countryTooltipHtml(name, continent);
    },
    [highlighted],
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
