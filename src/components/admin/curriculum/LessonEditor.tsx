import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { slugify, type LessonStatus } from "@/lib/admin-api";
import type { LessonDraft } from "./useCurriculumMutations";

export function LessonEditor({
  draft,
  onClose,
  onChange,
  onSave,
  isPending,
}: {
  draft: LessonDraft | null;
  onClose: () => void;
  onChange: (draft: LessonDraft) => void;
  onSave: (draft: LessonDraft) => void;
  isPending: boolean;
}) {
  if (!draft) return null;

  return (
    <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Editar lección" : "Nueva lección"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Título" htmlFor="lesson-title">
            <Input
              id="lesson-title"
              value={draft.title}
              onChange={(event) => onChange({ ...draft, title: event.target.value })}
            />
          </Field>
          <Field label="Slug" htmlFor="lesson-slug" hint="Se genera desde el título.">
            <div className="flex gap-2">
              <Input
                id="lesson-slug"
                value={draft.slug}
                onChange={(event) => onChange({ ...draft, slug: event.target.value })}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => onChange({ ...draft, slug: slugify(draft.title) })}
              >
                Generar
              </Button>
            </div>
          </Field>
          <Field label="Resumen" htmlFor="lesson-summary">
            <Textarea
              id="lesson-summary"
              rows={2}
              value={draft.summary}
              onChange={(event) => onChange({ ...draft, summary: event.target.value })}
            />
          </Field>
          <Field
            label="Contenido (temporal)"
            htmlFor="lesson-content"
            hint="Campo provisional hasta que llegue el editor por bloques."
          >
            <Textarea
              id="lesson-content"
              rows={6}
              value={draft.content_text}
              onChange={(event) => onChange({ ...draft, content_text: event.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tiempo estimado (minutos)" htmlFor="lesson-duration">
              <Input
                id="lesson-duration"
                type="number"
                min={0}
                value={draft.duration_minutes}
                onChange={(event) => onChange({ ...draft, duration_minutes: event.target.value })}
              />
            </Field>
            <Field label="Estado">
              <Select
                value={draft.status}
                onValueChange={(value) => onChange({ ...draft, status: value as LessonStatus })}
              >
                <SelectTrigger aria-label="Estado de la lección">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="published">Publicada</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="lesson-preview"
              checked={draft.is_free_preview}
              onCheckedChange={(checked) => onChange({ ...draft, is_free_preview: checked })}
            />
            <label htmlFor="lesson-preview" className="text-sm">
              Vista previa gratuita
            </label>
          </div>
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
