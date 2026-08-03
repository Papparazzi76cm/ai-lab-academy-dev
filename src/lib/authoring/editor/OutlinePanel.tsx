import React from "react";
import type { AuthoringBlock } from "../types";
import { BlockRegistry } from "../blocks/registry";
import { Layers, Plus, GripVertical, Trash2, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OutlinePanelProps {
  blocks: AuthoringBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onOpenAddModal: () => void;
}

export function OutlinePanel({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock,
  onOpenAddModal,
}: OutlinePanelProps) {
  return (
    <div className="w-64 h-full border-r border-border bg-card flex flex-col divide-y divide-border overflow-y-auto">
      <div className="p-3 bg-muted/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground">
            Estructura ({blocks.length})
          </h3>
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={onOpenAddModal}>
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="flex-1 p-2 space-y-1 overflow-y-auto">
        {blocks.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No hay bloques en esta lección. HAZ clic en "+" para añadir uno.
          </div>
        ) : (
          blocks.map((block, index) => {
            const def = BlockRegistry.get(block.type);
            const isSelected = block.id === selectedBlockId;

            return (
              <div
                key={block.id}
                onClick={() => onSelectBlock(block.id)}
                className={`group flex items-center gap-2 p-2 rounded-lg text-xs transition-colors cursor-pointer border ${
                  isSelected
                    ? "bg-primary/10 border-primary/40 text-primary font-medium"
                    : "border-transparent hover:bg-muted/60 text-foreground"
                }`}
              >
                <GripVertical className="size-3.5 text-muted-foreground opacity-40 group-hover:opacity-100 shrink-0 cursor-grab" />
                <span className="font-mono text-[10px] text-muted-foreground w-4">
                  {index + 1}.
                </span>
                <span className="truncate flex-1">{def?.name || block.type}</span>

                {block.visibility === "hidden" && (
                  <EyeOff className="size-3.5 text-muted-foreground" title="Oculto" />
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteBlock(block.id);
                  }}
                >
                  <Trash2 className="size-3 text-destructive" />
                </Button>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 bg-muted/20">
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={onOpenAddModal}>
          <Plus className="size-3.5 mr-1" /> Añadir Bloque
        </Button>
      </div>
    </div>
  );
}
