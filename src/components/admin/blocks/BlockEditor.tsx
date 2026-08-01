import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { BlockToolbar } from "./BlockToolbar";
import { SortableBlockItem } from "./SortableBlockItem";
import { BlockSelector } from "./BlockSelector";
import { BlockPreview } from "./BlockPreview";
import { useLessonBlocks } from "./useLessonBlocks";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import type { BlockType } from "@/lib/blocks";

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
    flushPendingSave,
  } = useLessonBlocks(lessonId);

  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [insertTargetIndex, setInsertTargetIndex] = useState<number | undefined>(undefined);

  // Configure dnd-kit sensors (Pointer, Touch, Keyboard with sortableKeyboardCoordinates)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleModeChange = useCallback(
    async (newMode: "edit" | "preview") => {
      if (newMode === "preview") {
        const ok = await flushPendingSave();
        if (!ok) {
          return;
        }
        setMode("preview");
      } else {
        setMode("edit");
      }
    },
    [flushPendingSave],
  );

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

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const ids = blocks.map((b) => b.id);
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));

      if (oldIndex < 0 || newIndex < 0) return;

      const newIds = [...ids];
      const [moved] = newIds.splice(oldIndex, 1);
      if (moved) {
        newIds.splice(newIndex, 0, moved);
        reorderBlocks(newIds);
      }
    },
    [blocks, reorderBlocks],
  );

  // Screen reader accessibility announcements
  const accessibilityAnnouncements = {
    onDragStart({ active }: { active: { id: string | number } }) {
      const index = blocks.findIndex((b) => b.id === active.id);
      return `Arrastrando bloque en posición ${index + 1} de ${blocks.length}`;
    },
    onDragOver({
      active,
      over,
    }: {
      active: { id: string | number };
      over: { id: string | number } | null;
    }) {
      if (over) {
        const overIndex = blocks.findIndex((b) => b.id === over.id);
        return `Moviendo sobre la posición ${overIndex + 1}`;
      }
      return undefined;
    },
    onDragEnd({
      active,
      over,
    }: {
      active: { id: string | number };
      over: { id: string | number } | null;
    }) {
      if (over) {
        const overIndex = blocks.findIndex((b) => b.id === over.id);
        return `Bloque soltado en posición ${overIndex + 1} de ${blocks.length}`;
      }
      return "Arrastre cancelado";
    },
    onDragCancel() {
      return "Arrastre de bloque cancelado";
    },
  };

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

  const blockIds = blocks.map((b) => b.id);

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <BlockToolbar
        mode={mode}
        onModeChange={handleModeChange}
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              accessibility={{ announcements: accessibilityAnnouncements }}
            >
              <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {/* Insert trigger above first block */}
                  <InsertDivider onInsert={() => handleOpenSelectorAt(0)} />

                  {blocks.map((block, idx) => {
                    const isExpanded = expandedBlockIds.has(block.id);
                    const isFirst = idx === 0;
                    const isLast = idx === blocks.length - 1;

                    return (
                      <div key={block.id} className="space-y-2">
                        <SortableBlockItem
                          id={block.id}
                          block={block}
                          isExpanded={isExpanded}
                          onToggleExpand={() => toggleCollapse(block.id)}
                          onChangeContent={(content) => updateBlockContent(block.id, content)}
                          onChangeSettings={(settings) =>
                            updateBlockContent(block.id, {}, settings)
                          }
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

                        {/* Hover insert divider between blocks */}
                        <InsertDivider onInsert={() => handleOpenSelectorAt(idx + 1)} />
                      </div>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
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
