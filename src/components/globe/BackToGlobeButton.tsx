import { ArrowLeft } from "lucide-react";
import { hairlineButton } from "@/components/ui/plate";

export const BackToGlobeButton = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} className={`${hairlineButton} mt-3 w-full`}>
    <ArrowLeft aria-hidden className="size-3.5" strokeWidth={1.5} />
    Back to globe
    <kbd className="ml-1 hidden border border-smoke px-1.5 py-0.5 font-serif text-[10px] tracking-normal text-pewter normal-case pointer-fine:inline">
      Esc
    </kbd>
  </button>
);
