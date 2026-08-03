import React from "react";
import type { AuthoringBlock, AuthoringBlockSettings } from "../types";
import { PropertiesPanel } from "./PropertiesPanel";
import { Sliders, ShieldCheck, AlertTriangle } from "lucide-react";
import { validateLesson } from "../validation/lessonValidation";

interface InspectorPanelProps {
  selectedBlock: AuthoringBlock | null;
  blocks: AuthoringBlock[];
  onChangeSettings: (blockId: string, newSettings: Partial<AuthoringBlockSettings>) => void;
  onDuplicate: (blockId: string) => void;
  onDelete: (blockId: string) => void;
  onMoveUp: (blockId: string) => void;
  onMoveDown: (blockId: string) => void;
  onSelectBlock: (blockId: string) => void;
}

export function InspectorPanel({
  selectedBlock,
  blocks,
  onChangeSettings,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onSelectBlock,
}: InspectorPanelProps) {
  const selectedIndex = blocks.findIndex((b) => b.id === selectedBlock?.id);
  const validation = validateLesson(blocks);

  return (
    <div className="w-80 h-full border-l border-border bg-card flex flex-col divide-y divide-border overflow-y-auto">
      <div className="p-3 bg-muted/40 flex items-center gap-2">
        <Sliders className="size-4 text-primary" />
        <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground">
          Panel de Inspección
        </h3>
      </div>

      <div className="flex-1">
        <PropertiesPanel
          selectedBlock={selectedBlock}
          onChangeSettings={onChangeSettings}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          isFirst={selectedIndex <= 0}
          isLast={selectedIndex >= blocks.length - 1}
        />
      </div>

      <div className="p-4 bg-muted/20 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-xs flex items-center gap-1.5">
            {validation.isValid ? (
              <ShieldCheck className="size-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="size-4 text-amber-600" />
            )}
            Estado de Validación
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted">
            {validation.errors.length} errores
          </span>
        </div>

        {validation.errors.length > 0 && (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {validation.errors.map((err, idx) => (
              <button
                key={idx}
                onClick={() => err.blockId && onSelectBlock(err.blockId)}
                className="w-full text-left p-2 rounded border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-[11px] text-amber-900 dark:text-amber-200 transition-colors"
              >
                {err.message}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
