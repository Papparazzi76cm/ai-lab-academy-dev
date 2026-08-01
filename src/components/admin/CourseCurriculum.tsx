import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, Copy, GripVertical, Paperclip, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field } from "@/components/admin/Field";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { SortableList } from "@/components/admin/SortableList";
import {
  createLesson,
  createModule,
  createResource,
  deleteLesson,
  deleteModule,
  deleteResource,
  errorMessage,
  lessonStatusLabel,
  moduleDuration,
  persistOrder,
  resourceKindLabel,
  resourceKinds,
  slugify,
  uniqueSlug,
  updateLesson,
  updateModule,
  updateResource,
  type AdminCourseDetail,
  type Lesson,
  type LessonStatus,
  type Module,
  type Resource,
  type ResourceKind,
} from "@/lib/admin-api";
import { formatDuration } from "@/lib/api";

type ModuleWithLessons = AdminCourseDetail["modules"][number];
type LessonWithResources = ModuleWithLessons["lessons"][number];

type ModuleDraft = { id?: string; title: string; description: string; status: LessonStatus };
type LessonDraft = {
  id?: string;
  moduleId: string;
  title: string;
  slug: string;
  summary: string;
  content_text: string;
  duration_minutes: string;
  status: LessonStatus;
  is_free_preview: boolean;
};
type ResourceDraft = {
  id?: string;
  lessonId: string;
  title: string;
  kind: ResourceKind;
  url: string;
  description: string;
};

