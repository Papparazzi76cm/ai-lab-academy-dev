import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Home,
  Menu,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LessonRenderer } from "@/components/lesson/LessonRenderer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  courseQuery,
  formatDuration,
  publishedLessonBlocksQuery,
  myProgressQuery,
} from "@/lib/api";
import { parseBlocks, type BlockType, type LessonBlockItem } from "@/lib/blocks";
import { slugify } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

export type LessonProgressStatus = "not_started" | "in_progress" | "completed";

export const Route = createFileRoute(
  "/academy/course/$courseSlug/module/$moduleSlug/lesson/$lessonSlug",
)({
  head: ({ params }) => ({
    meta: [
      { title: `Lección — Academia NeuraLab` },
      { name: "description", content: "Reproductor de lecciones de la Academia." },
    ],
  }),
  component: LessonPlayerPage,
});

function LessonPlayerPage() {
  const { courseSlug, moduleSlug, lessonSlug } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Local state map for lesson progress statuses: Record<lessonId, status>
  const [localStatuses, setLocalStatuses] = useState<Record<string, LessonProgressStatus>>({});

  // 1. Fetch Course with Modules and Lessons
  const {
    data: course,
    isLoading: isCourseLoading,
    isError: isCourseError,
  } = useQuery(courseQuery(courseSlug));

  // 2. Fetch User Progress
  const { data: serverProgress = [] } = useQuery(myProgressQuery(user?.id, course?.id));

  // Build ordered flat list of lessons with module info
  const flatLessons = useMemo(() => {
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

  // Locate active module and lesson
  const currentLessonItem = useMemo(() => {
    return flatLessons.find((l) => l.slug === lessonSlug) ?? null;
  }, [flatLessons, lessonSlug]);

  const currentModule = useMemo(() => {
    if (!course?.modules) return null;
    if (currentLessonItem) {
      return course.modules.find((m) => m.id === currentLessonItem.moduleId) ?? null;
    }
    return (
      course.modules.find((m) => slugify(m.title) === moduleSlug || m.id === moduleSlug) ?? null
    );
  }, [course, currentLessonItem, moduleSlug]);

  // 3. Fetch Published Blocks for the active lesson
  const { data: rawBlocks = [], isLoading: isBlocksLoading } = useQuery(
    publishedLessonBlocksQuery(currentLessonItem?.id),
  );

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
    if (currentLessonItem?.content) {
      return parseBlocks(currentLessonItem.content);
    }
    return [];
  }, [rawBlocks, currentLessonItem]);

  // Synchronize server progress with local state + localStorage fallback
  useEffect(() => {
    const nextMap: Record<string, LessonProgressStatus> = {};
    serverProgress.forEach((p) => {
      if (p.completed) {
        nextMap[p.lesson_id] = "completed";
      } else if (p.status) {
        nextMap[p.lesson_id] = p.status as LessonProgressStatus;
      } else {
        nextMap[p.lesson_id] = "in_progress";
      }
    });

    // Try reading localStorage fallback for offline / unauthenticated state
    try {
      const stored = localStorage.getItem(`academy_progress_${courseSlug}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.assign(nextMap, parsed);
      }
    } catch {
      // Ignore storage errors
    }

    setLocalStatuses((prev) => ({ ...nextMap, ...prev }));
  }, [serverProgress, courseSlug]);

  // Scroll to top on lesson load
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [lessonSlug]);

  // Mark current lesson as "in_progress" if not started yet
  useEffect(() => {
    if (currentLessonItem?.id) {
      setLocalStatuses((prev) => {
        const currentStatus = prev[currentLessonItem.id] || "not_started";
        if (currentStatus === "not_started") {
          const updated = { ...prev, [currentLessonItem.id]: "in_progress" as const };
          try {
            localStorage.setItem(`academy_progress_${courseSlug}`, JSON.stringify(updated));
          } catch {
            // Ignore
          }
          return updated;
        }
        return prev;
      });
    }
  }, [currentLessonItem?.id, courseSlug]);

  // Navigation indexes
  const currentIndex = flatLessons.findIndex((l) => l.slug === lessonSlug);
  const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < flatLessons.length - 1
      ? flatLessons[currentIndex + 1]
      : null;

  // Calculate Course Progress Percentage
  const completedCount = useMemo(() => {
    return flatLessons.filter((l) => localStatuses[l.id] === "completed").length;
  }, [flatLessons, localStatuses]);

  const progressPercent = flatLessons.length
    ? Math.round((completedCount / flatLessons.length) * 100)
    : 0;

  // Toggle mark as completed
  const isCurrentCompleted = currentLessonItem
    ? localStatuses[currentLessonItem.id] === "completed"
    : false;

  async function handleToggleComplete() {
    if (!currentLessonItem) return;

    const newCompleted = !isCurrentCompleted;
    const newStatus: LessonProgressStatus = newCompleted ? "completed" : "in_progress";

    // Update local state immediately
    const updatedMap = { ...localStatuses, [currentLessonItem.id]: newStatus };
    setLocalStatuses(updatedMap);

    try {
      localStorage.setItem(`academy_progress_${courseSlug}`, JSON.stringify(updatedMap));
    } catch {
      // Ignore
    }

    // Persist to Supabase if logged in
    if (user && course) {
      const { error } = await supabase.from("lesson_progress").upsert(
        {
          user_id: user.id,
          lesson_id: currentLessonItem.id,
          course_id: course.id,
          completed: newCompleted,
          status: newStatus,
          completed_at: newCompleted ? new Date().toISOString() : null,
        },
        { onConflict: "user_id,lesson_id" },
      );

      if (!error) {
        queryClient.invalidateQueries({ queryKey: ["progress", user.id, course.id] });
      }
    }

    if (newCompleted) {
      toast.success("¡Lección marcada como completada!");
    } else {
      toast.info("Lección marcada como en progreso");
    }
  }

  // Loading Skeleton State
  if (isCourseLoading || (currentLessonItem && isBlocksLoading)) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full" />
            <div className="space-y-3 pt-4">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="aspect-video w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // 404 / Error State
  if (isCourseError || !course || !currentLessonItem) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto flex max-w-3xl flex-col items-center justify-center px-4 py-24 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <BookOpen className="size-8" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            404 — Lección no encontrada
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            La lección que buscas no existe o ha sido movida a otro módulo.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Button asChild variant="default">
              <Link to="/courses/$slug" params={{ slug: courseSlug }}>
                Volver al curso
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/courses">Ver catálogo</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Sidebar Curriculum Nav Content (reused in desktop sidebar & mobile drawer)
  const SidebarContent = (
    <div className="flex flex-col space-y-6">
      {/* Course Info & Progress Bar Header */}
      <div>
        <Link
          to="/courses/$slug"
          params={{ slug: courseSlug }}
          className="group inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Volver a {course.title}</span>
        </Link>

        {/* Progress Bar Display */}
        <div className="mt-5 space-y-2 rounded-xl border border-border/80 bg-muted/40 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              Curso
            </span>
            <span className="font-mono text-primary font-bold">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2 w-full bg-secondary" />
          <p className="text-[11px] text-muted-foreground">
            {completedCount} de {flatLessons.length} lecciones completadas
          </p>
        </div>
      </div>

      {/* Modules & Lessons List */}
      <nav aria-label="Temario del curso" className="space-y-6">
        {[...(course.modules ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((mod, modIdx) => {
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
                    const status = localStatuses[lesson.id] || "not_started";
                    const isSelected = lesson.slug === lessonSlug;

                    return (
                      <li key={lesson.id}>
                        <Link
                          to="/academy/course/$courseSlug/module/$moduleSlug/lesson/$lessonSlug"
                          params={{
                            courseSlug,
                            moduleSlug: modSlug,
                            lessonSlug: lesson.slug,
                          }}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            isSelected
                              ? "bg-primary text-primary-foreground font-medium shadow-sm"
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

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      {/* Top Mobile Bar with Menu Drawer Button */}
      <div className="border-b border-border bg-card px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Menu className="size-4" />
                <span>Ver temario ({progressPercent}%)</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto sm:w-96">
              <SheetHeader className="mb-4 text-left">
                <SheetTitle className="font-display text-lg font-bold">
                  Temario del curso
                </SheetTitle>
              </SheetHeader>
              {SidebarContent}
            </SheetContent>
          </Sheet>

          <div className="text-xs font-medium text-muted-foreground">
            Lección {currentIndex + 1} de {flatLessons.length}
          </div>
        </div>
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          {/* Desktop Left Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-soft">
              {SidebarContent}
            </div>
          </aside>

          {/* Right Main Lesson Area */}
          <main className="min-w-0 flex-1 space-y-6">
            {/* Breadcrumb Navigation */}
            <nav aria-label="Breadcrumb">
              <Breadcrumb>
                <BreadcrumbList className="text-xs font-medium text-muted-foreground">
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/courses" className="flex items-center gap-1 hover:text-foreground">
                        <Home className="size-3.5" />
                        Academia
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>
                    <ChevronRight className="size-3.5" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link
                        to="/courses/$slug"
                        params={{ slug: courseSlug }}
                        className="hover:text-foreground"
                      >
                        {course.title}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>
                    <ChevronRight className="size-3.5" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <span className="text-foreground">{currentModule?.title ?? "Módulo"}</span>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>
                    <ChevronRight className="size-3.5" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-semibold text-foreground">
                      {currentLessonItem.title}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </nav>

            {/* Read-Only Published Lesson Component */}
            <LessonRenderer lesson={currentLessonItem} blocks={blocks} />

            {/* Bottom Lesson Footer Controls */}
            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
              {/* Previous Lesson Button */}
              <Button
                variant="outline"
                disabled={!prevLesson}
                onClick={() => {
                  if (prevLesson) {
                    navigate({
                      to: "/academy/course/$courseSlug/module/$moduleSlug/lesson/$lessonSlug",
                      params: {
                        courseSlug,
                        moduleSlug: prevLesson.moduleSlug,
                        lessonSlug: prevLesson.slug,
                      },
                    });
                  }
                }}
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="mr-2 size-4" />
                <span className="truncate">
                  {prevLesson ? `Anterior: ${prevLesson.title}` : "Anterior"}
                </span>
              </Button>

              {/* Toggle Complete Status Button */}
              <Button
                variant={isCurrentCompleted ? "secondary" : "default"}
                onClick={handleToggleComplete}
                className="w-full font-medium sm:w-auto"
              >
                <CheckCircle2
                  className={cn(
                    "mr-2 size-4",
                    isCurrentCompleted ? "text-emerald-500" : "text-primary-foreground",
                  )}
                />
                <span>
                  {isCurrentCompleted ? "Completada (Cambiar)" : "Marcar como completada"}
                </span>
              </Button>

              {/* Next Lesson Button */}
              <Button
                variant="outline"
                disabled={!nextLesson}
                onClick={() => {
                  if (nextLesson) {
                    navigate({
                      to: "/academy/course/$courseSlug/module/$moduleSlug/lesson/$lessonSlug",
                      params: {
                        courseSlug,
                        moduleSlug: nextLesson.moduleSlug,
                        lessonSlug: nextLesson.slug,
                      },
                    });
                  }
                }}
                className="w-full sm:w-auto"
              >
                <span className="truncate">
                  {nextLesson ? `Siguiente: ${nextLesson.title}` : "Siguiente"}
                </span>
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
