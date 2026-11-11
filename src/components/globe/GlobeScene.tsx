"use client";

// The only module that touches react-globe.gl and three.js. Loaded with `ssr: false` from
// MovieGlobe, because WebGL needs a browser. It owns no app state: props in, events out. Camera
// moves are effects of `selectedId` changing, so the view always matches the selection.

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  MeshPhongMaterial,
  Points,
  PointsMaterial,
} from "three";
import { useElementSize } from "@/hooks/useElementSize";
import {
  FOCUS_DURATION_MS,
  focusView,
  globalViewFrom,
  initialView,
  RESET_DURATION_MS,
} from "@/lib/geo/camera";
import { countryAt, type Country } from "@/lib/geo/countries";
import { countryTooltipHtml, globeTheme as theme } from "@/lib/globe/theme";

export type GlobeSceneProps = {
  countries: Country[];
  selectedId: string | null;
  hoveredId: string | null;
  /** Turn slowly when idle. MovieGlobe enables it in the global view only. */
  autoRotate: boolean;
  reducedMotion: boolean;
  onHover: (countryId: string | null) => void;
  onSelect: (countryId: string) => void;
};

const STAR_COUNT = 1800;
/** Pointer travel (px) between press and release above which it counts as a drag, not a click. */
const CLICK_SLOP_PX = 6;

