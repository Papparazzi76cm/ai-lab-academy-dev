import { useState } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Field } from "@/components/admin/Field";
import { slugify, type LessonStatus } from "@/lib/admin-api";
import type { LessonDraft } from "./useCurriculumMutations";
import { BlockEditor } from "@/components/admin/blocks/BlockEditor";
import { Settings, Layers } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"blocks" | "settings">(
    draft?.id ? "blocks" : "settings",
  );

  if (!draft) return null;

  return (
    <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-xl font-display font-semibold flex items-center justify-between">
            <span>{draft.id ? `Editar: ${draft.title}` : "Nueva lección"}</span>
          </DialogTitle>

          {draft.id && (
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "blocks" | "settings")}
              className="mt-2 w-full"
            >
              <TabsList className="grid w-full grid-cols-2 max-w-xs bg-muted/60">
                <TabsTrigger value="blocks" className="gap-2 text-xs">
                  <Layers className="size-3.5" />
                  <span>Editor de bloques</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-2 text-xs">
                  <Settings className="size-3.5" />
                  <span>Ajustes de lección</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 px-1">
          {(!draft.id || activeTab === "settings") && (
            <div className="space-y-4 max-w-2xl mx-auto">
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
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tiempo estimado (minutos)" htmlFor="lesson-duration">
                  <Input
                    id="lesson-duration"
                    type="number"
                    min={0}
                    value={draft.duration_minutes}
                    onChange={(event) =>
                      onChange({ ...draft, duration_minutes: event.target.value })
                    }
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
                <label htmlFor="lesson-preview" className="text-sm font-medium">
                  Vista previa gratuita
                </label>
              </div>
            </div>
          )}

          {draft.id && activeTab === "blocks" && <BlockEditor lessonId={draft.id} />}
        </div>

        <DialogFooter className="border-t border-border pt-3">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {(!draft.id || activeTab === "settings") && (
            <Button disabled={!draft.title.trim() || isPending} onClick={() => onSave(draft)}>
              Guardar ajustes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
