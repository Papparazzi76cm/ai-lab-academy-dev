import { Lock, ArrowRight, BookOpen } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

interface LessonLockedProps {
  reason?: string;
  courseSlug: string;
  requiredLessonSlug?: string;
  requiredModuleSlug?: string;
  requiredLessonTitle?: string;
  requiredModuleTitle?: string;
  isNotEnrolled?: boolean;
}

export function LessonLocked({
  reason,
  courseSlug,
  requiredLessonSlug,
  requiredModuleSlug,
  requiredLessonTitle,
  isNotEnrolled,
}: LessonLockedProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center shadow-xs">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-4">
        <Lock className="size-8" />
      </div>

      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
        Lección bloqueada
      </h2>

      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {reason || "No tienes acceso a esta lección en este momento."}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {isNotEnrolled ? (
          <Button asChild>
            <Link to="/courses/$slug" params={{ slug: courseSlug }}>
              <BookOpen className="mr-2 size-4" />
              Inscribirse en el curso
            </Link>
          </Button>
        ) : requiredLessonSlug && requiredModuleSlug ? (
          <Button asChild>
            <Link
              to="/academy/course/$courseSlug/module/$moduleSlug/lesson/$lessonSlug"
              params={{
                courseSlug,
                moduleSlug: requiredModuleSlug,
                lessonSlug: requiredLessonSlug,
              }}
            >
              Ir a {requiredLessonTitle ? `"${requiredLessonTitle}"` : "la lección requerida"}
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link to="/courses/$slug" params={{ slug: courseSlug }}>
              Ver temario del curso
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
