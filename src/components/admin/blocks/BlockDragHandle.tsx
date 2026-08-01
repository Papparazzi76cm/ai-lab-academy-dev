import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export function BlockDragHandle({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-7 cursor-grab items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing",
        className,
      )}
      title="Arrastrar para reordenar"
      aria-label="Arrastrar para reordenar el bloque"
    >
      <GripVertical className="size-4" />
    </div>
  );
}
