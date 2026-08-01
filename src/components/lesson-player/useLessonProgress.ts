import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type LessonProgressStatus = "not_started" | "in_progress" | "completed";

interface UseLessonProgressParams {
  userId?: string;
  courseId?: string;
  courseSlug: string;
  serverProgress?: Array<{
    lesson_id: string;
    completed?: boolean | null;
    status?: string | null;
  }>;
}

/**
 * Custom hook to manage student lesson completion progress.
 * Adheres strictly to isolated localStorage keys: academy_progress_${userId ?? "guest"}_${courseId}
 * Handles optimistic updates, rollbacks on Supabase error, and sequence locks to avoid stale async overrides.
 */
export function useLessonProgress({
  userId,
  courseId,
  courseSlug,
  serverProgress = [],
}: UseLessonProgressParams) {
  const storageKey = `academy_progress_${userId ?? "guest"}_${courseId ?? courseSlug}`;

  const [statuses, setStatuses] = useState<Record<string, LessonProgressStatus>>({});

  // Track last mutation sequence number to prevent stale async responses from overwriting recent user actions
  const lastSeqRef = useRef<number>(0);

  // Reconcile server progress with local storage fallback
  useEffect(() => {
    const nextMap: Record<string, LessonProgressStatus> = {};

    // Server progress is single source of truth for authenticated users
    serverProgress.forEach((p) => {
      if (p.completed) {
        nextMap[p.lesson_id] = "completed";
      } else if (p.status) {
        nextMap[p.lesson_id] = p.status as LessonProgressStatus;
      } else {
        nextMap[p.lesson_id] = "in_progress";
      }
    });

    // Local storage acts as fallback for unauthenticated guest or offline state
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, LessonProgressStatus>;
        // If unauthenticated or server returned no progress for a key, merge local fallback
        Object.entries(parsed).forEach(([lessonId, status]) => {
          if (!nextMap[lessonId]) {
            nextMap[lessonId] = status;
          }
        });
      }
    } catch {
      // Ignore local storage read errors
    }

    setStatuses((prev) => ({ ...nextMap, ...prev }));
  }, [serverProgress, storageKey]);

  // Mark lesson as in_progress if not started yet
  const markAsInProgress = useCallback(
    (lessonId: string) => {
      setStatuses((prev) => {
        if (prev[lessonId] && prev[lessonId] !== "not_started") {
          return prev;
        }
        const updated = { ...prev, [lessonId]: "in_progress" as const };
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {
          // Ignore storage error
        }
        return updated;
      });
    },
    [storageKey],
  );

  // Toggle completion with optimistic update and rollback on failure
  const toggleCompletion = useCallback(
    async (lessonId: string): Promise<boolean> => {
      const currentStatus = statuses[lessonId] || "not_started";
      const isCurrentlyCompleted = currentStatus === "completed";
      const nextStatus: LessonProgressStatus = isCurrentlyCompleted ? "in_progress" : "completed";
      const nextCompleted = !isCurrentlyCompleted;

      const previousStatuses = { ...statuses };
      const updatedStatuses = { ...statuses, [lessonId]: nextStatus };

      // Sequence check
      const currentSeq = ++lastSeqRef.current;

      // Optimistic update
      setStatuses(updatedStatuses);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updatedStatuses));
      } catch {
        // Ignore
      }

      // Persist to Supabase if logged in
      if (userId && courseId) {
        const { error } = await supabase.from("lesson_progress").upsert(
          {
            user_id: userId,
            lesson_id: lessonId,
            course_id: courseId,
            completed: nextCompleted,
            status: nextStatus,
            completed_at: nextCompleted ? new Date().toISOString() : null,
          },
          { onConflict: "user_id,lesson_id" },
        );

        // If a newer request was made while this one was in flight, ignore rollback
        if (currentSeq !== lastSeqRef.current) {
          return true;
        }

        if (error) {
          // Revert optimistic update
          setStatuses(previousStatuses);
          try {
            localStorage.setItem(storageKey, JSON.stringify(previousStatuses));
          } catch {
            // Ignore
          }
          toast.error(
            "No se pudo guardar el progreso en el servidor. Se ha restaurado el estado anterior.",
          );
          return false;
        }
      }

      if (nextCompleted) {
        toast.success("¡Lección marcada como completada!");
      } else {
        toast.info("Lección marcada en progreso");
      }

      return true;
    },
    [statuses, storageKey, userId, courseId],
  );

  return {
    statuses,
    markAsInProgress,
    toggleCompletion,
  };
}
