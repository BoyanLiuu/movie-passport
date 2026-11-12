// Velvet Night's shared parts, as class lists: one burnished primary action per view, hairline
// secondary actions, chips and the panel frame. Every surface uses these instead of one-offs.

/** The burnished plate: the one primary action in a view. */
export const plateButton =
  "engraved inline-flex min-h-11 items-center justify-center gap-2.5 border border-silver-bright/70 bg-[linear-gradient(180deg,#ebe6e0_0%,#bdb8b0_100%)] px-5 text-[11px] font-medium text-velvet shadow-[0_8px_18px_-8px_rgb(0_0_0/0.95)] transition-[filter,transform] duration-150 hover:brightness-110 active:translate-y-px disabled:pointer-events-none disabled:opacity-40";

/** A hairline frame: secondary actions. */
export const hairlineButton =
  "engraved inline-flex min-h-11 items-center justify-center gap-2.5 border border-pewter/50 px-5 text-[11px] text-silver transition-colors duration-150 hover:border-silver hover:bg-silver/5 hover:text-silver-bright";

/** Country chips: a smaller hairline frame. */
export const plateChip =
  "engraved inline-flex min-h-10 items-center gap-2 border border-pewter/40 px-3.5 text-[11px] text-silver transition-colors duration-150 hover:border-silver hover:bg-silver/5 hover:text-silver-bright";

/** Panels are printed onto the plate: the same velvet, a hairline frame, square corners. */
export const panelFrame =
  "border border-smoke bg-velvet-raised/95 shadow-[0_24px_48px_-16px_rgb(0_0_0/0.9)]";

/** A label set in small engraved capitals. */
export const engravedLabel = "engraved text-[10px] text-pewter";
