import { memo, useState } from "react";
import { BlockDragHandle } from "./BlockDragHandle";
import { BlockContextMenu } from "./BlockContextMenu";
import { BlockSettings } from "./BlockSettings";
import type { LessonBlockItem, BlockType } from "@/lib/blocks";
import { TextBlockEditor } from "./editors/TextBlockEditor";
import { ListBlockEditor } from "./editors/ListBlockEditor";
import { MediaBlockEditor } from "./editors/MediaBlockEditor";
import { CodeBlockEditor } from "./editors/CodeBlockEditor";
import { ResourceBlockEditor } from "./editors/ResourceBlockEditor";
import { EducationBlockEditor } from "./editors/EducationBlockEditor";
import { typeIconMap, typeLabelMap } from "./block-maps";
import { ChevronDown, ChevronRight, AlertTriangle, AlignLeft } from "lucide-react";
import { strVal } from "./editors/editor-utils";

export interface BlockItemEditorProps {
  block: LessonBlockItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onChangeContent: (content: Record<string, unknown>) => void;
  onChangeSettings: (settings: Record<string, unknown>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  dragHandleProps?: Record<string, unknown>;
}

export const BlockItemEditor = memo(function BlockItemEditor({
  block,
  isExpanded,
  onToggleExpand,
  onChangeContent,
  onChangeSettings,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  dragHandleProps,
}: BlockItemEditorProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const Icon = typeIconMap[block.type] || AlignLeft;
  const label = typeLabelMap[block.type] || block.type;
  const c = block.content_json || {};

  return (
    <div className="group/block relative rounded-xl border border-border bg-card shadow-2xs transition-all hover:border-primary/40 focus-within:border-primary/60">
      {/* Block Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-3 py-2 rounded-t-xl">
        <div className="flex items-center gap-2">
          <BlockDragHandle {...dragHandleProps} />

          <button
            type="button"
            onClick={onToggleExpand}
            className="flex items-center gap-2 text-xs font-medium text-foreground hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md p-1"
          >
            {isExpanded ? (
              <ChevronDown className="size-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            )}
            <div className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="size-3" />
            </div>
            <span>{label}</span>
          </button>
        </div>

        {/* Collapsed summary text */}
        {!isExpanded && (
          <span className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[300px] hidden sm:inline">
            {strVal(c, "text") ||
              strVal(c, "title") ||
              strVal(c, "question") ||
              strVal(c, "code").slice(0, 30)}
          </span>
        )}

        {/* Block Actions Dropdown */}
        <div className="flex items-center gap-1">
          <BlockContextMenu
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onOpenSettings={() => setSettingsOpen(true)}
            isFirst={isFirst}
            isLast={isLast}
          />
        </div>
      </div>

      {/* Validation Error Banner */}
      {block.validation_error && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive font-medium">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{block.validation_error}</span>
        </div>
      )}

      {/* Block Body Inputs */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {renderBlockEditorFamily(block.type, c, onChangeContent)}
        </div>
      )}

      {/* Settings Dialog */}
      <BlockSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        type={block.type}
        settings={block.settings_json}
        onSaveSettings={onChangeSettings}
      />
    </div>
  );
});

function renderBlockEditorFamily(
  type: BlockType,
  content: Record<string, unknown>,
  onChange: (data: Record<string, unknown>) => void,
) {
  switch (type) {
    case "h1":
    case "h2":
    case "h3":
    case "heading":
    case "paragraph":
    case "text":
    case "quote":
    case "divider":
      return <TextBlockEditor type={type} content={content} onChange={onChange} />;

    case "bullet_list":
    case "numbered_list":
    case "list":
    case "checklist":
    case "objectives":
      return <ListBlockEditor type={type} content={content} onChange={onChange} />;

    case "image":
    case "youtube":
    case "vimeo":
    case "video_file":
    case "video":
    case "audio":
    case "gallery":
      return <MediaBlockEditor type={type} content={content} onChange={onChange} />;

    case "code":
      return <CodeBlockEditor content={content} onChange={onChange} />;

    case "download_button":
    case "button":
    case "external_link":
    case "pdf_embed":
    case "pdf":
      return <ResourceBlockEditor type={type} content={content} onChange={onChange} />;

    case "summary":
    case "tip":
    case "warning":
    case "callout":
    case "exercise":
    case "challenge":
    case "open_question":
    case "question":
      return <EducationBlockEditor type={type} content={content} onChange={onChange} />;

    default:
      return <TextBlockEditor type="paragraph" content={content} onChange={onChange} />;
  }
}
