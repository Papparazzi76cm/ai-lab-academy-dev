import React from "react";
import type { AuthoringBlock, AuthoringBlockSettings } from "../types";
import { BlockRegistry } from "../blocks/registry";
import { GripVertical, EyeOff, Copy, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BlockEditorProps {
  block: AuthoringBlock;
  isSelected: boolean;
  onSelect: () => void;
  onChangeContent: (newContent: Record<string, unknown>) => void;
  onChangeSettings: (newSettings: Record<string, unknown>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function BlockEditor({
  block,
  isSelected,
  onSelect,
  onChangeContent,
  onChangeSettings,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: BlockEditorProps) {
  const def = BlockRegistry.get(block.type);

  if (!def) {
    return (
      <div className="p-4 border border-rose-500/40 bg-rose-500/10 rounded-xl text-rose-800 dark:text-rose-200 text-xs">
        Tipo de bloque desconocido: <strong>{block.type}</strong>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const EditorComponent = def.editor as React.ComponentType<any>;
  const validationResult = def.validator.safeParse(block.content_json);
  const hasError = !validationResult.success;

  return (
    <div
      onClick={onSelect}
      className={`group relative rounded-2xl border transition-all duration-150 ${
        isSelected
          ? "border-primary ring-2 ring-primary/20 bg-card shadow-md"
          : hasError
            ? "border-rose-500/50 bg-rose-500/5 hover:border-rose-500"
            : "border-border/80 hover:border-border bg-card/60 hover:bg-card"
      }`}
    >
      {/* Block Header Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 bg-muted/40 rounded-t-2xl text-xs">
        <div className="flex items-center gap-2">
          <GripVertical className="size-4 text-muted-foreground cursor-grab opacity-40 group-hover:opacity-100" />
          <span className="font-semibold text-foreground/80">{def.name}</span>
          {block.visibility === "hidden" && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium">
              <EyeOff className="size-3" /> Oculto
            </span>
          )}
          {hasError && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 font-medium">
              Revisar datos
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={isFirst}
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
          >
            <ArrowUp className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={isLast}
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
          >
            <ArrowDown className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
          >
            <Copy className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Block Editor Content */}
      <div className="p-4">
        <EditorComponent
          block={block}
          content={block.content_json}
          settings={block.settings_json}
          onChangeContent={(partial: Record<string, unknown>) =>
            onChangeContent({ ...block.content_json, ...partial })
          }
          onChangeSettings={(partial: AuthoringBlockSettings) =>
            onChangeSettings({ ...block.settings_json, ...partial })
          }
        />
      </div>
    </div>
  );
}
