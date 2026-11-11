"use client";

import { useEffect, useState } from "react";

type Measured = {
  panel: HTMLElement;
  left: number;
  top: number;
  topInset: number;
  vw: number;
  vh: number;
};

/**
 * How far to shift the globe's centre so the focused place sits in the middle of the free space:
 * left by half the panel's share of the width when it sits on the right (wide screens); on phones,
 * to the middle of the band between the top overlay (title, search) and the bottom sheet.
 */
export const panelOffset = (
  rect: { left: number; top: number },
  viewport: { width: number; height: number },
  topInset = 0,
): [number, number] =>
  rect.left > viewport.width / 2
    ? [-Math.round((viewport.width - rect.left) / 2), 0]
    : [0, Math.round((topInset - (viewport.height - rect.top)) / 2)];

/** `top` is the overlay along the top edge, which only matters when the panel is a bottom sheet. */
export const usePanelOffset = (
  panel: HTMLElement | null,
  top: HTMLElement | null = null,
): [number, number] => {
  const [measured, setMeasured] = useState<Measured | null>(null);

  useEffect(() => {
    if (!panel) return;
    const measure = () => {
      const rect = panel.getBoundingClientRect();
      setMeasured({
        panel,
        left: rect.left,
        top: rect.top,
        topInset: top?.getBoundingClientRect().bottom ?? 0,
        vw: window.innerWidth,
        vh: window.innerHeight,
      });
    };
    const observer = new ResizeObserver(measure); // also fires once on observe
    observer.observe(panel);
    if (top) observer.observe(top);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [panel, top]);

  if (!panel || measured?.panel !== panel) return [0, 0];
  return panelOffset(measured, { width: measured.vw, height: measured.vh }, measured.topInset);
};