export function CourseCurriculum({ course }: { course: AdminCourseDetail }) {
  const queryClient = useQueryClient();
  const [moduleDraft, setModuleDraft] = useState<ModuleDraft | null>(null);
  const [lessonDraft, setLessonDraft] = useState<LessonDraft | null>(null);
  const [resourceDraft, setResourceDraft] = useState<ResourceDraft | null>(null);
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
    void queryClient.invalidateQueries({ queryKey: ["course", course.slug] });
  };

  const mutate = <T,>(fn: (input: T) => Promise<unknown>, message: string) => ({
    mutationFn: fn,
    onSuccess: () => {
      refresh();
      toast.success(message);
    },
    onError: (error: unknown) => toast.error(errorMessage(error)),
  });

  const allSlugs = course.modules.flatMap((m) => m.lessons.map((l) => l.slug));

  const saveModule = useMutation(
    mutate<ModuleDraft>(async (draft) => {
      const values = {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        status: draft.status,
      };
      if (draft.id) return updateModule(draft.id, values);
      return createModule({
        ...values,
        course_id: course.id,
        position: course.modules.length + 1,
      });
    }, "Módulo guardado."),
  );

  const saveLesson = useMutation(
    mutate<LessonDraft>(async (draft) => {
      const values = {
        title: draft.title.trim(),
        slug: slugify(draft.slug) || slugify(draft.title),
        summary: draft.summary.trim() || null,
        content_text: draft.content_text.trim() || null,
        duration_minutes: Number(draft.duration_minutes || 0),
        status: draft.status,
        is_free_preview: draft.is_free_preview,
      };
      if (draft.id) return updateLesson(draft.id, values);
      const module = course.modules.find((m) => m.id === draft.moduleId);
      return createLesson({
        ...values,
        course_id: course.id,
        module_id: draft.moduleId,
        position: (module?.lessons.length ?? 0) + 1,
      });
    }, "Lección guardada."),
  );

  const duplicateLesson = useMutation(
    mutate<LessonWithResources>(
      async (lesson) =>
        createLesson({
          course_id: course.id,
          module_id: lesson.module_id,
          title: `${lesson.title} (copia)`,
          slug: uniqueSlug(`${lesson.slug}-copia`, allSlugs),
          summary: lesson.summary,
          content: lesson.content,
          content_text: lesson.content_text,
          duration_minutes: lesson.duration_minutes,
          status: "draft",
          type: lesson.type,
          is_free_preview: lesson.is_free_preview,
          position: lesson.position + 1,
        }),
      "Lección duplicada.",
    ),
  );

  const saveResource = useMutation(
    mutate<ResourceDraft>(async (draft) => {
      const values = {
        title: draft.title.trim(),
        kind: draft.kind,
        url: draft.url.trim(),
        description: draft.description.trim() || null,
      };
      if (draft.id) return updateResource(draft.id, values);
      return createResource({ ...values, course_id: course.id, lesson_id: draft.lessonId });
    }, "Recurso guardado."),
  );

  const removeModule = useMutation(mutate<string>(deleteModule, "Módulo eliminado."));
  const removeLesson = useMutation(mutate<string>(deleteLesson, "Lección eliminada."));
  const removeResource = useMutation(mutate<string>(deleteResource, "Recurso eliminado."));
  const reorder = useMutation(
    mutate<{ table: "modules" | "lessons"; ids: string[] }>(
      ({ table, ids }) => persistOrder(table, ids),
      "Orden actualizado.",
    ),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Arrastra los módulos y las lecciones para reordenarlos.
        </p>
        <Button onClick={() => setModuleDraft({ title: "", description: "", status: "draft" })}>
          <Plus className="size-4" /> Nuevo módulo
        </Button>
      </div>

      {course.modules.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Este curso todavía no tiene módulos.
        </p>
      ) : (
        <SortableList
          items={course.modules}
          getId={(module) => module.id}
          onReorder={(ids) => reorder.mutate({ table: "modules", ids })}
          renderItem={(module) => (
            <ModuleCard
              module={module}
              onEdit={() =>
                setModuleDraft({
                  id: module.id,
                  title: module.title,
                  description: module.description ?? "",
                  status: module.status,
                })
              }
              onDelete={() => setModuleToDelete(module)}
              onAddLesson={() =>
                setLessonDraft({
                  moduleId: module.id,
                  title: "",
                  slug: "",
                  summary: "",
                  content_text: "",
                  duration_minutes: "0",
                  status: "draft",
                  is_free_preview: false,
                })
              }
              onEditLesson={(lesson) =>
                setLessonDraft({
                  id: lesson.id,
                  moduleId: lesson.module_id,
                  title: lesson.title,
                  slug: lesson.slug,
                  summary: lesson.summary ?? "",
                  content_text: lesson.content_text ?? "",
                  duration_minutes: String(lesson.duration_minutes),
                  status: lesson.status,
                  is_free_preview: lesson.is_free_preview,
                })
              }
              onDuplicateLesson={(lesson) => duplicateLesson.mutate(lesson)}
              onDeleteLesson={setLessonToDelete}
              onReorderLessons={(ids) => reorder.mutate({ table: "lessons", ids })}
              onAddResource={(lesson) =>
                setResourceDraft({
                  lessonId: lesson.id,
                  title: "",
                  kind: "pdf",
                  url: "",
                  description: "",
                })
              }
              onEditResource={(resource) =>
                setResourceDraft({
                  id: resource.id,
                  lessonId: resource.lesson_id ?? "",
                  title: resource.title,
                  kind: (resourceKinds as readonly string[]).includes(resource.kind)
                    ? (resource.kind as ResourceKind)
                    : "link",
                  url: resource.url,
                  description: resource.description ?? "",
                })
              }
              onDeleteResource={setResourceToDelete}
            />
          )}
        />
      )}

      {/* Módulo */}
      <Dialog open={Boolean(moduleDraft)} onOpenChange={(open) => !open && setModuleDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{moduleDraft?.id ? "Editar módulo" : "Nuevo módulo"}</DialogTitle>
          </DialogHeader>
          {moduleDraft ? (
            <div className="space-y-4">
              <Field label="Título" htmlFor="module-title">
                <Input
                  id="module-title"
                  value={moduleDraft.title}
                  onChange={(event) =>
                    setModuleDraft({ ...moduleDraft, title: event.target.value })
                  }
                />
              </Field>
              <Field label="Descripción" htmlFor="module-description">
                <Textarea
                  id="module-description"
                  rows={3}
                  value={moduleDraft.description}
                  onChange={(event) =>
                    setModuleDraft({ ...moduleDraft, description: event.target.value })
                  }
                />
              </Field>
              <Field label="Estado">
                <Select
                  value={moduleDraft.status}
                  onValueChange={(value) =>
                    setModuleDraft({ ...moduleDraft, status: value as LessonStatus })
                  }
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
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleDraft(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!moduleDraft?.title.trim() || saveModule.isPending}
              onClick={() =>
                moduleDraft &&
                saveModule.mutate(moduleDraft, { onSuccess: () => setModuleDraft(null) })
              }
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lección */}
      <Dialog open={Boolean(lessonDraft)} onOpenChange={(open) => !open && setLessonDraft(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{lessonDraft?.id ? "Editar lección" : "Nueva lección"}</DialogTitle>
          </DialogHeader>
          {lessonDraft ? (
            <div className="space-y-4">
              <Field label="Título" htmlFor="lesson-title">
                <Input
                  id="lesson-title"
                  value={lessonDraft.title}
                  onChange={(event) =>
                    setLessonDraft({ ...lessonDraft, title: event.target.value })
                  }
                />
              </Field>
              <Field label="Slug" htmlFor="lesson-slug" hint="Se genera desde el título.">
                <div className="flex gap-2">
                  <Input
                    id="lesson-slug"
                    value={lessonDraft.slug}
                    onChange={(event) =>
                      setLessonDraft({ ...lessonDraft, slug: event.target.value })
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setLessonDraft({ ...lessonDraft, slug: slugify(lessonDraft.title) })
                    }
                  >
                    Generar
                  </Button>
                </div>
              </Field>
              <Field label="Resumen" htmlFor="lesson-summary">
                <Textarea
                  id="lesson-summary"
                  rows={2}
                  value={lessonDraft.summary}
                  onChange={(event) =>
                    setLessonDraft({ ...lessonDraft, summary: event.target.value })
                  }
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
                  value={lessonDraft.content_text}
                  onChange={(event) =>
                    setLessonDraft({ ...lessonDraft, content_text: event.target.value })
                  }
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tiempo estimado (minutos)" htmlFor="lesson-duration">
                  <Input
                    id="lesson-duration"
                    type="number"
                    min={0}
                    value={lessonDraft.duration_minutes}
                    onChange={(event) =>
                      setLessonDraft({ ...lessonDraft, duration_minutes: event.target.value })
                    }
                  />
                </Field>
                <Field label="Estado">
                  <Select
                    value={lessonDraft.status}
                    onValueChange={(value) =>
                      setLessonDraft({ ...lessonDraft, status: value as LessonStatus })
                    }
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
                  checked={lessonDraft.is_free_preview}
                  onCheckedChange={(checked) =>
                    setLessonDraft({ ...lessonDraft, is_free_preview: checked })
                  }
                />
                <label htmlFor="lesson-preview" className="text-sm">
                  Vista previa gratuita
                </label>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonDraft(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!lessonDraft?.title.trim() || saveLesson.isPending}
              onClick={() =>
                lessonDraft &&
                saveLesson.mutate(lessonDraft, { onSuccess: () => setLessonDraft(null) })
              }
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recurso */}
      <Dialog
        open={Boolean(resourceDraft)}
        onOpenChange={(open) => !open && setResourceDraft(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{resourceDraft?.id ? "Editar recurso" : "Nuevo recurso"}</DialogTitle>
          </DialogHeader>
          {resourceDraft ? (
            <div className="space-y-4">
              <Field label="Título" htmlFor="resource-title">
                <Input
                  id="resource-title"
                  value={resourceDraft.title}
                  onChange={(event) =>
                    setResourceDraft({ ...resourceDraft, title: event.target.value })
                  }
                />
              </Field>
              <Field label="Tipo">
                <Select
                  value={resourceDraft.kind}
                  onValueChange={(value) =>
                    setResourceDraft({ ...resourceDraft, kind: value as ResourceKind })
                  }
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
                  value={resourceDraft.url}
                  onChange={(event) =>
                    setResourceDraft({ ...resourceDraft, url: event.target.value })
                  }
                  placeholder="https://…"
                />
              </Field>
              <Field label="Descripción" htmlFor="resource-description">
                <Textarea
                  id="resource-description"
                  rows={2}
                  value={resourceDraft.description}
                  onChange={(event) =>
                    setResourceDraft({ ...resourceDraft, description: event.target.value })
                  }
                />
              </Field>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResourceDraft(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!resourceDraft?.title.trim() || !resourceDraft?.url.trim()}
              onClick={() =>
                resourceDraft &&
                saveResource.mutate(resourceDraft, { onSuccess: () => setResourceDraft(null) })
              }
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(moduleToDelete)}
        onOpenChange={(open) => !open && setModuleToDelete(null)}
        title="Eliminar módulo"
        description={`Se eliminará "${moduleToDelete?.title ?? ""}" y todas sus lecciones.`}
        onConfirm={() =>
          moduleToDelete &&
          removeModule.mutate(moduleToDelete.id, { onSuccess: () => setModuleToDelete(null) })
        }
      />
      <ConfirmDialog
        open={Boolean(lessonToDelete)}
        onOpenChange={(open) => !open && setLessonToDelete(null)}
        title="Eliminar lección"
        description={`Se eliminará "${lessonToDelete?.title ?? ""}" y sus recursos.`}
        onConfirm={() =>
          lessonToDelete &&
          removeLesson.mutate(lessonToDelete.id, { onSuccess: () => setLessonToDelete(null) })
        }
      />
      <ConfirmDialog
        open={Boolean(resourceToDelete)}
        onOpenChange={(open) => !open && setResourceToDelete(null)}
        title="Eliminar recurso"
        description={`Se eliminará "${resourceToDelete?.title ?? ""}".`}
        onConfirm={() =>
          resourceToDelete &&
          removeResource.mutate(resourceToDelete.id, { onSuccess: () => setResourceToDelete(null) })
        }
      />
    </div>
  );
}

function ModuleCard({
  module,
  onEdit,
  onDelete,
  onAddLesson,
  onEditLesson,
  onDuplicateLesson,
  onDeleteLesson,
  onReorderLessons,
  onAddResource,
  onEditResource,
  onDeleteResource,
}: {
  module: ModuleWithLessons;
  onEdit: () => void;
  onDelete: () => void;
  onAddLesson: () => void;
  onEditLesson: (lesson: LessonWithResources) => void;
  onDuplicateLesson: (lesson: LessonWithResources) => void;
  onDeleteLesson: (lesson: Lesson) => void;
  onReorderLessons: (ids: string[]) => void;
  onAddResource: (lesson: LessonWithResources) => void;
  onEditResource: (resource: Resource) => void;
  onDeleteResource: (resource: Resource) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <GripVertical className="mt-1 size-4 shrink-0 cursor-grab text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display font-semibold">{module.title}</h3>
            <Badge variant={module.status === "published" ? "default" : "secondary"}>
              {lessonStatusLabel[module.status]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {module.lessons.length} lecciones · {formatDuration(moduleDuration(module.lessons))}
            </span>
          </div>
          {module.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
          ) : null}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label="Editar módulo" onClick={onEdit}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Eliminar módulo" onClick={onDelete}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-3 pl-7">
        {module.lessons.length ? (
          <SortableList
            items={module.lessons}
            getId={(lesson) => lesson.id}
            onReorder={onReorderLessons}
            renderItem={(lesson) => (
              <LessonRow
                lesson={lesson}
                onEdit={() => onEditLesson(lesson)}
                onDuplicate={() => onDuplicateLesson(lesson)}
                onDelete={() => onDeleteLesson(lesson)}
                onAddResource={() => onAddResource(lesson)}
                onEditResource={onEditResource}
                onDeleteResource={onDeleteResource}
              />
            )}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Sin lecciones todavía.</p>
        )}

        <Button variant="outline" size="sm" onClick={onAddLesson}>
          <Plus className="size-4" /> Añadir lección
        </Button>
      </div>
    </div>
  );
}

function LessonRow({
  lesson,
  onEdit,
  onDuplicate,
  onDelete,
  onAddResource,
  onEditResource,
  onDeleteResource,
}: {
  lesson: LessonWithResources;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddResource: () => void;
  onEditResource: (resource: Resource) => void;
  onDeleteResource: (resource: Resource) => void;
}) {
  return (
    <Collapsible className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center gap-2">
        <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
        <span className="truncate text-sm font-medium">{lesson.title}</span>
        <Badge variant={lesson.status === "published" ? "default" : "secondary"}>
          {lessonStatusLabel[lesson.status]}
        </Badge>
        {lesson.is_free_preview ? <Badge variant="outline">Gratis</Badge> : null}
        <span className="text-xs text-muted-foreground">
          {formatDuration(lesson.duration_minutes)}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Ver recursos">
              <Paperclip className="size-4" />
              <ChevronDown className="size-3" />
            </Button>
          </CollapsibleTrigger>
          <Button variant="ghost" size="icon" aria-label="Editar lección" onClick={onEdit}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Duplicar lección" onClick={onDuplicate}>
            <Copy className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Eliminar lección" onClick={onDelete}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <CollapsibleContent className="mt-3 space-y-2 border-t border-border pt-3">
        {lesson.resources.length ? (
          <ul className="space-y-2">
            {lesson.resources.map((resource) => (
              <li key={resource.id} className="flex items-center gap-2 text-sm">
                <Badge variant="outline">
                  {resourceKindLabel[resource.kind as ResourceKind] ?? resource.kind}
                </Badge>
                <span className="truncate">{resource.title}</span>
                <div className="ml-auto flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Editar recurso"
                    onClick={() => onEditResource(resource)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Eliminar recurso"
                    onClick={() => onDeleteResource(resource)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Sin recursos.</p>
        )}
        <Button variant="outline" size="sm" onClick={onAddResource}>
          <Plus className="size-4" /> Añadir recurso
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
