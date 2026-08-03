import React, { useState } from "react";
import {
  ArrowLeft,
  Eye,
  History,
  Send,
  Undo,
  Redo,
  AlertCircle,
  Plus,
  Layers,
  Settings,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { LessonRenderer } from "@/components/lesson/LessonRenderer";
import type { AuthoringBlock, AuthoringBlockSettings } from "../types";
import { BlockRegistry } from "../blocks/registry";
import { BlockEditor } from "./BlockEditor";
import { PropertiesPanel } from "./PropertiesPanel";
import { OutlinePanel } from "./OutlinePanel";
import { useAutosave } from "../autosave/useAutosave";
import { useHistory } from "../history/useHistory";
import { validateLesson } from "../validation/lessonValidation";
import {
  publishLesson,
  fetchLessonVersions,
  restoreLessonVersion,
} from "../publishing/publishingService";
import { GenerateLessonDialog } from "@/components/authoring/GenerateLessonDialog";
import type { LessonBlockItem } from "@/lib/blocks";

interface LessonEditorProps {
  lessonId: string;
  lessonTitle: string;
  initialBlocks?: AuthoringBlock[];
  initialRevision?: number;
  onBack?: () => void;
}

export function LessonEditor({
  lessonId,
  lessonTitle,
  initialBlocks = [],
  initialRevision = 1,
  onBack,
}: LessonEditorProps) {
  const [revision, setRevision] = useState(initialRevision);

  const {
    state: blocks,
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory(initialBlocks);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    initialBlocks.length > 0 && initialBlocks[0] ? initialBlocks[0].id : null,
  );
  const [activeSidebarTab, setActiveSidebarTab] = useState<"outline" | "properties">("outline");
  const [isPreview, setIsPreview] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [historyVersions, setHistoryVersions] = useState<any[]>([]);

  const {
    status: autosaveStatus,
    conflictMessage,
    flushPendingSave,
  } = useAutosave(
    lessonId,
    blocks,
    revision,
    (newRev) => setRevision(newRev),
  );

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;
  const validation = validateLesson(blocks);

  const handleAddBlock = (type: AuthoringBlock["type"]) => {
    const def = BlockRegistry.get(type);
    if (!def) return;

    const newBlock: AuthoringBlock = {
      id: `blk-${Math.random().toString(36).substring(2, 9)}`,
      type,
      position: blocks.length,
      visibility: "visible",
      content_json: { ...def.defaultContent },
      settings_json: { ...def.defaultSettings },
    };

    const nextBlocks = [...blocks, newBlock];
    pushState(nextBlocks);
    setSelectedBlockId(newBlock.id);
  };

  const handleUpdateBlockContent = (
    blockId: string,
    newContent: Record<string, unknown>,
  ) => {
    const nextBlocks = blocks.map((b) =>
      b.id === blockId ? { ...b, content_json: newContent } : b,
    );
    pushState(nextBlocks);
  };

  const handleUpdateBlockSettings = (
    blockId: string,
    newSettings: Partial<AuthoringBlockSettings>,
  ) => {
    const nextBlocks = blocks.map((b) =>
      b.id === blockId ? { ...b, settings_json: { ...b.settings_json, ...newSettings } } : b,
    );
    pushState(nextBlocks);
  };

  const handleDeleteBlock = (blockId: string) => {
    const nextBlocks = blocks.filter((b) => b.id !== blockId);
    pushState(nextBlocks);
    if (selectedBlockId === blockId) {
      setSelectedBlockId(nextBlocks.length > 0 && nextBlocks[0] ? nextBlocks[0].id : null);
    }
  };

  const handleDuplicateBlock = (blockId: string) => {
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx === -1 || !blocks[idx]) return;

    const target = blocks[idx];
    const dupBlock: AuthoringBlock = {
      ...target,
      id: `blk-${Math.random().toString(36).substring(2, 9)}`,
      position: idx + 1,
    };

    const nextBlocks = [...blocks];
    nextBlocks.splice(idx + 1, 0, dupBlock);

    nextBlocks.forEach((b, i) => {
      b.position = i;
    });

    pushState(nextBlocks);
    setSelectedBlockId(dupBlock.id);
  };

  const handleMoveBlock = (blockId: string, direction: "up" | "down") => {
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx === -1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;

    const nextBlocks = [...blocks];
    const temp = nextBlocks[idx];
    const targetItem = nextBlocks[targetIdx];
    if (temp && targetItem) {
      nextBlocks[idx] = targetItem;
      nextBlocks[targetIdx] = temp;
    }

    nextBlocks.forEach((b, i) => {
      b.position = i;
    });

    pushState(nextBlocks);
  };

  const handleTogglePreview = () => {
    setIsPreview(!isPreview);
  };

  const handlePublish = async () => {
    try {
      await publishLesson(lessonId, `Publicación de revisión r${revision}`);
      setIsPublishModalOpen(false);
      alert("¡Lección publicada con éxito!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al publicar lección.";
      alert(msg);
    }
  };

  const handleOpenHistory = async () => {
    try {
      const res = await fetchLessonVersions(lessonId);
      setHistoryVersions(res.versions || []);
      setIsHistoryModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al obtener historial.";
      alert(msg);
    }
  };

  const handleRestoreVersion = async (targetVersion: number) => {
    try {
      await restoreLessonVersion(lessonId, targetVersion);
      setIsHistoryModalOpen(false);
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al restaurar versión.";
      alert(msg);
    }
  };

  const handleAcceptAIGeneratedBlocks = async (newBlocks: AuthoringBlock[]) => {
    pushState(newBlocks);
    if (newBlocks.length > 0 && newBlocks[0]) {
      setSelectedBlockId(newBlocks[0].id);
    }
    await flushPendingSave();
  };

  const handleBack = () => {
    if (onBack) onBack();
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

          <GenerateLessonDialog
            lessonId={lessonId}
            lessonTitle={lessonTitle}
            onAcceptBlocks={handleAcceptAIGeneratedBlocks}
          />

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
              type: (b.type === "embed" ? "video" : b.type) as LessonBlockItem["type"],
              content_json: b.content_json,
              settings_json: b.settings_json,
            }))}
          />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Main Block Canvas */}
          <main className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-6 max-w-4xl mx-auto">
            {blocks.length === 0 ? (
              <div className="py-20 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-card/40">
                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <Sparkles className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Lección vacía</h3>
                <p className="text-sm text-muted-foreground max-w-md mt-1 mb-6">
                  Añade tu primer bloque o utiliza el Agente IA para generar el contenido completo automáticamente.
                </p>
                <div className="flex gap-3">
                  <GenerateLessonDialog
                    lessonId={lessonId}
                    lessonTitle={lessonTitle}
                    onAcceptBlocks={handleAcceptAIGeneratedBlocks}
                  />
                  <Button variant="outline" onClick={() => handleAddBlock("paragraph")}>
                    <Plus className="size-4 mr-1.5" /> Añadir Párrafo
                  </Button>
                </div>
              </div>
            ) : (
              blocks.map((block, index) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  isSelected={selectedBlockId === block.id}
                  onSelect={() => setSelectedBlockId(block.id)}
                  onChangeContent={(nc) => handleUpdateBlockContent(block.id, nc)}
                  onChangeSettings={(ns) => handleUpdateBlockSettings(block.id, ns)}
                  onDuplicate={() => handleDuplicateBlock(block.id)}
                  onDelete={() => handleDeleteBlock(block.id)}
                  onMoveUp={() => handleMoveBlock(block.id, "up")}
                  onMoveDown={() => handleMoveBlock(block.id, "down")}
                  isFirst={index === 0}
                  isLast={index === blocks.length - 1}
                />
              ))
            )}

            {/* Bottom Add Block Trigger Bar */}
            <div className="pt-6 border-t border-border/80 flex flex-wrap gap-2 items-center justify-center">
              <span className="text-xs text-muted-foreground mr-2 font-medium">Añadir bloque:</span>
              {BlockRegistry.getAll().map((def) => (
                <Button
                  key={def.type}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddBlock(def.type)}
                  className="text-xs h-8 rounded-xl"
                >
                  <Plus className="size-3 mr-1" /> {def.name}
                </Button>
              ))}
            </div>
          </main>

          {/* Right Sidebar for Inspector / Outline */}
          <aside className="w-80 border-l border-border bg-card flex flex-col shrink-0">
            <div className="flex border-b border-border bg-muted/30 p-1">
              <Button
                variant={activeSidebarTab === "outline" ? "secondary" : "ghost"}
                size="sm"
                className="flex-1 text-xs gap-1.5"
                onClick={() => setActiveSidebarTab("outline")}
              >
                <Layers className="size-3.5" /> Esquema ({blocks.length})
              </Button>
              <Button
                variant={activeSidebarTab === "properties" ? "secondary" : "ghost"}
                size="sm"
                className="flex-1 text-xs gap-1.5"
                onClick={() => setActiveSidebarTab("properties")}
              >
                <Settings className="size-3.5" /> Propiedades
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activeSidebarTab === "outline" ? (
                <OutlinePanel
                  blocks={blocks}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={setSelectedBlockId}
                  onDeleteBlock={handleDeleteBlock}
                  onOpenAddModal={() => handleAddBlock("paragraph")}
                />
              ) : (
                <PropertiesPanel
                  selectedBlock={selectedBlock}
                  onChangeSettings={(blockId, newSettings) => handleUpdateBlockSettings(blockId, newSettings)}
                  onDuplicate={handleDuplicateBlock}
                  onDelete={handleDeleteBlock}
                  onMoveUp={(blockId) => handleMoveBlock(blockId, "up")}
                  onMoveDown={(blockId) => handleMoveBlock(blockId, "down")}
                  isFirst={selectedBlockId ? blocks.findIndex((b) => b.id === selectedBlockId) === 0 : true}
                  isLast={selectedBlockId ? blocks.findIndex((b) => b.id === selectedBlockId) === blocks.length - 1 : true}
                />
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Publish Confirmation Modal */}
      <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Publicar Lección</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              Estás a punto de publicar esta lección como la revisión activa <strong>r{revision}</strong>. Esto creará una instantánea inmutable en el historial.
            </p>
            <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
              <div className="flex justify-between">
                <span>Total bloques:</span>
                <span className="font-semibold font-mono">{blocks.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Estado de validación:</span>
                <Badge variant={validation.isValid ? "default" : "destructive"}>
                  {validation.isValid ? "Válida" : "Errores"}
                </Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsPublishModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePublish} disabled={!validation.isValid}>
              Confirmar Publicación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Modal */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Historial de Revisiones</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {historyVersions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No hay publicaciones previas registradas.
              </p>
            ) : (
              historyVersions.map((ver) => (
                <div
                  key={ver.id || ver.version_number}
                  className="p-3 rounded-xl border border-border bg-card flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      <span>Versión {ver.version_number}</span>
                    </div>
                    <div className="text-muted-foreground text-[11px] font-mono mt-0.5">
                      {new Date(ver.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestoreVersion(ver.version_number)}
                  >
                    Restaurar esta versión
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
