import React from "react";
import type { LessonBlockItem } from "@/lib/blocks";
import { BlockRegistry } from "@/lib/authoring/blocks/registry";
import { TextBlockRenderer } from "./renderers/TextBlockRenderer";

interface BlockRendererProps {
  block: LessonBlockItem;
}

export function BlockRenderer({ block }: BlockRendererProps) {
  const definition = BlockRegistry.get(block.type as any);

  if (definition && definition.renderer) {
    const Component = definition.renderer as React.ComponentType<any>;

    const authoringBlock = {
      id: block.id,
      lesson_id: block.lesson_id,
      type: block.type as any,
      position: block.position,
      visibility: "visible" as const,
      content_json: block.content_json || {},
      settings_json: block.settings_json || {},
    };

    return (
      <Component
        block={authoringBlock}
        content={(block.content_json || {}) as any}
        settings={(block.settings_json || {}) as any}
        isPreview={false}
      />
    );
  }

  // Fallback to text block renderer for legacy unregistered types
  return <TextBlockRenderer block={block as any} />;
}
