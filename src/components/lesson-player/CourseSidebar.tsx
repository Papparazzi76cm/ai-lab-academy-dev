import { Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Circle, Clock, PlayCircle } from "lucide-react";
import { formatDuration } from "@/lib/api";
import { slugify } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { CourseProgress } from "./CourseProgress";
import type { LessonProgressStatus } from "./useLessonProgress";
import type { Tables } from "@/integrations/supabase/types";

export type CourseModuleWithLessons = Tables<"modules"> & {
  lessons?: Tables<"lessons">[] | null;
};

export type CourseWithModules = Tables<"courses"> & {
  modules?: CourseModuleWithLessons[] | null;
};

interface CourseSidebarProps {
  course: CourseWithModules;
  activeLessonId?: string | undefined;
  activeModuleSlug?: string | undefined;
  statuses: Record<string, LessonProgressStatus>;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  onSelectLesson?: (() => void) | undefined;
}

export function CourseSidebar({
  course,
  activeLessonId,
  statuses,
  completedCount,
  totalCount,
  progressPercent,
  onSelectLesson,
}: CourseSidebarProps) {
  const sortedModules = [...(course.modules ?? [])].sort((a, b) => a.position - b.position);

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

                  return (
                    <li key={lesson.id}>
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
