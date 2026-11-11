type GlobeStatusProps =
  { kind: "loading" } | { kind: "error"; title: string; detail?: string; onRetry?: () => void };

/** Centred message over the globe area: loading, failed data fetch, or no WebGL. */
export const GlobeStatus = (props: GlobeStatusProps) => (
  <div
    className="absolute inset-0 flex items-center justify-center p-6"
    role={props.kind === "error" ? "alert" : "status"}
  >
    {props.kind === "loading" ? (
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <span
          aria-hidden
          className="size-16 rounded-full border border-slate-700 bg-[radial-gradient(circle_at_35%_30%,#1e293b,#020617)] shadow-[0_0_60px_-10px_#4f7cff] motion-safe:animate-pulse"
        />
        <span className="text-sm tracking-wide">Loading the globe…</span>
      </div>
    ) : (
      <div className="max-w-sm rounded-2xl border border-white/10 bg-slate-950/80 p-6 text-center backdrop-blur">
        <p className="font-medium text-slate-100">{props.title}</p>
        {props.detail && <p className="mt-2 text-sm text-slate-400">{props.detail}</p>}
        {props.onRetry && (
          <button
            type="button"
            onClick={props.onRetry}
            className="mt-4 rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:outline-none"
          >
            Try again
          </button>
        )}
      </div>
    )}
  </div>
);
