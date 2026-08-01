import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Edit3,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Plus,
  ChevronsUpDown,
  Undo2,
  Redo2,
} from "lucide-react";
import type { SaveStatus } from "./useLessonBlocks";

export function BlockToolbar({
  mode,
  onModeChange,
  saveStatus,
  onAddBlock,
  onExpandAll,
  onCollapseAll,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  mode: "edit" | "preview";
  onModeChange: (mode: "edit" | "preview") => void;
  saveStatus: SaveStatus;
  onAddBlock: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur-md">
      {/* Mode switcher tabs */}
      <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 p-1">
        <Button
          type="button"
          size="sm"
          variant={mode === "edit" ? "default" : "ghost"}
          onClick={() => onModeChange("edit")}
          className="h-8 gap-1.5 px-3 text-xs font-medium"
        >
          <Edit3 className="size-3.5" />
          <span>Editar</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "preview" ? "default" : "ghost"}
          onClick={() => onModeChange("preview")}
          className="h-8 gap-1.5 px-3 text-xs font-medium"
        >
          <Eye className="size-3.5" />
          <span>Vista previa</span>
        </Button>
      </div>

      {/* Save status badge */}
      <div className="flex items-center gap-2">
        {saveStatus === "saving" && (
          <Badge
            variant="outline"
            className="gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          >
            <Loader2 className="size-3 animate-spin" />
            <span>Guardando...</span>
          </Badge>
        )}
        {saveStatus === "saved" && (
          <Badge
            variant="outline"
            className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle2 className="size-3" />
            <span>Guardado</span>
          </Badge>
        )}
        {saveStatus === "error" && (
          <Badge
            variant="outline"
            className="gap-1.5 border-destructive/30 bg-destructive/10 text-destructive"
          >
            <AlertCircle className="size-3" />
            <span>Error al guardar</span>
          </Badge>
        )}
        {saveStatus === "idle" && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Autoguardado activo
          </span>
        )}
      </div>

      {/* Toolbar actions */}
      <div className="flex items-center gap-1">
        {/* Undo / Redo */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={!canUndo || mode === "preview"}
          onClick={onUndo}
          title="Deshacer (Undo)"
          className="size-8"
        >
          <Undo2 className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={!canRedo || mode === "preview"}
          onClick={onRedo}
          title="Rehacer (Redo)"
          className="size-8"
        >
          <Redo2 className="size-3.5" />
        </Button>

        <div className="mx-1 h-4 w-px bg-border" />

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onExpandAll}
          title="Expandir todos los bloques"
          className="h-8 gap-1 px-2.5 text-xs"
        >
          <ChevronsUpDown className="size-3.5" />
          <span className="hidden sm:inline">Expandir todos</span>
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCollapseAll}
          title="Colapsar todos los bloques"
          className="h-8 gap-1 px-2.5 text-xs text-muted-foreground"
        >
          <span>Colapsar</span>
        </Button>

        {mode === "edit" && (
          <Button
            type="button"
            size="sm"
            onClick={onAddBlock}
            className="h-8 gap-1.5 px-3 text-xs shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>Añadir bloque</span>
          </Button>
        )}
      </div>
    </div>
  );
}
