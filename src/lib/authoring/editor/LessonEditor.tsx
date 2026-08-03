import React, { useState } from "react";
import type { AuthoringBlock } from "../types";
import { useHistory } from "../history/useHistory";
import { useAutosave } from "../autosave/useAutosave";
import { BlockEditor } from "./BlockEditor";
import { BlockToolbar } from "./BlockToolbar";
import { OutlinePanel } from "./OutlinePanel";
import { InspectorPanel } from "./InspectorPanel";
import { BlockRegistry } from "../blocks/registry";
import { createBlock, duplicateBlock, deleteBlock, moveBlock } from "../blocks/factory";
import {
  publishLesson,
  fetchLessonVersions,
  restoreLessonVersion,
} from "../publishing/publishingService";
import { validateLesson } from "../validation/lessonValidation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Undo,
  Redo,
  Eye,
  Save,
  Send,
  Plus,
  History,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

interface LessonEditorProps {
  lessonId: string;
  lessonTitle: string;
  initialBlocks: AuthoringBlock[];
  onBack?: () => void;
}

export function LessonEditor({ lessonId, lessonTitle, initialBlocks, onBack }: LessonEditorProps) {
  const { blocks, canUndo, canRedo, pushState, undo, redo, resetHistory } =
    useHistory(initialBlocks);
  const { status: autosaveStatus, lastSavedAt } = useAutosave(lessonId, blocks);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(blocks[0]?.id || null);
  const [isPreview, setIsPreview] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [versions, setVersions] = useState<LessonVersion[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;
  const validation = validateLesson(blocks);

  const handleAddBlock = (type: BlockType) => {
    const newBlock = createBlock(type, undefined, undefined, blocks.length);
    const updated = [...blocks, newBlock];
    pushState(updated);
    setSelectedBlockId(newBlock.id);
  };

  const handleUpdateContent = (blockId: string, newContent: Record<string, unknown>) => {
    const updated = blocks.map((b) => (b.id === blockId ? { ...b, content_json: newContent } : b));
    pushState(updated);
  };

  const handleUpdateSettings = (blockId: string, newSettings: Record<string, unknown>) => {
    const updated = blocks.map((b) =>
      b.id === blockId
        ? {
            ...b,
            visibility: (newSettings.visibility as Visibility) || b.visibility,
            settings_json: { ...b.settings_json, ...newSettings },
          }
        : b,
    );
    pushState(updated);
  };

  const handleDuplicate = (blockId: string) => {
    const targetIndex = blocks.findIndex((b) => b.id === blockId);
    if (targetIndex < 0) return;
    const duplicated = duplicateBlock(blocks[targetIndex]);
    const updated = [
      ...blocks.slice(0, targetIndex + 1),
      duplicated,
      ...blocks.slice(targetIndex + 1),
    ].map((b, idx) => ({ ...b, position: idx }));
    pushState(updated);
    setSelectedBlockId(duplicated.id);
  };

  const handleDelete = (blockId: string) => {
    const updated = deleteBlock(blocks, blockId);
    pushState(updated);
    if (selectedBlockId === blockId) {
      setSelectedBlockId(updated[0]?.id || null);
    }
  };

  const handleMoveUp = (blockId: string) => {
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx <= 0) return;
    const updated = moveBlock(blocks, idx, idx - 1);
    pushState(updated);
  };

  const handleMoveDown = (blockId: string) => {
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx < 0 || idx >= blocks.length - 1) return;
    const updated = moveBlock(blocks, idx, idx + 1);
    pushState(updated);
  };

  const handlePublishConfirm = async () => {
    setIsPublishing(true);
    try {
      await publishLesson(lessonId, commitMessage);
      setIsPublishModalOpen(false);
      setCommitMessage("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al publicar la lección.";
      alert(msg);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleOpenHistory = async () => {
    setIsHistoryModalOpen(true);
    const historyList = await fetchLessonVersions(lessonId);
    setVersions(historyList);
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    if (!confirm(`¿Restaurar la versión v${versionNumber}? Perderás cambios no guardados.`)) return;
    try {
      await restoreLessonVersion(lessonId, versionNumber);
      const historyList = await fetchLessonVersions(lessonId);
      const targetVersion = historyList.find((v) => v.version_number === versionNumber);
      if (targetVersion) {
        resetHistory(targetVersion.blocks_snapshot);
      }
      setIsHistoryModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al restaurar versión.";
      alert(msg);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden select-none">
      {/* Top Action Header */}
      <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="size-4 mr-1" /> Volver
            </Button>
          )}
          <h2 className="font-display font-bold text-sm sm:text-base text-foreground truncate max-w-md">
            {lessonTitle}
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
            {autosaveStatus === "saving"
              ? "Guardando..."
              : autosaveStatus === "saved"
                ? "Guardado"
                : "Borrador"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            disabled={!canUndo}
            onClick={undo}
            title="Deshacer (Undo)"
          >
            <Undo className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={!canRedo}
            onClick={redo}
            title="Rehacer (Redo)"
          >
            <Redo className="size-4" />
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <Button variant="outline" size="sm" onClick={() => setIsPreview(!isPreview)}>
            <Eye className="size-4 mr-1.5" /> {isPreview ? "Volver a Edición" : "Vista Previa"}
          </Button>

          <Button variant="outline" size="sm" onClick={handleOpenHistory}>
            <History className="size-4 mr-1.5" /> Historial Versiones
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setIsPublishModalOpen(true)}
            disabled={!validation.isValid}
          >
            <Send className="size-4 mr-1.5" /> Publicar Lección
          </Button>
        </div>
      </header>

      {/* Main Workspace Body */}
      {isPreview ? (
        <div className="flex-1 overflow-y-auto p-6 sm:p-12 max-w-4xl mx-auto w-full bg-background">
          <div className="space-y-6">
            {blocks.map((block) => {
              const def = BlockRegistry.get(block.type);
              if (!def) return null;
              const Renderer = def.renderer;
              return (
                <Renderer
                  key={block.id}
                  block={block}
                  content={block.content_json as unknown as Record<string, unknown>}
                  settings={block.settings_json as unknown as Record<string, unknown>}
                  isPreview={true}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Outline Panel */}
          <OutlinePanel
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            onDeleteBlock={handleDelete}
            onOpenAddModal={() => setIsAddModalOpen(true)}
          />

          {/* Canvas Center */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-3xl mx-auto w-full">
            {blocks.length === 0 ? (
              <div className="p-12 border-2 border-dashed border-border rounded-2xl text-center space-y-4 my-12">
                <p className="text-sm text-muted-foreground">
                  Esta lección está vacía. Añade tu primer bloque.
                </p>
                <Button onClick={() => setIsAddModalOpen(true)}>
                  <Plus className="size-4 mr-1.5" /> Añadir Bloque Inicial
                </Button>
              </div>
            ) : (
              blocks.map((block, idx) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  isSelected={block.id === selectedBlockId}
                  onSelect={() => setSelectedBlockId(block.id)}
                  onChangeContent={(val) => handleUpdateContent(block.id, val)}
                  onChangeSettings={(val) => handleUpdateSettings(block.id, val)}
                  onDuplicate={() => handleDuplicate(block.id)}
                  onDelete={() => handleDelete(block.id)}
                  onMoveUp={() => handleMoveUp(block.id)}
                  onMoveDown={() => handleMoveDown(block.id)}
                  isFirst={idx === 0}
                  isLast={idx === blocks.length - 1}
                />
              ))
            )}

            <div className="py-6 flex justify-center">
              <Button
                variant="outline"
                className="border-dashed"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus className="size-4 mr-1.5" /> Añadir Nuevo Bloque
              </Button>
            </div>
          </div>

          {/* Right Inspector Panel */}
          <InspectorPanel
            selectedBlock={selectedBlock}
            blocks={blocks}
            onChangeSettings={handleUpdateSettings}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onSelectBlock={setSelectedBlockId}
          />
        </div>
      )}

      {/* Block Catalog Modal */}
      <BlockToolbar
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddBlock={handleAddBlock}
      />

      {/* Publish Dialog */}
      <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Publicar Lección Oficial</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 my-2">
            <p className="text-xs text-muted-foreground">
              Al publicar se creará una versión snapshot inmutable en la base de datos.
            </p>
            <Input
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Mensaje de versión (ej. Añadido ejemplo de código interactivo)"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPublishModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePublishConfirm} disabled={isPublishing}>
              {isPublishing ? "Publicando..." : "Confirmar Publicación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Drawer Dialog */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Historial de Versiones Publicadas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto my-2">
            {versions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No hay publicaciones anteriores registradas.
              </p>
            ) : (
              versions.map((v) => (
                <div
                  key={v.id}
                  className="p-3 border border-border rounded-xl flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono text-xs font-bold text-primary">
                      v{v.version_number}
                    </span>
                    <p className="text-xs text-foreground font-medium">
                      {v.commit_message || "Sin mensaje"}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(v.created_at).toLocaleString()}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestoreVersion(v.version_number)}
                  >
                    Restaurar
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
