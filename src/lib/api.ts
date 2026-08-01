import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Course = Tables<"courses">;
export type Module = Tables<"modules">;
export type Lesson = Tables<"lessons">;
export type Category = Tables<"categories">;

export const coursesQuery = (filters?: { category?: string | null; search?: string }) =>
  queryOptions({
    queryKey: ["courses", filters ?? {}],
    queryFn: async () => {
      let query = supabase
        .from("courses")
        .select("*, categories(name, slug), instructors(name, avatar_url)")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (filters?.category) query = query.eq("categories.slug", filters.category);
      if (filters?.search) query = query.ilike("title", `%${filters.search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

export const categoriesQuery = () =>
  queryOptions({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const courseQuery = (slug: string) =>
  queryOptions({
    queryKey: ["course", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(
          "*, categories(name, slug), instructors(name, title, bio, avatar_url), modules(*, lessons(*)), faqs(*)",
        )
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const lessonQuery = (courseSlug: string, lessonSlug: string) =>
  queryOptions({
    queryKey: ["lesson", courseSlug, lessonSlug],
    queryFn: async () => {
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("id, title, slug")
        .eq("slug", courseSlug)
        .maybeSingle();
      if (courseError) throw courseError;
      if (!course) return null;

      const { data: lesson, error } = await supabase
        .from("lessons")
        .select("*, resources(*)")
        .eq("course_id", course.id)
        .eq("slug", lessonSlug)
        .maybeSingle();
      if (error) throw error;
      return lesson ? { course, lesson } : null;
    },
  });

export const myProgressQuery = (userId: string | undefined, courseId: string | undefined) =>
  queryOptions({
    queryKey: ["progress", userId, courseId],
    enabled: Boolean(userId && courseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("*")
        .eq("user_id", userId!)
        .eq("course_id", courseId!);
      if (error) throw error;
      return data ?? [];
    },
  });

export const myEnrollmentsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["enrollments", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(*)")
        .eq("user_id", userId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const myActivityQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["activity", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_history")
        .select("*, courses(title, slug), lessons(title, slug)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

export const profileQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export function formatDuration(minutes: number) {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h ${m ? `${m} min` : ""}`.trim() : `${m} min`;
}

export function formatPrice(cents: number, currency = "EUR") {
  if (!cents) return "Gratis";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(cents / 100);
}

export const levelLabel: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};
