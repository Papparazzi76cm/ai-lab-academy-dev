import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Course = Tables<"courses">;
export type Category = Tables<"categories">;
export type Instructor = Tables<"instructors">;
export type Module = Tables<"modules">;
export type Lesson = Tables<"lessons">;
export type Resource = Tables<"resources">;

export type CourseStatus = Enums<"course_status">;
export type CourseLevel = Enums<"course_level">;
export type LessonStatus = Enums<"lesson_status">;

export type AdminCourseRow = Course & {
  categories: Pick<Category, "id" | "name" | "slug"> | null;
  instructors: Pick<Instructor, "id" | "name"> | null;
};

export type AdminCourseDetail = Course & {
  modules: (Module & { lessons: (Lesson & { resources: Resource[] })[] })[];
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Convierte un texto en un slug válido para URLs. */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Devuelve un slug único añadiendo un sufijo numérico si ya existe. */
export function uniqueSlug(base: string, taken: string[]): string {
  const slug = slugify(base) || "sin-titulo";
  if (!taken.includes(slug)) return slug;
  let i = 2;
  while (taken.includes(`${slug}-${i}`)) i += 1;
  return `${slug}-${i}`;
}

export function errorMessage(error: unknown, fallback = "No se pudo completar la operación.") {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message);
    if (message.includes("cursos asociados"))
      return "No puedes eliminar una categoría con cursos asociados.";
    if (message.includes("duplicate key")) return "Ya existe un registro con ese slug.";
    if (message.includes("violates foreign key"))
      return "No se puede eliminar: hay elementos asociados.";
    return message;
  }
  return fallback;
}

export const courseStatusLabel: Record<CourseStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
};

export const courseLevelLabel: Record<CourseLevel, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

export const lessonStatusLabel: Record<LessonStatus, string> = {
  draft: "Borrador",
  published: "Publicada",
};

export const resourceKinds = ["pdf", "zip", "audio", "video", "link", "download"] as const;
export type ResourceKind = (typeof resourceKinds)[number];

export const resourceKindLabel: Record<ResourceKind, string> = {
  pdf: "PDF",
  zip: "ZIP",
  audio: "Audio",
  video: "Vídeo externo",
  link: "Enlace",
  download: "Archivo descargable",
};

/* -------------------------------------------------------------------------- */
/* Queries                                                                    */
/* -------------------------------------------------------------------------- */

export const adminCoursesQuery = () =>
  queryOptions({
    queryKey: ["admin", "courses"],
    queryFn: async (): Promise<AdminCourseRow[]> => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, categories(id, name, slug), instructors(id, name)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminCourseRow[];
    },
  });

export const adminCourseQuery = (courseId: string) =>
  queryOptions({
    queryKey: ["admin", "course", courseId],
    queryFn: async (): Promise<AdminCourseDetail | null> => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, modules(*, lessons(*, resources(*)))")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const detail = data as AdminCourseDetail;
      detail.modules = [...detail.modules]
        .sort((a, b) => a.position - b.position)
        .map((m) => ({
          ...m,
          lessons: [...(m.lessons ?? [])]
            .sort((a, b) => a.position - b.position)
            .map((l) => ({
              ...l,
              resources: [...(l.resources ?? [])].sort((a, b) => a.position - b.position),
            })),
        }));
      return detail;
    },
  });

export const adminCategoriesQuery = () =>
  queryOptions({
    queryKey: ["admin", "categories"],
    queryFn: async (): Promise<(Category & { courses: { count: number }[] })[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*, courses(count)")
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as (Category & { courses: { count: number }[] })[];
    },
  });

export const adminInstructorsQuery = () =>
  queryOptions({
    queryKey: ["admin", "instructors"],
    queryFn: async (): Promise<(Instructor & { courses: { count: number }[] })[]> => {
      const { data, error } = await supabase
        .from("instructors")
        .select("*, courses(count)")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as (Instructor & { courses: { count: number }[] })[];
    },
  });

export type AdminStats = {
  courses: number;
  published: number;
  drafts: number;
  archived: number;
  categories: number;
  instructors: number;
  modules: number;
  lessons: number;
};

