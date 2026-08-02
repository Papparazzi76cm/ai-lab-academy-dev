import {
  AccessCheckResult,
  MinimalCourseCurriculum,
  MinimalLesson,
  MinimalModule,
  ProgressionMode,
} from "./types";

interface LessonProgressMap {
  [lessonId: string]: {
    completed: boolean;
    status?: string;
  };
}

/**
  Normalizes progression mode string values safely without dangerous type assertions.
  Defaults to "FREE" for null, undefined, or unrecognized values.
 */
export function normalizeProgressionMode(value: unknown): ProgressionMode {
  if (typeof value === "string") {
    const upper = value.toUpperCase().trim();
    if (upper === "FREE" || upper === "LINEAR" || upper === "FLEXIBLE") {
      return upper as ProgressionMode;
    }
  }
  return "FREE";
}

/**
  Checks whether a specific lesson in a course can be accessed by the user based on the course's progression mode and the user's current progress map.
 */
export function canAccessLesson(
  course: MinimalCourseCurriculum,
  targetLessonId: string,
  progressMap: LessonProgressMap = {},
  isEnrolled: boolean = true,
): AccessCheckResult {
  const mode: ProgressionMode = normalizeProgressionMode(course?.progressionMode);

  // Flatten all lessons in order
  const orderedModules = [...(course.modules || [])].sort((a, b) => a.position - b.position);

  let targetLesson: MinimalLesson | null = null;
  let targetModule: MinimalModule | null = null;
  const flatLessons: Array<{ lesson: MinimalLesson; module: MinimalModule }> = [];

  for (const module of orderedModules) {
    const sortedLessons = [...(module.lessons || [])].sort((a, b) => a.position - b.position);
    for (const lesson of sortedLessons) {
      flatLessons.push({ lesson, module });
      if (lesson.id === targetLessonId) {
        targetLesson = lesson;
        targetModule = module;
      }
    }
  }

  // If target lesson isn't in course curriculum
  if (!targetLesson || !targetModule) {
    return {
      canAccess: false,
      reason: "La lección no pertenece a este curso.",
    };
  }

  // If free preview and not enrolled, allow access
  if (!isEnrolled && targetLesson.isFreePreview) {
    return { canAccess: true };
  }

  if (!isEnrolled) {
    return {
      canAccess: false,
      reason: "Debes estar inscrito en el curso para acceder a esta lección.",
    };
  }

  // 1. FREE Mode: All lessons accessible once enrolled
  if (mode === "FREE") {
    return { canAccess: true };
  }

  // Find index of target lesson in flat order
  const targetIndex = flatLessons.findIndex((item) => item.lesson.id === targetLessonId);

  // First lesson is always accessible in any mode
  if (targetIndex <= 0) {
    return { canAccess: true };
  }

  // 2. LINEAR Mode: Target lesson is unlocked ONLY IF immediately preceding lesson is completed
  if (mode === "LINEAR") {
    const prevItem = flatLessons[targetIndex - 1];
    if (!prevItem) {
      return { canAccess: true };
    }
    const prevProgress = progressMap[prevItem.lesson.id];
    const isPrevCompleted = Boolean(prevProgress && prevProgress.completed);

    if (isPrevCompleted) {
      return { canAccess: true };
    }

    return {
      canAccess: false,
      reason: `Debes completar la lección anterior: "${prevItem.lesson.title}"`,
      requiredLessonId: prevItem.lesson.id,
      requiredLessonTitle: prevItem.lesson.title,
    };
  }

  // 3. FLEXIBLE Mode:
  // Lessons within the same module or prior completed modules are unlocked.
  // A lesson in Module N is locked if any module before Module N has uncompleted lessons.
  if (mode === "FLEXIBLE") {
    const targetModuleIndex = orderedModules.findIndex((m) => m.id === targetModule.id);

    if (targetModuleIndex <= 0) {
      // First module is fully flexible
      return { canAccess: true };
    }

    // Check all previous modules (0 to targetModuleIndex - 1)
    for (let i = 0; i < targetModuleIndex; i++) {
      const prevModule = orderedModules[i];
      if (!prevModule) continue;
      const uncompletedInPrev = (prevModule.lessons || []).some((l) => {
        const prog = progressMap[l.id];
        return !prog || !prog.completed;
      });

      if (uncompletedInPrev) {
        return {
          canAccess: false,
          reason: `Debes completar el módulo anterior primero: "${prevModule.title}"`,
          requiredModuleId: prevModule.id,
          requiredModuleTitle: prevModule.title,
        };
      }
    }

    return { canAccess: true };
  }

  return { canAccess: true };
}

/**
  Calculates the unlock status for all lessons in a course.
 */
export function getLessonAccessMap(
  course: MinimalCourseCurriculum,
  progressMap: LessonProgressMap = {},
  isEnrolled: boolean = true,
): Record<string, AccessCheckResult> {
  const result: Record<string, AccessCheckResult> = {};

  if (!course || !course.modules) {
    return result;
  }

  for (const module of course.modules) {
    for (const lesson of module.lessons || []) {
      result[lesson.id] = canAccessLesson(course, lesson.id, progressMap, isEnrolled);
    }
  }

  return result;
}
