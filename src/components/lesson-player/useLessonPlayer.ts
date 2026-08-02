import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  accessibleLessonContentQuery,
  courseQuery,
  myEnrollmentForCourseQuery,
  myProgressQuery,
} from "@/lib/api";
import type { BlockType, LessonBlockItem } from "@/lib/blocks";
import { slugify } from "@/lib/admin-api";
import type { Tables } from "@/integrations/supabase/types";
import { canAccessLesson, normalizeProgressionMode } from "@/lib/learning-engine/unlock";

export interface FlatLessonItem {
  id: string;
  title: string;
  slug: string;
  position: number;
  duration_minutes: number | null;
  is_free_preview: boolean;
  status: string;
  course_id: string;
  module_id: string;
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
 * 4. Fetch protected lesson content & blocks strictly via secure RPC get_accessible_lesson_content_rpc.
 */
export function useLessonPlayer({ courseSlug, moduleSlug, lessonSlug }: UseLessonPlayerParams) {
  const { user } = useAuth();

  // 1. Fetch Course metadata
  const {
    data: course,
    isLoading: isCourseLoading,
    isError: isCourseError,
  } = useQuery(courseQuery(courseSlug));

  // 2. Fetch User Enrollment for Course
  const { data: enrollment } = useQuery(myEnrollmentForCourseQuery(user?.id, course?.id));

  const isEnrolled = Boolean(enrollment?.status === "active");

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

  // 6. Compute minimal curriculum and evaluate client pre-check
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

  const clientAccessCheck = useMemo(() => {
    if (!minimalCurriculum || !activeLesson) return { canAccess: true };
    return canAccessLesson(minimalCurriculum, activeLesson.id, progressEngineMap, isEnrolled);
  }, [minimalCurriculum, activeLesson, progressEngineMap, isEnrolled]);

  // 7. Secure RPC Query: Sole authority for video_url, lesson_blocks, resources, and server authorization
  const { data: contentResult, isLoading: isContentLoading } = useQuery({
    ...accessibleLessonContentQuery(activeLesson?.id),
    enabled: Boolean(activeLesson?.id),
  });

  // Access status strictly driven by server RPC result when available
  const access = useMemo(() => {
    if (contentResult) {
      if (!contentResult.can_access) {
        return {
          canAccess: false,
          reason: contentResult.reason || "Acceso denegado por el servidor.",
        };
      }
      return { canAccess: true };
    }
    return clientAccessCheck;
  }, [clientAccessCheck, contentResult]);

  // Extract blocks strictly from RPC result (NO fallback to activeLesson.content)
  const blocks: LessonBlockItem[] = useMemo(() => {
    if (!access.canAccess || !contentResult?.blocks) return [];
    return contentResult.blocks.map((b) => {
      const raw = b as unknown as Record<string, unknown>;
      return {
        id: typeof raw["id"] === "string" ? raw["id"] : "",
        lesson_id: typeof raw["lesson_id"] === "string" ? raw["lesson_id"] : "",
        position: typeof raw["position"] === "number" ? raw["position"] : 0,
        type: (raw["block_type"] || raw["type"] || "text") as BlockType,
        content_json: (raw["content"] || raw["content_json"] || {}) as Record<string, unknown>,
        settings_json: (raw["settings"] || raw["settings_json"] || {}) as Record<string, unknown>,
      };
    });
  }, [access, contentResult]);

  // Full lesson object with protected video_url & resources supplied by RPC
  const fullLesson = useMemo(() => {
    if (!activeLesson) return null;
    if (!access.canAccess || !contentResult?.lesson) {
      return activeLesson;
    }
    return {
      ...activeLesson,
      video_url: contentResult.lesson.video_url,
      description: contentResult.lesson.description,
      resources: contentResult.resources ?? [],
    };
  }, [activeLesson, access, contentResult]);

  // Flat lessons list for linear navigation UI
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

  const currentIndex = flatLessons.findIndex(
    (l) => l.id === activeLesson?.id && l.moduleSlug === moduleSlug,
  );

  const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < flatLessons.length - 1
      ? flatLessons[currentIndex + 1]
      : null;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [lessonSlug, activeLesson?.id]);

  return {
    user,
    course,
    activeModule,
    activeLesson: fullLesson,
    blocks,
    resources: contentResult?.resources ?? [],
    flatLessons,
    currentIndex,
    prevLesson,
    nextLesson,
    enrollment,
    isEnrolled,
    access,
    serverProgress,
    isServerProgressLoading,
    isServerProgressError,
    isCourseLoading,
    isBlocksLoading: isContentLoading,
    isCourseError,
    isNotFound,
  };
}
