import { BlockRenderer } from "@/components/lesson/BlockRenderer";
import type { LessonBlockItem } from "@/lib/blocks";

export function BlockPreview({ blocks }: { blocks: LessonBlockItem[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
      <div className="border-b border-border pb-4">
        <span className="text-xs uppercase font-mono tracking-wider text-muted-foreground">
          Vista previa para el estudiante
        </span>
      </div>
      <div className="space-y-6">
        {blocks.map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </div>
    </div>
  );
}
