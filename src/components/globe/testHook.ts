import type { GlobeMethods } from "react-globe.gl";

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
export const installTestHook = (globe: GlobeMethods) => {
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
