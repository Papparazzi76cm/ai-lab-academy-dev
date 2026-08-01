import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  resourceKinds,
  type AdminCourseDetail,
  type Lesson,
  type Module,
  type Resource,
  type ResourceKind,
} from "@/lib/admin-api";
import { ModuleList } from "./curriculum/ModuleList";
import { ModuleEditor } from "./curriculum/ModuleEditor";
import { LessonEditor } from "./curriculum/LessonEditor";
import { ResourceEditor } from "./curriculum/ResourceEditor";
import {
  useCurriculumMutations,
  type LessonDraft,
  type ModuleDraft,
  type ResourceDraft,
} from "./curriculum/useCurriculumMutations";

export function CourseCurriculum({ course }: { course: AdminCourseDetail }) {
  const [moduleDraft, setModuleDraft] = useState<ModuleDraft | null>(null);
  const [lessonDraft, setLessonDraft] = useState<LessonDraft | null>(null);
  const [resourceDraft, setResourceDraft] = useState<ResourceDraft | null>(null);

  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);

  const {
    saveModule,
    saveLesson,
    duplicateLesson,
    saveResource,
    removeModule,
    removeLesson,
    removeResource,
    reorder,
  } = useCurriculumMutations(course);

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

      <ModuleList
        modules={course.modules}
        onEditModule={(module) =>
          setModuleDraft({
            id: module.id,
            title: module.title,
            description: module.description ?? "",
            status: module.status,
          })
        }
        onDeleteModule={setModuleToDelete}
        onReorderModules={(ids) => reorder.mutate({ table: "modules", ids })}
        onAddLesson={(moduleId) =>
          setLessonDraft({
            moduleId,
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

      <ModuleEditor
        draft={moduleDraft}
        onClose={() => setModuleDraft(null)}
        onChange={setModuleDraft}
        onSave={(draft) => saveModule.mutate(draft, { onSuccess: () => setModuleDraft(null) })}
        isPending={saveModule.isPending}
      />

      <LessonEditor
        draft={lessonDraft}
        onClose={() => setLessonDraft(null)}
        onChange={setLessonDraft}
        onSave={(draft) => saveLesson.mutate(draft, { onSuccess: () => setLessonDraft(null) })}
        isPending={saveLesson.isPending}
      />

      <ResourceEditor
        draft={resourceDraft}
        onClose={() => setResourceDraft(null)}
        onSave={(draft) => saveResource.mutate(draft, { onSuccess: () => setResourceDraft(null) })}
        isPending={saveResource.isPending}
      />

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
