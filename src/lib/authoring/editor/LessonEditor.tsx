import React, { useState, useEffect } from "react";
import type { AuthoringBlock, BlockType, Visibility, LessonVersion } from "../types";
import { useHistory } from "../history/useHistory";
import { useAutosave } from "../autosave/useAutosave";
import { BlockEditor } from "./BlockEditor";
import { BlockToolbar } from "./BlockToolbar";
import { OutlinePanel } from "./OutlinePanel";
import { InspectorPanel } from "./InspectorPanel";
import { createBlock, duplicateBlock, deleteBlock, moveBlock } from "../blocks/factory";
import { adaptRawBlocks } from "../blocks/adapter";
import {
  publishLesson,
  fetchLessonVersions,
  restoreLessonVersion,
} from "../publishing/publishingService";
import { validateLesson } from "../validation/lessonValidation";
import { LessonRenderer } from "@/components/lesson/LessonRenderer";
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
  Send,
  Plus,
  History,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface LessonEditorProps {
  lessonId: string;
  lessonTitle: string;
  initialBlocks: unknown[];
  initialRevision?: number;
  onBack?: () => void;
}

export function LessonEditor({
  lessonId,
  lessonTitle,
  initialBlocks,
  initialRevision = 1,
  onBack,
}: LessonEditorProps) {
  const normalizedInitialBlocks = adaptRawBlocks(initialBlocks);
  const { blocks, canUndo, canRedo, pushState, undo, redo, resetHistory } =
    useHistory(normalizedInitialBlocks);

  const [revision, setRevision] = useState<number>(initialRevision);

  const {
    status: autosaveStatus,
    isDirty,
    flushPendingSave,
    conflictMessage,
  } = useAutosave(lessonId, blocks, revision, setRevision);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(blocks[0]?.id || null);
  const [isPreview, setIsPreview] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [versions, setVersions] = useState<LessonVersion[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;
  const validation = validateLesson(blocks);

  // Flush pending saves before closing tab/window if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        flushPendingSave();
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, flushPendingSave]);

  const handleTogglePreview = async () => {
    if (!isPreview) {
      await flushPendingSave();
    }
    setIsPreview(!isPreview);
  };

  const handleBack = async () => {
    await flushPendingSave();
    if (onBack) onBack();
  };

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
            visibility: (newSettings["visibility"] as Visibility) || b.visibility,
            settings_json: { ...b.settings_json, ...newSettings },
          }
        : b,
    );
    pushState(updated);
  };

  const handleDuplicate = (blockId: string) => {
    const targetIndex = blocks.findIndex((b) => b.id === blockId);
    if (targetIndex < 0) return;
    const targetBlock = blocks[targetIndex];
    if (!targetBlock) return;
    const duplicated = duplicateBlock(targetBlock);
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
      await flushPendingSave();
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
    setLoadingHistory(true);
    try {
      const res = await fetchLessonVersions(lessonId);
      setVersions(res.versions);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    if (
      !confirm(
        `¿Restaurar la versión v${versionNumber}? Se creará un respaldo automático antes de restaurar.`,
      )
    )
      return;
    try {
      await flushPendingSave();
      await restoreLessonVersion(lessonId, versionNumber);
      const res = await fetchLessonVersions(lessonId);
      setVersions(res.versions);
      const targetVersion = res.versions.find((v) => v.version_number === versionNumber);
      if (targetVersion) {
        resetHistory(adaptRawBlocks(targetVersion.blocks_snapshot));
      }
      setIsHistoryModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al restaurar versión.";
      alert(msg);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden select-none">
      {/* Revision conflict alert header banner */}
      {conflictMessage && (
        <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-2 flex items-center justify-between text-xs text-destructive font-medium shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{conflictMessage}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.reload()}
            className="h-7 text-xs"
          >
            Recargar Página
          </Button>
        </div>
      )}

      {/* Top Action Header */}
      <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={handleBack}>
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
                ? `Guardado (r${revision})`
                : autosaveStatus === "conflict"
                  ? "Conflicto"
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

          <Button variant="outline" size="sm" onClick={handleTogglePreview}>
            <Eye className="size-4 mr-1.5" />{" "}
            {isPreview ? "Volver a Edición" : "Vista Previa Alumno"}
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
          <LessonRenderer
            lesson={{ id: lessonId, title: lessonTitle, slug: lessonId }}
            blocks={blocks.map((b) => ({
              id: b.id,
              lesson_id: lessonId,
              position: b.position,
              type: b.type as BlockType,
              content_json: b.content_json,
              settings_json: b.settings_json,
            }))}
          />
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
                  Esta lección está vacía. Añade tu primer bloque para comenzar.
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
              Al publicar se creará una versión snapshot inmutable en la base de datos con
              validación server-side.
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
              {isPublishing ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              {isPublishing ? "Validando y Publicando..." : "Confirmar Publicación"}
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
            {loadingHistory ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : versions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
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
