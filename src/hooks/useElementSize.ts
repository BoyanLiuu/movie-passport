"use client";

import { useEffect, useRef, useState } from "react";

/** Tracks an element's content size. The globe needs explicit pixel dimensions. */
export const useElementSize = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        prev.width === Math.round(width) && prev.height === Math.round(height)
          ? prev
          : { width: Math.round(width), height: Math.round(height) },
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
};
