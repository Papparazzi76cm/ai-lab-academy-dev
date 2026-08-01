import type { LessonBlockItem, BlockType } from "@/lib/blocks";
import { TextBlockRenderer } from "./renderers/TextBlockRenderer";
import { MediaBlockRenderer } from "./renderers/MediaBlockRenderer";
import { CodeBlockRenderer } from "./renderers/CodeBlockRenderer";
import { ResourceBlockRenderer } from "./renderers/ResourceBlockRenderer";
import { EducationBlockRenderer } from "./renderers/EducationBlockRenderer";

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

  switch (type) {
    case "h1":
    case "h2":
    case "h3":
    case "heading":
    case "paragraph":
    case "text":
    case "bullet_list":
    case "numbered_list":
    case "list":
    case "checklist":
    case "quote":
    case "divider":
      return <TextBlockRenderer block={block} />;

    case "image":
    case "youtube":
    case "vimeo":
    case "video_file":
    case "video":
    case "audio":
    case "gallery":
      return <MediaBlockRenderer block={block} />;

    case "code":
      return <CodeBlockRenderer block={block} />;

    case "download_button":
    case "button":
    case "external_link":
    case "pdf_embed":
    case "pdf":
      return <ResourceBlockRenderer block={block} />;

    case "objectives":
    case "summary":
    case "tip":
    case "warning":
    case "callout":
    case "exercise":
    case "challenge":
    case "open_question":
    case "question":
      return <EducationBlockRenderer block={block} />;

    default:
      return <TextBlockRenderer block={block} />;
  }
}
