import type { LessonBlockItem, BlockType } from "@/lib/blocks";
import { BlockRegistry } from "@/lib/authoring/blocks/registry";
import { TextBlockRenderer } from "./renderers/TextBlockRenderer";

export function BlockRenderer({ blocks }: { blocks: LessonBlockItem[] }) {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {blocks.map((block) => (
        <div key={block.id || block.position} className="block-renderer-item">
          <BlockView block={block} />
        </div>
      ))}
    </div>
  );
}

function BlockView({ block }: { block: LessonBlockItem }) {
  const type: BlockType = block.type;
  const definition = BlockRegistry.get(type);

  if (definition && definition.renderer) {
    const Component = definition.renderer;
    const authoringBlock = {
      id: block.id,
      lesson_id: block.lesson_id,
      type: block.type,
      position: block.position,
      visibility: "visible" as const,
      content_json: block.content_json || {},
      settings_json: block.settings_json || {},
    };

    return (
      <Component
        block={authoringBlock}
        content={block.content_json || {}}
        settings={block.settings_json || {}}
        isPreview={false}
      />
    );
  }

  // Fallback to text block renderer for legacy unregistered types
  return <TextBlockRenderer block={block} />;
}
