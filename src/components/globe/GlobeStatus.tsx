import { panelFrame, plateButton } from "@/components/ui/plate";

type GlobeStatusProps =
  { kind: "loading" } | { kind: "error"; title: string; detail?: string; onRetry?: () => void };

/** Centred message over the globe area: loading, failed data fetch, or no WebGL. */
export const GlobeStatus = (props: GlobeStatusProps) => (
  <div
    className="absolute inset-0 flex items-center justify-center p-6"
    role={props.kind === "error" ? "alert" : "status"}
  >
    {props.kind === "loading" ? (
      <div className="flex flex-col items-center gap-6">
        {/* The plate before it is burnished: a dark disc whose rim slowly catches the light. */}
        <span
          aria-hidden
          className="size-40 rounded-full border border-smoke bg-[radial-gradient(circle_at_40%_35%,#1d1915,#0b0b0b_72%)] shadow-[0_24px_60px_-20px_rgb(0_0_0/0.95)] motion-safe:animate-pulse"
        />
        <span className="engraved text-[11px] text-pewter">Loading the globe</span>
      </div>
    ) : (
      <div className={`${panelFrame} max-w-sm p-7 text-center`}>
        <p className="font-display text-lg tracking-[0.08em] text-silver-bright uppercase">
          {props.title}
        </p>
        {props.detail && <p className="mt-3 font-serif text-[15px] text-pewter">{props.detail}</p>}
        {props.onRetry && (
          <button type="button" onClick={props.onRetry} className={`${plateButton} mt-6`}>
            Try again
          </button>
        )}
      </div>
    )}
  </div>
);
