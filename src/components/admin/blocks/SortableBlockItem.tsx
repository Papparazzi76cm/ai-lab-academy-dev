import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BlockItemEditor, type BlockItemEditorProps } from "./BlockItemEditor";
import { cn } from "@/lib/utils";

export interface SortableBlockItemProps extends Omit<BlockItemEditorProps, "dragHandleProps"> {
  id: string;
}

export function SortableBlockItem({ id, ...props }: SortableBlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandleProps = {
    ...attributes,
    ...listeners,
    ref: setActivatorNodeRef,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("transition-shadow", isDragging && "opacity-50 z-50 shadow-lg")}
    >
      <BlockItemEditor {...props} dragHandleProps={dragHandleProps} />
    </div>
  );
}
