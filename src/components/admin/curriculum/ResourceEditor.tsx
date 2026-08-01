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
import { resourceKindLabel, resourceKinds, type ResourceKind } from "@/lib/admin-api";
import type { ResourceDraft } from "./useCurriculumMutations";

export function ResourceEditor({
  draft,
  onClose,
  onSave,
  isPending,
}: {
  draft: ResourceDraft | null;
  onClose: () => void;
  onSave: (draft: ResourceDraft) => void;
  isPending: boolean;
}) {
  if (!draft) return null;

  return (
    <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{draft.id ? "Editar recurso" : "Nuevo recurso"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Título" htmlFor="resource-title">
            <Input
              id="resource-title"
              value={draft.title}
              onChange={(event) => onSave({ ...draft, title: event.target.value })}
            />
          </Field>
          <Field label="Tipo">
            <Select
              value={draft.kind}
              onValueChange={(value) => onSave({ ...draft, kind: value as ResourceKind })}
            >
              <SelectTrigger aria-label="Tipo de recurso">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {resourceKinds.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {resourceKindLabel[kind]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="URL" htmlFor="resource-url">
            <Input
              id="resource-url"
              value={draft.url}
              onChange={(event) => onSave({ ...draft, url: event.target.value })}
              placeholder="https://…"
            />
          </Field>
          <Field label="Descripción" htmlFor="resource-description">
            <Textarea
              id="resource-description"
              rows={2}
              value={draft.description}
              onChange={(event) => onSave({ ...draft, description: event.target.value })}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!draft.title.trim() || !draft.url.trim() || isPending}
            onClick={() => onSave(draft)}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
