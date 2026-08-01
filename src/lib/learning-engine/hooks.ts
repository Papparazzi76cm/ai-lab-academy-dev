import { useCallback, useEffect, useRef, useState } from "react";
import { recordLearningEvent } from "./analytics";
import { completeLesson, toggleLessonCompletion } from "./completion";
import { fetchCourseUserProgress, syncLessonProgressRpc } from "./progress";
import { ActiveTimeTracker } from "./timeTracking";
import {
  AccessCheckResult,
  CertificateDraft,
  CourseProgressRecord,
  LessonProgressRecord,
  MinimalCourseCurriculum,
  ModuleProgressRecord,
} from "./types";
import { canAccessLesson, getLessonAccessMap } from "./unlock";

/**
  Hook to manage lesson, module, and course learning progress for a given user & course.
 */
export function useLearningProgress(
  userId: string | undefined | null,
  courseId: string | undefined | null,
) {
  const [lessonProgressMap, setLessonProgressMap] = useState<Record<string, LessonProgressRecord>>(
    {},
  );
  const [moduleProgressMap, setModuleProgressMap] = useState<Record<string, ModuleProgressRecord>>(
    {},
  );
  const [courseProgress, setCourseProgress] = useState<CourseProgressRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const identityVersionRef = useRef(0);
  const lastSeqRef = useRef(0);

  // Identity change handling
  useEffect(() => {
    identityVersionRef.current += 1;
    lastSeqRef.current += 1;
    setLessonProgressMap({});
    setModuleProgressMap({});
    setCourseProgress(null);
  }, [userId, courseId]);

  const loadProgress = useCallback(async () => {
    if (!userId || !courseId) {
      setIsLoading(false);
      return;
    }

    const currentVersion = identityVersionRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchCourseUserProgress(userId, courseId);
      if (identityVersionRef.current === currentVersion) {
        setLessonProgressMap(data.lessonProgressMap);
        setModuleProgressMap(data.moduleProgressMap);
        setCourseProgress(data.courseProgress);
      }
    } catch (err) {
      if (identityVersionRef.current === currentVersion) {
        setError(err instanceof Error ? err : new Error("Failed to load progress"));
      }
    } finally {
      if (identityVersionRef.current === currentVersion) {
        setIsLoading(false);
      }
    }
  }, [userId, courseId]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const toggleLesson = useCallback(
    async (params: {
      lessonId: string;
      courseTitle?: string;
      studentName?: string;
    }): Promise<{ success: boolean; certificateDraft?: CertificateDraft | null }> => {
      if (!userId || !courseId) return { success: false };

      const mutationIdentityVersion = identityVersionRef.current;
      const mutationSeq = ++lastSeqRef.current;

      const currentRecord = lessonProgressMap[params.lessonId];
      const currentlyCompleted = Boolean(currentRecord?.completed);

      // Optimistic update
      setLessonProgressMap((prev) => ({
        ...prev,
        [params.lessonId]: {
          ...(prev[params.lessonId] || {
            userId,
            courseId,
            lessonId: params.lessonId,
            lastPosition: 0,
            secondsSpent: 0,
          }),
          completed: !currentlyCompleted,
          status: !currentlyCompleted ? "completed" : "in_progress",
        },
      }));

      try {
        const result = await toggleLessonCompletion({
          userId,
          courseId,
          lessonId: params.lessonId,
          currentlyCompleted,
          courseTitle: params.courseTitle,
          studentName: params.studentName,
        });

        // Concurrency guard check
        if (
          identityVersionRef.current !== mutationIdentityVersion ||
          lastSeqRef.current !== mutationSeq
        ) {
          return { success: false };
        }

        // Refresh state
        await loadProgress();

        return {
          success: true,
          certificateDraft: result.certificateDraft,
        };
      } catch (err) {
        // Rollback on failure
        if (
          identityVersionRef.current === mutationIdentityVersion &&
          lastSeqRef.current === mutationSeq
        ) {
          setLessonProgressMap((prev) => ({
            ...prev,
            [params.lessonId]: {
              ...(prev[params.lessonId] || {
                userId,
                courseId,
                lessonId: params.lessonId,
                lastPosition: 0,
                secondsSpent: 0,
              }),
              completed: currentlyCompleted,
              status: currentlyCompleted ? "completed" : "in_progress",
            },
          }));
        }
        return { success: false };
      }
    },
    [userId, courseId, lessonProgressMap, loadProgress],
  );

  return {
    lessonProgressMap,
    moduleProgressMap,
    courseProgress,
    isLoading,
    error,
    toggleLesson,
    refreshProgress: loadProgress,
  };
}

/**
  Hook to check lesson access rights and unlock maps for a course.
 */
export function useLessonAccess(
  course: MinimalCourseCurriculum | null | undefined,
  lessonId?: string | null,
  isEnrolled: boolean = true,
) {
  const accessResult: AccessCheckResult =
    course && lessonId ? canAccessLesson(course, lessonId, {}, isEnrolled) : { canAccess: true };

  const accessMap = course ? getLessonAccessMap(course, {}, isEnrolled) : {};

  return {
    canAccess: accessResult.canAccess,
    reason: accessResult.reason,
    requiredLessonTitle: accessResult.requiredLessonTitle,
    requiredModuleTitle: accessResult.requiredModuleTitle,
    accessMap,
  };
}

/**
  Hook for active lesson time tracking and visibility handling.
 */
export function useTimeTracking(params: {
  userId?: string | null;
  courseId?: string | null;
  lessonId?: string | null;
}) {
  const { userId, courseId, lessonId } = params;

  useEffect(() => {
    if (!userId || !courseId || !lessonId) return;

    const tracker = new ActiveTimeTracker(async (secondsSpent) => {
      try {
        await syncLessonProgressRpc({
          lessonId,
          courseId,
          secondsSpent,
        });
        await recordLearningEvent({
          userId,
          courseId,
          lessonId,
          eventType: "time_tracked",
          metadata: { seconds_spent: secondsSpent },
        });
      } catch (err) {
        console.error("Time tracking save failed:", err);
      }
    }, 30000);

    tracker.start();

    return () => {
      tracker.stop();
    };
  }, [userId, courseId, lessonId]);
}
