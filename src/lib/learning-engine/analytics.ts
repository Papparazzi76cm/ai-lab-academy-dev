import { supabase } from "@/integrations/supabase/client";
import { DashboardProgressStats, LearningEventType } from "./types";

/**
  Records a learning event in the `learning_events` table using RPC.
 */
export async function recordLearningEvent(params: {
  userId: string;
  eventType: LearningEventType | string;
  courseId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<string | null> {
  if (!params.userId) return null;

  try {
    const { data, error } = await (
      supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: unknown }>
    )("record_learning_event_rpc", {
      p_event_type: params.eventType,
      p_course_id: params.courseId ?? null,
      p_module_id: params.moduleId ?? null,
      p_lesson_id: params.lessonId ?? null,
      p_metadata: params.metadata ?? {},
    });

    if (error) {
      console.error("Error recording learning event:", error);
      return null;
    }

    return (data as string) ?? null;
  } catch (err) {
    console.error("Failed to record learning event:", err);
    return null;
  }
}

/**
  Calculates and returns user dashboard statistics for "Mi progreso".
 */
export async function fetchUserDashboardStats(userId: string): Promise<DashboardProgressStats> {
  const emptyResult: DashboardProgressStats = {
    activeCoursesCount: 0,
    completedCoursesCount: 0,
    totalHoursStudied: 0,
    completedLessonsCount: 0,
    timeThisWeekMinutes: 0,
    lastActivityAt: null,
    activeCourses: [],
    completedCourses: [],
  };

  if (!userId) return emptyResult;

  try {
    // 1. Fetch course progress records
    const { data: courseProgressRows, error: courseErr } = await supabase
      .from("course_progress")
      .select(
        `
        *,
        courses (
          id,
          title,
          slug,
          cover_url
        )
      `,
      )
      .eq("user_id", userId);

    if (courseErr) {
      console.error("Error fetching course progress for stats:", courseErr);
    }

    // 2. Fetch lesson progress rows to sum time & completed count
    const { data: lessonProgressRows, error: lessonErr } = await supabase
      .from("lesson_progress")
      .select("completed, seconds_spent, time_spent_seconds, updated_at")
      .eq("user_id", userId);

    if (lessonErr) {
      console.error("Error fetching lesson progress for stats:", lessonErr);
    }

    // 3. Fetch events from last 7 days for weekly calculation
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentEvents, error: eventErr } = await supabase
      .from("learning_events")
      .select("created_at, metadata")
      .eq("user_id", userId)
      .gte("created_at", sevenDaysAgo);

    if (eventErr) {
      console.error("Error fetching recent learning events:", eventErr);
    }

    // Process lesson stats
    let totalSecondsSpent = 0;
    let completedLessonsCount = 0;
    let lastActivityAt: string | null = null;

    if (lessonProgressRows) {
      for (const row of lessonProgressRows) {
        if (row.completed) completedLessonsCount++;
        const spent = row.seconds_spent || row.time_spent_seconds || 0;
        totalSecondsSpent += spent;
        if (row.updated_at && (!lastActivityAt || row.updated_at > lastActivityAt)) {
          lastActivityAt = row.updated_at;
        }
      }
    }

    // Process weekly time spent from events metadata or updated_at
    let timeThisWeekSeconds = 0;
    if (recentEvents) {
      for (const ev of recentEvents) {
        const meta = ev.metadata as { seconds_spent?: number } | null;
        if (meta?.seconds_spent) {
          timeThisWeekSeconds += meta.seconds_spent;
        }
      }
    }

    const activeCourses: DashboardProgressStats["activeCourses"] = [];
    const completedCourses: DashboardProgressStats["completedCourses"] = [];

    if (courseProgressRows) {
      for (const row of courseProgressRows) {
        const course = row.courses as {
          id: string;
          title: string;
          slug: string;
          cover_url: string | null;
        } | null;

        if (!course) continue;

        const percentage = Number(row.percentage) || 0;

        if (percentage >= 100) {
          completedCourses.push({
            courseId: course.id,
            title: course.title,
            slug: course.slug,
            coverUrl: course.cover_url,
            completedAt: row.completed_at || row.updated_at,
            totalLessons: row.total_lessons,
          });
        } else {
          activeCourses.push({
            courseId: course.id,
            title: course.title,
            slug: course.slug,
            coverUrl: course.cover_url,
            percentage,
            completedLessons: row.completed_lessons,
            totalLessons: row.total_lessons,
            lastLessonId: row.last_lesson_id,
            updatedAt: row.updated_at,
          });
        }
      }
    }

    return {
      activeCoursesCount: activeCourses.length,
      completedCoursesCount: completedCourses.length,
      totalHoursStudied: Number((totalSecondsSpent / 3600).toFixed(1)),
      completedLessonsCount,
      timeThisWeekMinutes: Math.round(timeThisWeekSeconds / 60),
      lastActivityAt,
      activeCourses,
      completedCourses,
    };
  } catch (err) {
    console.error("Failed to compute dashboard stats:", err);
    return emptyResult;
  }
}
