"use client";

import { useCallback, useEffect, useState } from "react";
import { parseCountries, type Country } from "@/lib/geo/countries";

export const COUNTRIES_URL = "/data/countries-110m.geojson";

export type CountriesState =
  | { status: "loading" }
  | { status: "ready"; countries: Country[] }
  | { status: "error"; message: string };

/** Loads the country boundaries once; `retry` refetches after a failure. */
export const useCountries = () => {
  const [state, setState] = useState<CountriesState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(COUNTRIES_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data: unknown) => setState({ status: "ready", countries: parseCountries(data) }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
};
