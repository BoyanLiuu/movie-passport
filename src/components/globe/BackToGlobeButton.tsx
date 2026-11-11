export const BackToGlobeButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:border-amber-300/60 hover:bg-amber-300/10 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none sm:mt-5"
  >
    <span aria-hidden>←</span> Back to globe
    <kbd className="ml-1 hidden rounded border border-white/15 px-1.5 font-sans text-[11px] text-slate-400 pointer-fine:inline">
      Esc
    </kbd>
  </button>
);
