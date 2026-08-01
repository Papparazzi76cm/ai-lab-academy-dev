import { useState, useCallback } from "react";
import { BlockToolbar } from "./BlockToolbar";
import { BlockItemEditor } from "./BlockItemEditor";
import { BlockSelector } from "./BlockSelector";
import { BlockPreview } from "./BlockPreview";
import { useLessonBlocks } from "./useLessonBlocks";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import type { BlockType } from "@/lib/blocks";
import { cn } from "@/lib/utils";

export function BlockEditor({ lessonId }: { lessonId: string }) {
  const {
    blocks,
    isLoading,
    isError,
    saveStatus,
    expandedBlockIds,
    canUndo,
    canRedo,
    addBlock,
    updateBlockContent,
    duplicateBlock,
    deleteBlock,
    reorderBlocks,
    toggleCollapse,
    expandAll,
    collapseAll,
    undo,
    redo,
  } = useLessonBlocks(lessonId);

  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [insertTargetIndex, setInsertTargetIndex] = useState<number | undefined>(undefined);

  // Drag & drop state for reordering
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const handleOpenSelectorAt = useCallback((index?: number) => {
    setInsertTargetIndex(index);
    setSelectorOpen(true);
  }, []);

  const handleSelectBlockType = useCallback(
    (type: BlockType) => {
      addBlock(type, insertTargetIndex);
    },
    [addBlock, insertTargetIndex],
  );

  const handleDropOn = useCallback(
    (targetId: string) => {
      setOverId(null);
      if (!dragId || dragId === targetId) return;

      const ids = blocks.map((b) => b.id);
      const from = ids.indexOf(dragId);
      const to = ids.indexOf(targetId);
      if (from < 0 || to < 0) return;

      const [moved] = ids.splice(from, 1);
      if (moved) {
        ids.splice(to, 0, moved);
        reorderBlocks(ids);
      }
      setDragId(null);
    },
    [blocks, dragId, reorderBlocks],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando editor de bloques...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
        Error al cargar los bloques de la lección. Por favor, reintenta.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <BlockToolbar
        mode={mode}
        onModeChange={setMode}
        saveStatus={saveStatus}
        onAddBlock={() => handleOpenSelectorAt(blocks.length)}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />

      {/* Editor or Preview Mode */}
      {mode === "preview" ? (
        <BlockPreview blocks={blocks} />
      ) : (
        <div className="space-y-4">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-12 text-center space-y-4 bg-muted/20">
              <div className="space-y-1">
                <h3 className="font-display text-lg font-semibold text-foreground">
                  Esta lección aún no tiene bloques
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Comienza añadiendo títulos, párrafos, vídeos, código o actividades interactivas.
                </p>
              </div>
              <Button onClick={() => handleOpenSelectorAt(0)} className="gap-2">
                <Plus className="size-4" />
                <span>Añadir primer bloque</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Insert trigger above first block */}
              <InsertDivider onInsert={() => handleOpenSelectorAt(0)} />

              {blocks.map((block, idx) => {
                const isExpanded = expandedBlockIds.has(block.id);
                const isFirst = idx === 0;
                const isLast = idx === blocks.length - 1;

                return (
                  <div key={block.id} className="space-y-2">
                    <div
                      draggable
                      onDragStart={() => setDragId(block.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverId(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setOverId(block.id);
                      }}
                      onDrop={() => handleDropOn(block.id)}
                      className={cn(
                        "transition-all",
                        dragId === block.id && "opacity-40",
                        overId === block.id &&
                          dragId !== block.id &&
                          "ring-2 ring-primary/60 rounded-xl",
                      )}
                    >
                      <BlockItemEditor
                        block={block}
                        isExpanded={isExpanded}
                        onToggleExpand={() => toggleCollapse(block.id)}
                        onChangeContent={(content) => updateBlockContent(block.id, content)}
                        onChangeSettings={(settings) => updateBlockContent(block.id, {}, settings)}
                        onDuplicate={() => duplicateBlock(block.id)}
                        onDelete={() => deleteBlock(block.id)}
                        onMoveUp={() => {
                          if (idx > 0) {
                            const ids = blocks.map((b) => b.id);
                            const curr = ids[idx];
                            const prev = ids[idx - 1];
                            if (curr && prev) {
                              ids[idx] = prev;
                              ids[idx - 1] = curr;
                              reorderBlocks(ids);
                            }
                          }
                        }}
                        onMoveDown={() => {
                          if (idx < blocks.length - 1) {
                            const ids = blocks.map((b) => b.id);
                            const curr = ids[idx];
                            const next = ids[idx + 1];
                            if (curr && next) {
                              ids[idx] = next;
                              ids[idx + 1] = curr;
                              reorderBlocks(ids);
                            }
                          }
                        }}
                        isFirst={isFirst}
                        isLast={isLast}
                      />
                    </div>

                    {/* Hover insert divider between blocks */}
                    <InsertDivider onInsert={() => handleOpenSelectorAt(idx + 1)} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Block Selector Dialog */}
      <BlockSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onSelectBlock={handleSelectBlockType}
      />
    </div>
  );
}

function InsertDivider({ onInsert }: { onInsert: () => void }) {
  return (
    <div className="group/divider relative flex items-center justify-center py-1">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-transparent group-hover/divider:border-primary/30 transition-colors" />
      </div>
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={onInsert}
        title="Insertar bloque aquí"
        className="relative z-10 size-6 rounded-full bg-background border-border group-hover/divider:border-primary group-hover/divider:bg-primary group-hover/divider:text-primary-foreground opacity-0 group-hover/divider:opacity-100 transition-all scale-90 group-hover/divider:scale-100 shadow-2xs"
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  );
}
