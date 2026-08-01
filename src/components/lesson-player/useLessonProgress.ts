import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type LessonProgressStatus = "not_started" | "in_progress" | "completed";

interface UseLessonProgressParams {
  userId?: string | undefined;
  courseId?: string | undefined;
  courseSlug: string;
  serverProgress?:
    | Array<{
        lesson_id: string;
        completed?: boolean | null;
        status?: string | null;
      }>
    | undefined;
  isServerProgressLoading?: boolean | undefined;
  isServerProgressError?: boolean | undefined;
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
  isServerProgressLoading = false,
  isServerProgressError = false,
}: UseLessonProgressParams) {
  const storageKey = `academy_progress_${userId ?? "guest"}_${courseId ?? courseSlug}`;

  const [statuses, setStatuses] = useState<Record<string, LessonProgressStatus>>({});

  // Track last mutation sequence number and identity version to prevent stale async responses from overwriting recent user actions
  const identityVersionRef = useRef<number>(0);
  const lastSeqRef = useRef<number>(0);

  // Increment identity version and invalidate pending mutations on user or course identity change
  useEffect(() => {
    identityVersionRef.current += 1;
    lastSeqRef.current += 1;
  }, [userId, courseId]);

  // Reconcile server progress with local storage fallback
  useEffect(() => {
    // If authenticated user and server progress query is still loading, wait for completion
    if (userId && isServerProgressLoading) {
      return;
    }

    const nextMap: Record<string, LessonProgressStatus> = {};

    if (userId) {
      if (!isServerProgressError) {
        // Authenticated user with successful query: serverProgress is EXCLUSIVE source of truth
        serverProgress.forEach((p) => {
          if (p.completed) {
            nextMap[p.lesson_id] = "completed";
          } else if (p.status) {
            nextMap[p.lesson_id] = p.status as LessonProgressStatus;
          } else {
            nextMap[p.lesson_id] = "in_progress";
          }
        });
        // Lessons not present in serverProgress are treated as not_started automatically
      } else {
        // Fallback to localStorage ONLY if authenticated query failed
        try {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const parsed = JSON.parse(stored) as Record<string, LessonProgressStatus>;
            Object.assign(nextMap, parsed);
          }
        } catch {
          // Ignore read errors
        }
      }
    } else {
      // Unauthenticated guest user: use localStorage
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as Record<string, LessonProgressStatus>;
          Object.assign(nextMap, parsed);
        }
      } catch {
        // Ignore read errors
      }
    }

    // Clean replacement: never merge with previous state from another user/session
    setStatuses(nextMap);
  }, [userId, storageKey, serverProgress, isServerProgressLoading, isServerProgressError]);

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
      const triggerUserId = userId;
      const triggerCourseId = courseId;
      const triggerStorageKey = storageKey;
      const mutationIdentityVersion = identityVersionRef.current;
      const mutationSeq = ++lastSeqRef.current;

      const currentStatus = statuses[lessonId] || "not_started";
      const isCurrentlyCompleted = currentStatus === "completed";
      const nextStatus: LessonProgressStatus = isCurrentlyCompleted ? "in_progress" : "completed";
      const nextCompleted = !isCurrentlyCompleted;

      const previousStatuses = { ...statuses };
      const updatedStatuses = { ...statuses, [lessonId]: nextStatus };

      // Optimistic update
      setStatuses(updatedStatuses);
      try {
        localStorage.setItem(triggerStorageKey, JSON.stringify(updatedStatuses));
      } catch {
        // Ignore
      }

      // Persist to Supabase if logged in
      if (triggerUserId && triggerCourseId) {
        const { error } = await supabase.from("lesson_progress").upsert(
          {
            user_id: triggerUserId,
            lesson_id: lessonId,
            course_id: triggerCourseId,
            completed: nextCompleted,
            status: nextStatus,
            completed_at: nextCompleted ? new Date().toISOString() : null,
          },
          { onConflict: "user_id,lesson_id" },
        );

        // Check if identity or sequence changed while request was in flight
        if (
          mutationIdentityVersion !== identityVersionRef.current ||
          mutationSeq !== lastSeqRef.current
        ) {
          return true;
        }

        if (error) {
          // Revert optimistic update
          setStatuses(previousStatuses);
          try {
            localStorage.setItem(triggerStorageKey, JSON.stringify(previousStatuses));
          } catch {
            // Ignore
          }
          toast.error(
            "No se pudo guardar el progreso en el servidor. Se ha restaurado el estado anterior.",
          );
          return false;
        }
      }

      // Check if identity or sequence changed while request was in flight
      if (
        mutationIdentityVersion !== identityVersionRef.current ||
        mutationSeq !== lastSeqRef.current
      ) {
        return true;
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
