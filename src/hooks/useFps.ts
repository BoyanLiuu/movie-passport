"use client";

import { useEffect, useState } from "react";

/** Frames per second, sampled every half second. Only runs while `enabled`. */
export const useFps = (enabled: boolean) => {
  const [fps, setFps] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let frames = 0;
    let start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      frames++;
      if (now - start >= 500) {
        setFps(Math.round((frames * 1000) / (now - start)));
        frames = 0;
        start = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [enabled]);

  return enabled ? fps : null;
};
