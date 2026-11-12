"use client";

import { panelFrame } from "@/components/ui/plate";
import { setSearchParam } from "@/hooks/useSearchParams";
import { useFps } from "@/hooks/useFps";
import { type DebugOptions, POSTER_COUNT_CHOICES } from "@/lib/debug";

type DebugPanelProps = { options: DebugOptions; posterCount: number };

/**
 * Developer overlay (`?debug`): frame rate and the poster-rendering spike controls. Bottom-left on
 * wide screens; under the title on phones, where the bottom belongs to the info sheet.
 */
export const DebugPanel = ({ options, posterCount }: DebugPanelProps) => {
  const fps = useFps(true);
  const fpsTone =
    fps === null
      ? "text-pewter"
      : fps >= 55
        ? "text-emerald-300"
        : fps >= 30
          ? "text-amber-300"
          : "text-rose-300";

  return (
    <aside
      aria-label="Debug panel"
      className={`${panelFrame} pointer-events-auto absolute top-44 left-3 w-56 p-3 font-mono text-[11px] text-silver sm:top-auto sm:bottom-3`}
    >
      <p className="flex items-baseline justify-between">
        <span className="text-pewter">FPS</span>
        <span data-testid="fps" data-fps={fps ?? ""} className={`text-lg ${fpsTone}`}>
          {fps ?? "–"}
        </span>
      </p>

      <label className="mt-2 flex items-center justify-between gap-2">
        <span className="text-pewter">Renderer</span>
        <select
          value={options.renderer}
          onChange={(e) => setSearchParam("renderer", e.target.value)}
          className="border border-smoke bg-velvet px-1 py-0.5"
        >
          <option value="html">HTML markers</option>
          <option value="sprites">three.js sprites</option>
        </select>
      </label>

      <label className="mt-2 flex items-center justify-between gap-2">
        <span className="text-pewter">Posters</span>
        <select
          value={posterCount}
          onChange={(e) => setSearchParam("posters", e.target.value)}
          className="border border-smoke bg-velvet px-1 py-0.5"
        >
          {POSTER_COUNT_CHOICES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-2 flex items-center justify-between gap-2">
        <span className="text-pewter">Cap by zoom</span>
        <input
          type="checkbox"
          checked={options.cap}
          onChange={(e) => setSearchParam("cap", e.target.checked ? null : "0")}
        />
      </label>
    </aside>
  );
};
