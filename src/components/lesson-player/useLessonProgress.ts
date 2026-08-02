import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LessonProgressStatus = "not_started" | "in_progress" | "completed";

export interface ToggleCompletionResult {
  success: boolean;
  data?:
    | {
        status?: string;
        completed?: boolean;
        module_percentage?: number;
        course_percentage?: number;
        is_course_completed?: boolean;
      }
    | null
    | undefined;
}

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
 * Handles optimistic updates, rollbacks on Supabase error, sequence locks, and query invalidation.
 */
export function useLessonProgress({
  userId,
  courseId,
  courseSlug,
  serverProgress = [],
  isServerProgressLoading = false,
  isServerProgressError = false,
}: UseLessonProgressParams) {
  const queryClient = useQueryClient();
  const storageKey = `academy_progress_${userId ?? "guest"}_${courseId ?? courseSlug}`;

  const [statuses, setStatuses] = useState<Record<string, LessonProgressStatus>>({});

  const identityVersionRef = useRef<number>(0);
  const lastSeqRef = useRef<number>(0);

  useEffect(() => {
    identityVersionRef.current += 1;
    lastSeqRef.current += 1;
  }, [userId, courseId]);

  useEffect(() => {
    if (userId && isServerProgressLoading) {
      return;
    }

    const nextMap: Record<string, LessonProgressStatus> = {};

    if (userId) {
      if (!isServerProgressError) {
        serverProgress.forEach((p) => {
          if (p.completed) {
            nextMap[p.lesson_id] = "completed";
          } else if (p.status) {
            nextMap[p.lesson_id] = p.status as LessonProgressStatus;
          } else {
            nextMap[p.lesson_id] = "in_progress";
          }
        });
      } else {
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

    setStatuses(nextMap);
  }, [userId, storageKey, serverProgress, isServerProgressLoading, isServerProgressError]);

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

  const toggleCompletion = useCallback(
    async (lessonId: string): Promise<ToggleCompletionResult> => {
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

      setStatuses(updatedStatuses);
      try {
        localStorage.setItem(triggerStorageKey, JSON.stringify(updatedStatuses));
      } catch {
        // Ignore
      }

      let rpcData: ToggleCompletionResult["data"] = null;

      if (triggerUserId && triggerCourseId) {
        const { data, error } = await supabase.rpc("update_lesson_progress_rpc", {
          p_lesson_id: lessonId,
          p_course_id: triggerCourseId,
          p_completed: nextCompleted,
          p_status: nextStatus,
        });

        if (
          mutationIdentityVersion !== identityVersionRef.current ||
          mutationSeq !== lastSeqRef.current
        ) {
          return { success: true, data: data as ToggleCompletionResult["data"] };
        }

        if (error) {
          setStatuses(previousStatuses);
          try {
            localStorage.setItem(triggerStorageKey, JSON.stringify(previousStatuses));
          } catch {
            // Ignore
          }
          toast.error(
            "No se pudo guardar el progreso en el servidor. Se ha restaurado el estado anterior.",
          );
          return { success: false, data: null };
        }

        rpcData = data as ToggleCompletionResult["data"];

        // Invalidate queries to trigger immediate UI sync
        queryClient.invalidateQueries({ queryKey: ["my-progress"] });
        queryClient.invalidateQueries({ queryKey: ["accessible-lesson-content"] });
        queryClient.invalidateQueries({ queryKey: ["progress"] });
      }

      if (
        mutationIdentityVersion !== identityVersionRef.current ||
        mutationSeq !== lastSeqRef.current
      ) {
        return { success: true, data: rpcData };
      }

      if (nextCompleted) {
        toast.success("¡Lección marcada como completada!");
      } else {
        toast.info("Lección marcada en progreso");
      }

      return { success: true, data: rpcData };
    },
    [statuses, storageKey, userId, courseId, queryClient],
  );

  return {
    statuses,
    markAsInProgress,
    toggleCompletion,
  };
}
