import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LessonRenderer } from "@/components/lesson/LessonRenderer";
import { CourseSidebar } from "@/components/lesson-player/CourseSidebar";
import { LessonBreadcrumbs } from "@/components/lesson-player/LessonBreadcrumbs";
import { LessonCompletionButton } from "@/components/lesson-player/LessonCompletionButton";
import { LessonNavigation } from "@/components/lesson-player/LessonNavigation";
import { LessonNotFound } from "@/components/lesson-player/LessonNotFound";
import { LessonPlayerSkeleton } from "@/components/lesson-player/LessonPlayerSkeleton";
import { MobileCourseSidebar } from "@/components/lesson-player/MobileCourseSidebar";
import { CourseCompletionModal } from "@/components/lesson-player/CourseCompletionModal";
import { LessonLocked } from "@/components/lesson-player/LessonLocked";
import { useLessonPlayer } from "@/components/lesson-player/useLessonPlayer";
import { useLessonProgress } from "@/components/lesson-player/useLessonProgress";
import { useTimeTracking } from "@/lib/learning-engine/hooks";
import { slugify } from "@/lib/admin-api";

export const Route = createFileRoute(
  "/academy/course/$courseSlug/module/$moduleSlug/lesson/$lessonSlug",
)({
  head: () => ({
    meta: [
      { title: `Lección — AI Lab Academy` },
      { name: "description", content: "Reproductor interactivo de lecciones de la Academia." },
    ],
  }),
  component: LessonPlayerPage,
});

function LessonPlayerPage() {
  const { courseSlug, moduleSlug, lessonSlug } = Route.useParams();
  const [completionModalOpen, setCompletionModalOpen] = useState(false);

  // 1. Strict hierarchical resolution hook
  const {
    user,
    course,
    activeModule,
    activeLesson,
    blocks,
    flatLessons,
    currentIndex,
    prevLesson,
    nextLesson,
    isEnrolled,
    access,
    serverProgress,
    isServerProgressLoading,
    isServerProgressError,
    isCourseLoading,
    isBlocksLoading,
    isCourseError,
    isNotFound,
  } = useLessonPlayer({ courseSlug, moduleSlug, lessonSlug });

  // 2. Progress management hook with isolated localStorage and Supabase rollback
  const { statuses, markAsInProgress, toggleCompletion } = useLessonProgress({
    userId: user?.id,
    courseId: course?.id,
    courseSlug,
    serverProgress,
    isServerProgressLoading,
    isServerProgressError,
  });

  // 3. Active Time Tracking Hook from Learning Engine (only runs if user has access)
  useTimeTracking({
    userId: user?.id ?? null,
    courseId: course?.id ?? null,
    lessonId: access?.canAccess ? (activeLesson?.id ?? null) : null,
  });

  // Automatically mark current lesson as "in_progress" if not started and accessible
  useEffect(() => {
    if (activeLesson?.id && access?.canAccess) {
      markAsInProgress(activeLesson.id);
    }
  }, [activeLesson?.id, access?.canAccess, markAsInProgress]);

  // Compute progress counts
  const completedCount = useMemo(() => {
    return flatLessons.filter((l) => statuses[l.id] === "completed").length;
  }, [flatLessons, statuses]);

  const totalCount = flatLessons.length;
  const progressPercent = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleToggle = async () => {
    if (!activeLesson || !access?.canAccess) return;
    const res = await toggleCompletion(activeLesson.id);

    // Open completion modal strictly based on server RPC response indicating course completion
    if (res.success && res.data?.is_course_completed) {
      setCompletionModalOpen(true);
    }
  };

  // 4. Resolve required lesson & module slugs for unlock guidance
  const requiredLessonItem = useMemo(() => {
    if (!access?.requiredLessonId) return null;
    return flatLessons.find((l) => l.id === access.requiredLessonId) ?? null;
  }, [access?.requiredLessonId, flatLessons]);

  const requiredModuleItem = useMemo(() => {
    if (!access?.requiredModuleId || !course?.modules) return null;
    return course.modules.find((m) => m.id === access.requiredModuleId) ?? null;
  }, [access?.requiredModuleId, course?.modules]);

  const requiredLessonSlug = requiredLessonItem?.slug;
  const requiredModuleSlug =
    requiredLessonItem?.moduleSlug ||
    (requiredModuleItem ? slugify(requiredModuleItem.title) || requiredModuleItem.id : undefined);

  // 5. Loading skeleton state
  if (isCourseLoading || (activeLesson && access?.canAccess && isBlocksLoading)) {
    return <LessonPlayerSkeleton />;
  }

  // 6. Strict 404 state if course, module, or lesson within module is invalid
  if (isCourseError || isNotFound || !course || !activeModule || !activeLesson) {
    return <LessonNotFound courseSlug={courseSlug} />;
  }

  const isCurrentCompleted = statuses[activeLesson.id] === "completed";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      {/* Course Completion Celebration Modal */}
      <CourseCompletionModal
        isOpen={completionModalOpen}
        onClose={() => setCompletionModalOpen(false)}
        courseTitle={course.title}
        totalLessons={totalCount}
      />

      {/* Top Mobile Curriculum Drawer */}
      <MobileCourseSidebar
        course={course}
        activeLessonId={activeLesson.id}
        activeModuleSlug={moduleSlug}
        statuses={statuses}
        completedCount={completedCount}
        totalCount={totalCount}
        progressPercent={progressPercent}
        currentIndex={currentIndex}
        isEnrolled={isEnrolled}
      />

      {/* Main Responsive Layout */}
      <div className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          {/* Desktop Left Navigation Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-soft">
              <CourseSidebar
                course={course}
                activeLessonId={activeLesson.id}
                activeModuleSlug={moduleSlug}
                statuses={statuses}
                completedCount={completedCount}
                totalCount={totalCount}
                progressPercent={progressPercent}
                isEnrolled={isEnrolled}
              />
            </div>
          </aside>

          {/* Right Main Lesson Content Area */}
          <main className="min-w-0 flex-1 space-y-6">
            {/* Hierarchical Breadcrumbs */}
            <LessonBreadcrumbs
              courseTitle={course.title}
              courseSlug={course.slug}
              moduleTitle={activeModule.title}
              lessonTitle={activeLesson.title}
            />

            {/* Read-Only Published Lesson Renderer or Lesson Locked Screen */}
            {!access.canAccess ? (
              <LessonLocked
                reason={access.reason}
                courseSlug={course.slug}
                requiredLessonSlug={requiredLessonSlug}
                requiredModuleSlug={requiredModuleSlug}
                requiredLessonTitle={access.requiredLessonTitle || requiredLessonItem?.title}
                requiredModuleTitle={access.requiredModuleTitle || requiredModuleItem?.title}
                isNotEnrolled={!isEnrolled && !activeLesson.is_free_preview}
              />
            ) : (
              <LessonRenderer lesson={activeLesson} blocks={blocks} />
            )}

            {/* Bottom Controls: Navigation + Toggle Completion */}
            {access.canAccess && (
              <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
                <LessonNavigation
                  courseSlug={course.slug}
                  prevLesson={prevLesson ?? null}
                  nextLesson={nextLesson ?? null}
                />

                <LessonCompletionButton isCompleted={isCurrentCompleted} onToggle={handleToggle} />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