/** A shell of faint stars around the globe. They sit still while the camera orbits, giving depth. */
const createStarfield = () => {
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);
  const color = new Color();
  for (let i = 0; i < STAR_COUNT; i++) {
    // Uniform direction on a sphere, at a random distance well outside the globe (radius 100).
    const y = Math.random() * 2 - 1;
    const angle = Math.random() * Math.PI * 2;
    const ring = Math.sqrt(1 - y * y);
    const radius = 1400 + Math.random() * 1600;
    positions.set(
      [radius * ring * Math.cos(angle), radius * y, radius * ring * Math.sin(angle)],
      i * 3,
    );
    color.setHSL(0.58 + Math.random() * 0.08, 0.35, 0.55 + Math.random() * 0.4);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  const material = new PointsMaterial({
    size: 1.5,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  return new Points(geometry, material);
};

const asCountry = (d: object) => d as Country;

/** What the browser tests can reach on `window.__moviePassportGlobe`; see installTestHook. */
export type GlobeTestHook = {
  pointOfView: () => { lat: number; lng: number; altitude: number };
  setPointOfView: (pov: { lat: number; lng: number; altitude: number }) => void;
  screenCoords: (lat: number, lng: number) => { x: number; y: number };
};

/**
 * Lets Playwright aim at a country's exact screen position. Compiled in only when the build sets
 * NEXT_PUBLIC_GLOBE_TEST_HOOK=1 (the e2e build does; `pnpm build` does not), so production bundles
 * never expose the globe.
 */
const installTestHook = (globe: GlobeMethods) => {
  if (process.env.NEXT_PUBLIC_GLOBE_TEST_HOOK !== "1") return () => {};
  const hook: GlobeTestHook = {
    pointOfView: () => globe.pointOfView(),
    setPointOfView: (pov) => void globe.pointOfView(pov),
    screenCoords: (lat, lng) => globe.getScreenCoords(lat, lng),
  };
  const w = window as Window & { __moviePassportGlobe?: GlobeTestHook };
  w.__moviePassportGlobe = hook;
  return () => {
    if (w.__moviePassportGlobe === hook) delete w.__moviePassportGlobe;
  };
};

const GlobeScene = ({
  countries,
  selectedId,
  hoveredId,
  autoRotate,
  reducedMotion,
  onHover,
  onSelect,
}: GlobeSceneProps) => {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [containerRef, size] = useElementSize<HTMLDivElement>();
  const [ready, setReady] = useState(false);
  const aspectRef = useRef(16 / 9);
  const lastSelectedId = useRef<string | null>(null);

  useEffect(() => {
    if (size.width > 0 && size.height > 0) aspectRef.current = size.width / size.height;
  }, [size]);

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

  const selected = useMemo(
    () => countries.find((c) => c.id === selectedId) ?? null,
    [countries, selectedId],
  );

  // Scene setup once the globe exists: first viewpoint, zoom limits, starfield.
  useEffect(() => {
    const globe = globeRef.current;
    if (!ready || !globe) return;

    globe.pointOfView(initialView(aspectRef.current));

    const controls = globe.controls();
    const radius = globe.getGlobeRadius();
    controls.minDistance = radius * 1.2;
    controls.maxDistance = radius * 5;
    controls.enablePan = false;

    const stars = createStarfield();
    globe.scene().add(stars);
    const removeTestHook = installTestHook(globe);
    return () => {
      removeTestHook();
      globe.scene().remove(stars);
      stars.geometry.dispose();
      (stars.material as PointsMaterial).dispose();
    };
  }, [ready]);

  // Camera follows the selection: focus on a country, or zoom back out when it is cleared.
  useEffect(() => {
    const globe = globeRef.current;
    if (!ready || !globe) return;
    const previous = lastSelectedId.current;
    lastSelectedId.current = selected?.id ?? null;

    if (selected) {
      globe.pointOfView(
        focusView(selected, aspectRef.current),
        reducedMotion ? 0 : FOCUS_DURATION_MS,
      );
    } else if (previous) {
      const view = globalViewFrom(globe.pointOfView(), aspectRef.current);
      globe.pointOfView(view, reducedMotion ? 0 : RESET_DURATION_MS);
    }
  }, [ready, selected, reducedMotion]);

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

  // Layer accessors change identity with hover/selection, which tells the globe to restyle.
  const capColor = useCallback(
    (d: object) => {
      const { id } = asCountry(d);
      if (id === selectedId) return theme.landSelected;
      if (id === hoveredId) return theme.landHover;
      return selectedId ? theme.landDimmed : theme.land;
    },
    [selectedId, hoveredId],
  );
  const sideColor = useCallback(
    (d: object) => (asCountry(d).id === selectedId ? theme.sideSelected : theme.side),
    [selectedId],
  );
  const strokeColor = useCallback(
    (d: object) => {
      const { id } = asCountry(d);
      if (id === selectedId) return theme.strokeSelected;
      return selectedId && id !== hoveredId ? theme.strokeDimmed : theme.stroke;
    },
    [selectedId, hoveredId],
  );
  const altitude = useCallback(
    (d: object) => {
      const { id } = asCountry(d);
      if (id === selectedId) return theme.altitude.selected;
      if (id === hoveredId) return theme.altitude.hover;
      return theme.altitude.base;
    },
    [selectedId, hoveredId],
  );
  // No tooltip for the selected country: the panel already names it.
  const label = useCallback(
    (d: object) => {
      const { id, name, continent } = asCountry(d);
      return id === selectedId ? "" : countryTooltipHtml(name, continent);
    },
    [selectedId],
  );

  const handleHover = useCallback(
    (d: object | null) => onHover(d ? asCountry(d).id : null),
    [onHover],
  );
  const handleReady = useCallback(() => setReady(true), []);

  // Clicks and taps are resolved here from the release position, not with the library's
  // onPolygonClick: that reports whatever its last throttled (50 ms) hover raycast found, so a
  // quick tap or a click right after the pointer arrives can select nothing, or the wrong country.
  const pressRef = useRef<{ x: number; y: number } | null>(null);
  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    pressRef.current =
      event.isPrimary && event.button === 0 ? { x: event.clientX, y: event.clientY } : null;
  }, []);
  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const press = pressRef.current;
      pressRef.current = null;
      const globe = globeRef.current;
      if (!press || !globe || !event.isPrimary) return;
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > CLICK_SLOP_PX) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const coords = globe.toGlobeCoords(event.clientX - rect.left, event.clientY - rect.top);
      const country = coords && countryAt(countries, coords.lat, coords.lng);
      if (country) onSelect(country.id);
    },
    [countries, onSelect],
  );

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      data-testid="globe-canvas"
      data-ready={ready}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      style={{ cursor: hoveredId ? "pointer" : "grab" }}
      role="img"
      aria-label="Interactive 3D globe. Drag to rotate, scroll or pinch to zoom, select a country to focus on it."
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
          polygonsData={countries}
          polygonCapColor={capColor}
          polygonSideColor={sideColor}
          polygonStrokeColor={strokeColor}
          polygonAltitude={altitude}
          polygonLabel={label}
          polygonsTransitionDuration={reducedMotion ? 0 : theme.polygonTransitionMs}
          onPolygonHover={handleHover}
        />
      )}
    </div>
  );
};

export default GlobeScene;