export const adminStatsQuery = () =>
  queryOptions({
    queryKey: ["admin", "stats"],
    queryFn: async (): Promise<AdminStats> => {
      const count = async (
        table: "courses" | "categories" | "instructors" | "modules" | "lessons",
      ) => {
        const { count: value, error } = await supabase
          .from(table)
          .select("id", { count: "exact", head: true });
        if (error) throw error;
        return value ?? 0;
      };

      const countCourses = async (status: CourseStatus) => {
        const { count: value, error } = await supabase
          .from("courses")
          .select("id", { count: "exact", head: true })
          .eq("status", status);
        if (error) throw error;
        return value ?? 0;
      };

      const [courses, published, drafts, archived, categories, instructors, modules, lessons] =
        await Promise.all([
          count("courses"),
          countCourses("published"),
          countCourses("draft"),
          countCourses("archived"),
          count("categories"),
          count("instructors"),
          count("modules"),
          count("lessons"),
        ]);

      return {
        courses,
        published,
        drafts,
        archived,
        categories,
        instructors,
        modules,
        lessons,
      };
    },
  });

export type RecentChange = {
  id: string;
  type: "Curso" | "Módulo" | "Lección";
  title: string;
  courseId: string;
  updatedAt: string;
};

export const adminRecentChangesQuery = () =>
  queryOptions({
    queryKey: ["admin", "recent-changes"],
    queryFn: async (): Promise<RecentChange[]> => {
      const [courses, modules, lessons] = await Promise.all([
        supabase
          .from("courses")
          .select("id, title, updated_at")
          .order("updated_at", { ascending: false })
          .limit(8),
        supabase
          .from("modules")
          .select("id, title, course_id, updated_at")
          .order("updated_at", { ascending: false })
          .limit(8),
        supabase
          .from("lessons")
          .select("id, title, course_id, updated_at")
          .order("updated_at", { ascending: false })
          .limit(8),
      ]);
      if (courses.error) throw courses.error;
      if (modules.error) throw modules.error;
      if (lessons.error) throw lessons.error;

      const items: RecentChange[] = [
        ...(courses.data ?? []).map((c) => ({
          id: c.id,
          type: "Curso" as const,
          title: c.title,
          courseId: c.id,
          updatedAt: c.updated_at,
        })),
        ...(modules.data ?? []).map((m) => ({
          id: m.id,
          type: "Módulo" as const,
          title: m.title,
          courseId: m.course_id,
          updatedAt: m.updated_at,
        })),
        ...(lessons.data ?? []).map((l) => ({
          id: l.id,
          type: "Lección" as const,
          title: l.title,
          courseId: l.course_id,
          updatedAt: l.updated_at,
        })),
      ];

      return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 10);
    },
  });

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

async function run<T>(promise: PromiseLike<{ data: T; error: unknown }>): Promise<NonNullable<T>> {
  const { data, error } = await promise;
  if (error) throw error;
  return data as NonNullable<T>;
}

export const createCourse = (values: TablesInsert<"courses">) =>
  run(supabase.from("courses").insert(values).select("id").single());

export const updateCourse = (id: string, values: TablesUpdate<"courses">) =>
  run(supabase.from("courses").update(values).eq("id", id).select("id").single());

export const deleteCourse = (id: string) => run(supabase.from("courses").delete().eq("id", id));

