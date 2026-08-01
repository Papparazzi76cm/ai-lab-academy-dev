import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Lista reordenable mediante arrastrar y soltar (HTML5 drag & drop nativo,
 * sin dependencias externas).
 */
export function SortableList<T>({
  items,
  getId,
  onReorder,
  renderItem,
  className,
  itemClassName,
}: {
  items: T[];
  getId: (item: T) => string;
  onReorder: (ids: string[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  itemClassName?: string;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const drop = (targetId: string) => {
    setOverId(null);
    if (!dragId || dragId === targetId) return;
    const ids = items.map(getId);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved as string);
    onReorder(ids);
    setDragId(null);
  };

  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item, index) => {
        const id = getId(item);
        return (
          <li
            key={id}
            draggable
            onDragStart={() => setDragId(id)}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setOverId(id);
            }}
            onDrop={() => drop(id)}
            className={cn(
              "transition-opacity",
              dragId === id && "opacity-50",
              overId === id && dragId !== id && "ring-2 ring-primary/40 rounded-xl",
              itemClassName,
            )}
          >
            {renderItem(item, index)}
          </li>
        );
      })}
    </ul>
  );
}
