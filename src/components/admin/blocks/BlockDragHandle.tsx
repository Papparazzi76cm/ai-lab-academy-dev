import { forwardRef } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BlockDragHandleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export const BlockDragHandle = forwardRef<HTMLButtonElement, BlockDragHandleProps>(
  ({ className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex size-7 cursor-grab items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          className,
        )}
        title="Arrastrar o usar espacio/flechas para reordenar"
        aria-label="Botón accesible de reordenación de bloque"
        {...props}
      >
        <GripVertical className="size-4" />
      </button>
    );
  },
);

BlockDragHandle.displayName = "BlockDragHandle";
