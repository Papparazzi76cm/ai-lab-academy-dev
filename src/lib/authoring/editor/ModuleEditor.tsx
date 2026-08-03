import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ModuleDraft {
  id?: string;
  title: string;
  description: string;
  status: "draft" | "published" | "archived";
}

interface ModuleEditorProps {
  draft: ModuleDraft | null;
  onClose: () => void;
  onChange: (draft: ModuleDraft) => void;
  onSave: (draft: ModuleDraft) => void;
  isPending?: boolean;
}

export function ModuleEditor({ draft, onClose, onChange, onSave, isPending }: ModuleEditorProps) {
  if (!draft) return null;

  return (
    <Dialog open={Boolean(draft)} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md p-6 space-y-4">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {draft.id ? "Editar Módulo" : "Nuevo Módulo de Aprendizaje"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Título del Módulo *
            </label>
            <Input
              value={draft.title}
              onChange={(e) => onChange({ ...draft, title: e.target.value })}
              placeholder="Ej. Introducción a Redes Neuronales"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Descripción Breve
            </label>
            <Textarea
              value={draft.description}
              onChange={(e) => onChange({ ...draft, description: e.target.value })}
              placeholder="Resumen del contenido del módulo..."
              rows={3}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Estado</label>
            <Select
              value={draft.status}
              onValueChange={(val: "draft" | "published" | "archived") =>
                onChange({ ...draft, status: val })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="published">Publicado</SelectItem>
                <SelectItem value="archived">Archivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(draft)} disabled={!draft.title.trim() || isPending}>
            {isPending ? "Guardando..." : "Guardar Módulo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