/** Duplica un curso con sus módulos, lecciones y recursos en estado borrador. */
export async function duplicateCourse(courseId: string, takenSlugs: string[]) {
  const { data, error } = await supabase
    .from("courses")
    .select("*, modules(*, lessons(*, resources(*)))")
    .eq("id", courseId)
    .single();
  if (error) throw error;
  const source = data as AdminCourseDetail;

  const {
    id: _id,
    created_at: _createdAt,
    updated_at: _updatedAt,
    modules,
    ...rest
  } = source as AdminCourseDetail & { modules: AdminCourseDetail["modules"] };

  const copy = await run(
    supabase
      .from("courses")
      .insert({
        ...rest,
        title: `${source.title} (copia)`,
        slug: uniqueSlug(`${source.slug}-copia`, takenSlugs),
        status: "draft" as const,
        published_at: null,
        students_count: 0,
        rating: 0,
        ratings_count: 0,
      })
      .select("id")
      .single(),
  );

  for (const mod of modules ?? []) {
    const newModule = await run(
      supabase
        .from("modules")
        .insert({
          course_id: copy.id,
          title: mod.title,
          description: mod.description,
          position: mod.position,
          status: mod.status,
        })
        .select("id")
        .single(),
    );

    for (const lesson of mod.lessons ?? []) {
      const newLesson = await run(
        supabase
          .from("lessons")
          .insert({
            course_id: copy.id,
            module_id: newModule.id,
            title: lesson.title,
            slug: lesson.slug,
            summary: lesson.summary,
            content: lesson.content,
            content_text: lesson.content_text,
            duration_minutes: lesson.duration_minutes,
            status: lesson.status,
            type: lesson.type,
            is_free_preview: lesson.is_free_preview,
            position: lesson.position,
            video_url: lesson.video_url,
          })
          .select("id")
          .single(),
      );

      for (const resource of lesson.resources ?? []) {
        await run(
          supabase
            .from("resources")
            .insert({
              course_id: copy.id,
              lesson_id: newLesson.id,
              title: resource.title,
              description: resource.description,
              kind: resource.kind,
              url: resource.url,
              position: resource.position,
              size_bytes: resource.size_bytes,
            })
            .select("id")
            .single(),
        );
      }
    }
  }

  return copy;
}

export const createCategory = (values: TablesInsert<"categories">) =>
  run(supabase.from("categories").insert(values).select("id").single());

export const updateCategory = (id: string, values: TablesUpdate<"categories">) =>
  run(supabase.from("categories").update(values).eq("id", id).select("id").single());

export const deleteCategory = (id: string) =>
  run(supabase.from("categories").delete().eq("id", id));

export const createInstructor = (values: TablesInsert<"instructors">) =>
  run(supabase.from("instructors").insert(values).select("id").single());

export const updateInstructor = (id: string, values: TablesUpdate<"instructors">) =>
  run(supabase.from("instructors").update(values).eq("id", id).select("id").single());

export const deleteInstructor = (id: string) =>
  run(supabase.from("instructors").delete().eq("id", id));

export const createModule = (values: TablesInsert<"modules">) =>
  run(supabase.from("modules").insert(values).select("id").single());

export const updateModule = (id: string, values: TablesUpdate<"modules">) =>
  run(supabase.from("modules").update(values).eq("id", id).select("id").single());

export const deleteModule = (id: string) => run(supabase.from("modules").delete().eq("id", id));

export const createLesson = (values: TablesInsert<"lessons">) =>
  run(supabase.from("lessons").insert(values).select("id").single());

export const updateLesson = (id: string, values: TablesUpdate<"lessons">) =>
  run(supabase.from("lessons").update(values).eq("id", id).select("id").single());

export const deleteLesson = (id: string) => run(supabase.from("lessons").delete().eq("id", id));

export const createResource = (values: TablesInsert<"resources">) =>
  run(supabase.from("resources").insert(values).select("id").single());

export const updateResource = (id: string, values: TablesUpdate<"resources">) =>
  run(supabase.from("resources").update(values).eq("id", id).select("id").single());

export const deleteResource = (id: string) => run(supabase.from("resources").delete().eq("id", id));

/** Persiste el nuevo orden de una lista de módulos o lecciones. */
export async function persistOrder(table: "modules" | "lessons", ids: string[]) {
  await Promise.all(
    ids.map((id, index) =>
      supabase
        .from(table)
        .update({ position: index + 1 })
        .eq("id", id),
    ),
  );
}

/** Duración total de un módulo calculada a partir de sus lecciones. */
export function moduleDuration(lessons: { duration_minutes: number }[]) {
  return lessons.reduce((total, lesson) => total + (lesson.duration_minutes || 0), 0);
}
