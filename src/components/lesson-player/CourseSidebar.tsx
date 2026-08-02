import { Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Circle, Clock, Lock, PlayCircle } from "lucide-react";
import { formatDuration } from "@/lib/api";
import { slugify } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { CourseProgress } from "./CourseProgress";
import type { LessonProgressStatus } from "./useLessonProgress";
import type { Tables } from "@/integrations/supabase/types";
import { canAccessLesson } from "@/lib/learning-engine/unlock";
import { toast } from "sonner";

export type SafeLessonMetadata = Pick<
  Tables<"lessons">,
  | "id"
  | "title"
  | "slug"
  | "position"
  | "duration_minutes"
  | "is_free_preview"
  | "status"
  | "course_id"
  | "module_id"
> &
  Partial<Tables<"lessons">>;

export type CourseModuleWithLessons = Tables<"modules"> & {
  lessons?: SafeLessonMetadata[] | null;
};

export type CourseWithModules = Tables<"courses"> & {
  modules?: CourseModuleWithLessons[] | null;
  progression_mode?: "FREE" | "LINEAR" | "FLEXIBLE" | string;
};

interface CourseSidebarProps {
  course: CourseWithModules;
  activeLessonId?: string | undefined;
  activeModuleSlug?: string | undefined;
  statuses: Record<string, LessonProgressStatus>;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  isEnrolled?: boolean;
  onSelectLesson?: (() => void) | undefined;
}

export function CourseSidebar({
  course,
  activeLessonId,
  statuses,
  completedCount,
  totalCount,
  progressPercent,
  isEnrolled = false,
  onSelectLesson,
}: CourseSidebarProps) {
  const sortedModules = [...(course.modules ?? [])].sort((a, b) => a.position - b.position);

  // Convert course to minimal curriculum structure for unlock engine
  const minimalCurriculum = {
    id: course.id,
    title: course.title,
    progressionMode: (course.progression_mode as "FREE" | "LINEAR" | "FLEXIBLE") || "FREE",
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

  // Convert statuses for progress engine map
  const progressEngineMap = Object.entries(statuses).reduce(
    (acc, [id, status]) => {
      acc[id] = { completed: status === "completed", status };
      return acc;
    },
    {} as Record<string, { completed: boolean; status?: string }>,
  );

  return (
    <div className="flex flex-col space-y-6">
      {/* Course Header Link & Progress */}
      <div>
        <Link
          to="/courses/$slug"
          params={{ slug: course.slug }}
          className="group inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Volver a {course.title}</span>
        </Link>

        <div className="mt-5">
          <CourseProgress
            completedCount={completedCount}
            totalCount={totalCount}
            progressPercent={progressPercent}
          />
        </div>
      </div>

      {/* Modules & Lessons Hierarchy */}
      <nav aria-label="Temario del curso" className="space-y-6">
        {sortedModules.map((mod, modIdx) => {
          const modSlug = slugify(mod.title) || mod.id;
          const sortedLessons = [...(mod.lessons ?? [])].sort((a, b) => a.position - b.position);

          return (
            <div key={mod.id} className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground/90">
                <span>
                  Módulo {modIdx + 1}: {mod.title}
                </span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  ({sortedLessons.length})
                </span>
              </div>

              <ul className="space-y-1">
                {sortedLessons.map((lesson) => {
                  const status = statuses[lesson.id] || "not_started";
                  const isSelected = lesson.id === activeLessonId;

                  const access = canAccessLesson(
                    minimalCurriculum,
                    lesson.id,
                    progressEngineMap,
                    isEnrolled,
                  );

                  const isLocked = !access.canAccess;

                  return (
                    <li key={lesson.id}>
                      {isLocked ? (
                        <button
                          type="button"
                          aria-disabled="true"
                          onClick={() => {
                            toast.warning(access.reason || "Lección bloqueada");
                          }}
                          className={cn(
                            "group flex w-full cursor-not-allowed items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-muted-foreground/60 transition-all opacity-70 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <Lock className="size-4 shrink-0 text-muted-foreground/50" />
                            <span className="truncate">{lesson.title}</span>
                          </div>

                          {lesson.duration_minutes > 0 && (
                            <span className="ml-2 flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground/50">
                              <Clock className="size-3" />
                              {formatDuration(lesson.duration_minutes)}
                            </span>
                          )}
                        </button>
                      ) : (
                        <Link
                          to="/academy/course/$courseSlug/module/$moduleSlug/lesson/$lessonSlug"
                          params={{
                            courseSlug: course.slug,
                            moduleSlug: modSlug,
                            lessonSlug: lesson.slug,
                          }}
                          onClick={onSelectLesson}
                          className={cn(
                            "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            isSelected
                              ? "bg-primary font-medium text-primary-foreground shadow-xs"
                              : "text-foreground hover:bg-muted/80",
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            {status === "completed" ? (
                              <CheckCircle2
                                className={cn(
                                  "size-4 shrink-0",
                                  isSelected ? "text-primary-foreground" : "text-emerald-500",
                                )}
                              />
                            ) : status === "in_progress" ? (
                              <PlayCircle
                                className={cn(
                                  "size-4 shrink-0",
                                  isSelected ? "text-primary-foreground" : "text-amber-500",
                                )}
                              />
                            ) : (
                              <Circle
                                className={cn(
                                  "size-4 shrink-0",
                                  isSelected
                                    ? "text-primary-foreground/70"
                                    : "text-muted-foreground/60",
                                )}
                              />
                            )}
                            <span className="truncate">{lesson.title}</span>
                          </div>

                          {lesson.duration_minutes > 0 && (
                            <span
                              className={cn(
                                "ml-2 flex shrink-0 items-center gap-1 text-[11px]",
                                isSelected ? "text-primary-foreground/80" : "text-muted-foreground",
                              )}
                            >
                              <Clock className="size-3" />
                              {formatDuration(lesson.duration_minutes)}
                            </span>
                          )}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
