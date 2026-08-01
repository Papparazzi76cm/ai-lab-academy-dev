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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/admin/Field";
import type { LessonStatus } from "@/lib/admin-api";
import type { ModuleDraft } from "./useCurriculumMutations";

export function ModuleEditor({
  draft,
  onClose,
  onChange,
  onSave,
  isPending,
}: {
  draft: ModuleDraft | null;
  onClose: () => void;
  onChange: (draft: ModuleDraft) => void;
  onSave: (draft: ModuleDraft) => void;
  isPending: boolean;
}) {
  if (!draft) return null;

  return (
    <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{draft.id ? "Editar módulo" : "Nuevo módulo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Título" htmlFor="module-title">
            <Input
              id="module-title"
              value={draft.title}
              onChange={(event) => onChange({ ...draft, title: event.target.value })}
            />
          </Field>
          <Field label="Descripción" htmlFor="module-description">
            <Textarea
              id="module-description"
              rows={3}
              value={draft.description}
              onChange={(event) => onChange({ ...draft, description: event.target.value })}
            />
          </Field>
          <Field label="Estado">
            <Select
              value={draft.status}
              onValueChange={(value) => onChange({ ...draft, status: value as LessonStatus })}
            >
              <SelectTrigger aria-label="Estado del módulo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="published">Publicado</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!draft.title.trim() || isPending} onClick={() => onSave(draft)}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
