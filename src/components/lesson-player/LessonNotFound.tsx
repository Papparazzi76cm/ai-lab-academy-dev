import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";

interface LessonNotFoundProps {
  courseSlug?: string;
}

export function LessonNotFound({ courseSlug }: LessonNotFoundProps) {
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
          La lección o el módulo que buscas no pertenece a este curso o no existe.
        </p>
        <div className="mt-8 flex items-center gap-4">
          {courseSlug ? (
            <Button asChild variant="default">
              <Link to="/courses/$slug" params={{ slug: courseSlug }}>
                Volver al curso
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link to="/courses">Ver catálogo de cursos</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
