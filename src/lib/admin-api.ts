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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return [];

      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roles = (rolesData ?? []).map((r) => r.role);
      const isAdmin = roles.includes("admin");

      let query = supabase
        .from("courses")
        .select("*, categories(id, name, slug), instructors(id, name)")
        .order("updated_at", { ascending: false });

      if (!isAdmin) {
        const { data: instructor } = await supabase
          .from("instructors")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!instructor) return [];
        query = query.eq("instructor_id", instructor.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as AdminCourseRow[];
    },
  });

export const adminCourseQuery = (courseId: string) =>
  queryOptions({
    queryKey: ["admin", "course", courseId],
    queryFn: async (): Promise<AdminCourseDetail | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roles = (rolesData ?? []).map((r) => r.role);
      const isAdmin = roles.includes("admin");

      let query = supabase
        .from("courses")
        .select("*, modules(*, lessons(*, resources(*)))")
        .eq("id", courseId);

      if (!isAdmin) {
        const { data: instructor } = await supabase
          .from("instructors")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!instructor) return null;
        query = query.eq("instructor_id", instructor.id);
      }

      const { data, error } = await query.maybeSingle();
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
      const { data, error } = await supabase.rpc("get_cms_stats");
      if (error) throw error;
      return data as AdminStats;
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
      const { data, error } = await supabase.rpc("get_cms_recent_changes");
      if (error) throw error;
      return (
        (data as unknown as Array<{
          id: string;
          type: "Curso" | "Módulo" | "Lección";
          title: string;
          course_id: string;
          updated_at: string;
        }>) ?? []
      ).map(
        (item: {
          id: string;
          type: "Curso" | "Módulo" | "Lección";
          title: string;
          course_id: string;
          updated_at: string;
        }) => ({
          id: item.id,
          type: item.type,
          title: item.title,
          courseId: item.course_id,
          updatedAt: item.updated_at,
        }),
      );
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

/** Duplica un curso con sus módulos, lecciones y recursos en estado borrador usando una función RPC atómica. */
export async function duplicateCourse(courseId: string, _takenSlugs?: string[]) {
  const { data, error } = await supabase.rpc("duplicate_course_rpc", {
    p_course_id: courseId,
  });
  if (error) throw error;
  return { id: data as string };
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

/** Persiste el nuevo orden de una lista de módulos o lecciones de forma atómica. */
export async function persistOrder(table: "modules" | "lessons", ids: string[]) {
  const items = ids.map((id, index) => ({ id, position: index + 1 }));
  const { error } = await supabase.rpc("reorder_items_rpc", {
    p_table_name: table,
    p_items: items,
  });
  if (error) throw error;
}

/** Duración total de un módulo calculada a partir de sus lecciones. */
export function moduleDuration(lessons: { duration_minutes: number }[]) {
  return lessons.reduce((total, lesson) => total + (lesson.duration_minutes || 0), 0);
}
