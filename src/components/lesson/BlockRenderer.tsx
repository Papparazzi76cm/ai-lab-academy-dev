import React from "react";
import type { LessonBlockItem } from "@/lib/blocks";
import { BlockRegistry } from "@/lib/authoring/blocks/registry";
import { TextBlockRenderer } from "./renderers/TextBlockRenderer";
import type { AuthoringBlock, BlockType } from "@/lib/authoring/types";

interface BlockRendererProps {
  block: LessonBlockItem;
}

export function BlockRenderer({ block }: BlockRendererProps) {
  const definition = BlockRegistry.get(block.type as BlockType);

  if (definition && definition.renderer) {
    const Component = definition.renderer as React.ComponentType<{
      block: AuthoringBlock;
      content: Record<string, unknown>;
      settings: Record<string, unknown>;
      isPreview?: boolean;
    }>;

    const authoringBlock: AuthoringBlock = {
      id: block.id,
      lesson_id: block.lesson_id,
      type: block.type as BlockType,
      position: block.position,
      visibility: "visible",
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
