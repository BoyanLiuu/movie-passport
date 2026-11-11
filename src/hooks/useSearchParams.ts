"use client";

import { useSyncExternalStore } from "react";

// A tiny URL query store. (Next's useSearchParams would force a Suspense boundary around the
// statically prerendered page; this reads the URL only in the browser and is "" on the server.)

const URL_CHANGE = "moviepassport:urlchange";

const subscribe = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);
  window.addEventListener(URL_CHANGE, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(URL_CHANGE, onChange);
  };
};

export const useSearchString = () =>
  useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );

/** Sets or removes one query parameter without adding a history entry. */
export const setSearchParam = (key: string, value: string | null) => {
  const url = new URL(window.location.href);
  if (value === null) url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(URL_CHANGE));
};
