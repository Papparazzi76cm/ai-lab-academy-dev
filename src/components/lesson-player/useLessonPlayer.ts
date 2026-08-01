import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  courseQuery,
  lessonBlocksQuery,
  myEnrollmentForCourseQuery,
  myProgressQuery,
} from "@/lib/api";
import { parseBlocks, type BlockType, type LessonBlockItem } from "@/lib/blocks";
import { slugify } from "@/lib/admin-api";
import type { Tables } from "@/integrations/supabase/types";
import { canAccessLesson, normalizeProgressionMode } from "@/lib/learning-engine/unlock";

export interface FlatLessonItem extends Tables<"lessons"> {
  moduleTitle: string;
  moduleSlug: string;
  moduleId: string;
}

interface UseLessonPlayerParams {
  courseSlug: string;
  moduleSlug: string;
  lessonSlug: string;
  isBlocksEnabled?: boolean;
}

/**
 * Hook that enforces strict hierarchical route resolution for the Lesson Player:
 * 1. Resolve course by courseSlug.
 * 2. Resolve module within that course by moduleSlug.
 * 3. Resolve lesson EXCLUSIVELY within that module by lessonSlug.
 * Returns 404 (isNotFound = true) if any hierarchy link fails.
 */
export function useLessonPlayer({
  courseSlug,
  moduleSlug,
  lessonSlug,
  isBlocksEnabled = true,
}: UseLessonPlayerParams) {
  const { user } = useAuth();

  // 1. Fetch Course
  const {
    data: course,
    isLoading: isCourseLoading,
    isError: isCourseError,
  } = useQuery(courseQuery(courseSlug));

  // 2. Fetch User Enrollment for Course
  const { data: enrollment } = useQuery(myEnrollmentForCourseQuery(user?.id, course?.id));

  const isAdmin =
    user?.role === "admin" ||
    (user?.app_metadata as Record<string, unknown> | undefined)?.role === "admin";
  const isOwnerInstructor = Boolean(course?.instructor_id && user?.id === course.instructor_id);
  const isEnrolled = Boolean(enrollment?.status === "active" || isAdmin || isOwnerInstructor);

  // 3. Strict Hierarchical Resolution: Module within Course
  const activeModule = useMemo(() => {
    if (!course?.modules) return null;
    return (
      course.modules.find((m) => slugify(m.title) === moduleSlug || m.id === moduleSlug) ?? null
    );
  }, [course, moduleSlug]);

  // 4. Strict Hierarchical Resolution: Lesson EXCLUSIVELY within activeModule
  const activeLesson = useMemo(() => {
    if (!activeModule?.lessons) return null;
    return (
      activeModule.lessons.find(
        (l) => l.slug === lessonSlug || l.id === lessonSlug || slugify(l.title) === lessonSlug,
      ) ?? null
    );
  }, [activeModule, lessonSlug]);

  // Determine if route resolution failed (404)
  const isNotFound = useMemo(() => {
    if (isCourseLoading) return false;
    if (!course || !activeModule || !activeLesson) return true;
    return false;
  }, [isCourseLoading, course, activeModule, activeLesson]);

  // 5. Fetch User Server Progress
  const {
    data: serverProgress = [],
    isLoading: isServerProgressLoading,
    isError: isServerProgressError,
  } = useQuery(myProgressQuery(user?.id, course?.id));

  // 6. Compute minimal curriculum and evaluate server/client access control
  const minimalCurriculum = useMemo(() => {
    if (!course) return null;
    const sortedModules = [...(course.modules ?? [])].sort((a, b) => a.position - b.position);
    return {
      id: course.id,
      title: course.title,
      progressionMode: normalizeProgressionMode(course.progression_mode),
      modules: sortedModules.map((m) => ({
        id: m.id,
        title: m.title,
        slug: slugify(m.title) || m.id,
        position: m.position,
        lessons: [...(m.lessons ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((l) => ({
            id: l.id,
            title: l.title,
            slug: l.slug,
            position: l.position,
            moduleId: m.id,
            isFreePreview: l.is_free_preview,
          })),
      })),
    };
  }, [course]);

  const progressEngineMap = useMemo(() => {
    const map: Record<string, { completed: boolean; status?: string }> = {};
    for (const item of serverProgress) {
      map[item.lesson_id] = { completed: item.completed, status: item.status };
    }
    return map;
  }, [serverProgress]);

  const access = useMemo(() => {
    if (!minimalCurriculum || !activeLesson) return { canAccess: true };
    return canAccessLesson(minimalCurriculum, activeLesson.id, progressEngineMap, isEnrolled);
  }, [minimalCurriculum, activeLesson, progressEngineMap, isEnrolled]);

  // 7. Fetch Blocks for active lesson ONLY IF lesson exists and user has access
  const blocksQueryOptions = lessonBlocksQuery(activeLesson?.id);
  const { data: rawBlocks = [], isLoading: isBlocksLoading } = useQuery({
    ...blocksQueryOptions,
    enabled: Boolean(activeLesson?.id) && access.canAccess && isBlocksEnabled,
  });

  // Parse blocks or fallback to lesson content JSON if published blocks table is empty
  const blocks: LessonBlockItem[] = useMemo(() => {
    if (rawBlocks && rawBlocks.length > 0) {
      return rawBlocks.map((b) => ({
        id: b.id,
        lesson_id: b.lesson_id,
        position: b.position,
        type: b.type as BlockType,
        content_json: (b.content_json as Record<string, unknown>) ?? {},
        settings_json: (b.settings_json as Record<string, unknown>) ?? {},
      }));
    }
    if (activeLesson?.content) {
      return parseBlocks(activeLesson.content);
    }
    return [];
  }, [rawBlocks, activeLesson]);

  // 6. Ordered flat lesson list across all course modules for linear navigation
  const flatLessons: FlatLessonItem[] = useMemo(() => {
    if (!course?.modules) return [];
    const sortedModules = [...course.modules].sort((a, b) => a.position - b.position);

    return sortedModules.flatMap((mod) => {
      const modSlug = slugify(mod.title) || mod.id;
      const sortedLessons = [...(mod.lessons ?? [])].sort((a, b) => a.position - b.position);

      return sortedLessons.map((l) => ({
        ...l,
        moduleTitle: mod.title,
        moduleSlug: modSlug,
        moduleId: mod.id,
      }));
    });
  }, [course]);

  // Navigation pointers strictly based on flatLessons ordering
  const currentIndex = flatLessons.findIndex(
    (l) => l.id === activeLesson?.id && l.moduleSlug === moduleSlug,
  );

  const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < flatLessons.length - 1
      ? flatLessons[currentIndex + 1]
      : null;

  // Auto-scroll to top when lesson changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [lessonSlug, activeLesson?.id]);

  return {
    user,
    course,
    activeModule,
    activeLesson,
    blocks,
    flatLessons,
    currentIndex,
    prevLesson,
    nextLesson,
    enrollment,
    isEnrolled,
    isAdmin,
    isOwnerInstructor,
    access,
    serverProgress,
    isServerProgressLoading,
    isServerProgressError,
    isCourseLoading,
    isBlocksLoading,
    isCourseError,
    isNotFound,
  };
}
