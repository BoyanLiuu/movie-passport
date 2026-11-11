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

/**
 * Navigates to a new query string. `push` adds a history entry, so browser Back returns to the
 * previous view; Next.js integrates native pushState/replaceState with its router.
 */
export const navigateToSearch = (search: string, { replace = false } = {}) => {
  if (search === window.location.search) return;
  const url = `${window.location.pathname}${search}${window.location.hash}`;
  if (replace) window.history.replaceState(window.history.state, "", url);
  else window.history.pushState(null, "", url);
  window.dispatchEvent(new Event(URL_CHANGE));
};
