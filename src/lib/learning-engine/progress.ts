import { supabase } from "@/integrations/supabase/client";
import {
  CourseProgressRecord,
  LessonProgressRecord,
  LessonStatus,
  ModuleProgressRecord,
} from "./types";

/**
  Calculates percentage completed given completed items and total items.
 */
export function calculateProgress(completedCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  const raw = (completedCount / totalCount) * 100;
  return Number(Math.min(100, Math.max(0, raw)).toFixed(2));
}

/**
  Determines status based on completion state and time spent.
 */
export function getLessonStatus(completed: boolean, secondsSpent: number): LessonStatus {
  if (completed) return "completed";
  if (secondsSpent > 0) return "in_progress";
  return "not_started";
}

/**
  Fetches all progress records for a user in a given course.
 */
export async function fetchCourseUserProgress(
  userId: string,
  courseId: string,
): Promise<{
  lessonProgressMap: Record<string, LessonProgressRecord>;
  moduleProgressMap: Record<string, ModuleProgressRecord>;
  courseProgress: CourseProgressRecord | null;
}> {
  if (!userId || !courseId) {
    return {
      lessonProgressMap: {},
      moduleProgressMap: {},
      courseProgress: null,
    };
  }

  const [lessonRes, moduleRes, courseRes] = await Promise.all([
    supabase.from("lesson_progress").select("*").eq("user_id", userId).eq("course_id", courseId),
    supabase.from("module_progress").select("*").eq("user_id", userId).eq("course_id", courseId),
    supabase
      .from("course_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle(),
  ]);

  if (lessonRes.error) {
    console.error("Error fetching lesson progress:", lessonRes.error);
  }

  const lessonProgressMap: Record<string, LessonProgressRecord> = {};
  if (lessonRes.data) {
    for (const row of lessonRes.data) {
      lessonProgressMap[row.lesson_id] = {
        id: row.id,
        userId: row.user_id,
        courseId: row.course_id,
        lessonId: row.lesson_id,
        status: row.status as LessonStatus,
        completed: Boolean(row.completed),
        startedAt: row.started_at,
        completedAt: row.completed_at,
        lastPosition: row.last_position || row.last_position_seconds || 0,
        secondsSpent: row.seconds_spent || row.time_spent_seconds || 0,
        updatedAt: row.updated_at,
      };
    }
  }

  const moduleProgressMap: Record<string, ModuleProgressRecord> = {};
  if (moduleRes.data) {
    for (const row of moduleRes.data) {
      moduleProgressMap[row.module_id] = {
        id: row.id,
        userId: row.user_id,
        moduleId: row.module_id,
        courseId: row.course_id,
        completedLessons: row.completed_lessons,
        totalLessons: row.total_lessons,
        percentage: Number(row.percentage),
        completedAt: row.completed_at,
        updatedAt: row.updated_at,
      };
    }
  }

  let courseProgressRecord: CourseProgressRecord | null = null;
  if (courseRes.data) {
    const row = courseRes.data;
    courseProgressRecord = {
      id: row.id,
      userId: row.user_id,
      courseId: row.course_id,
      completedModules: row.completed_modules,
      totalModules: row.total_modules,
      completedLessons: row.completed_lessons,
      totalLessons: row.total_lessons,
      percentage: Number(row.percentage),
      completedAt: row.completed_at,
      lastLessonId: row.last_lesson_id,
      updatedAt: row.updated_at,
    };
  }

  return {
    lessonProgressMap,
    moduleProgressMap,
    courseProgress: courseProgressRecord,
  };
}

/**
  Saves or updates lesson progress using the backend RPC for atomic accuracy.
 */
export async function syncLessonProgressRpc(params: {
  lessonId: string;
  courseId: string;
  completed?: boolean;
  status?: LessonStatus;
  secondsSpent?: number;
  lastPosition?: number;
}): Promise<{
  status: LessonStatus;
  completed: boolean;
  modulePercentage: number;
  coursePercentage: number;
  isCourseCompleted: boolean;
}> {
  const { data, error } = await (
    supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>
  )("update_lesson_progress_rpc", {
    p_lesson_id: params.lessonId,
    p_course_id: params.courseId,
    p_completed: params.completed ?? false,
    p_status: params.status ?? "in_progress",
    p_seconds_spent: params.secondsSpent ?? 0,
    p_last_position: params.lastPosition ?? 0,
  });

  if (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "Unknown error";
    throw new Error(`Failed to sync lesson progress: ${message}`);
  }

  const parsed = typeof data === "string" ? JSON.parse(data) : data;

  return {
    status: (parsed?.status as LessonStatus) || (params.completed ? "completed" : "in_progress"),
    completed: Boolean(parsed?.completed),
    modulePercentage: parsed?.module_percentage || 0,
    coursePercentage: parsed?.course_percentage || 0,
    isCourseCompleted: Boolean(parsed?.is_course_completed),
  };
}
