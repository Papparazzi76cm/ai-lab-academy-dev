import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createLesson,
  createModule,
  createResource,
  deleteLesson,
  deleteModule,
  deleteResource,
  errorMessage,
  persistOrder,
  slugify,
  uniqueSlug,
  updateLesson,
  updateModule,
  updateResource,
  type AdminCourseDetail,
  type LessonStatus,
  type ResourceKind,
} from "@/lib/admin-api";

export type ModuleWithLessons = AdminCourseDetail["modules"][number];
export type LessonWithResources = ModuleWithLessons["lessons"][number];

export type ModuleDraft = { id?: string; title: string; description: string; status: LessonStatus };
export type LessonDraft = {
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
export type ResourceDraft = {
  id?: string;
  lessonId: string;
  title: string;
  kind: ResourceKind;
  url: string;
  description: string;
};

export function useCurriculumMutations(course: AdminCourseDetail) {
  const queryClient = useQueryClient();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
    void queryClient.invalidateQueries({ queryKey: ["course", course.slug] });
  };

  const mutate = <T>(fn: (input: T) => Promise<unknown>, message: string) => ({
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

  return {
    saveModule,
    saveLesson,
    duplicateLesson,
    saveResource,
    removeModule,
    removeLesson,
    removeResource,
    reorder,
  };
}
