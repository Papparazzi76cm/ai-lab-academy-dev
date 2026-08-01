import { Sparkles, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CourseCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  totalLessons?: number;
}

export function CourseCompletionModal({
  isOpen,
  onClose,
  courseTitle,
  totalLessons,
}: CourseCompletionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-5" />
        </button>

        {/* Header graphics */}
        <div className="text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-8 animate-pulse" />
          </div>

          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">¡Curso completado!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Has finalizado con éxito todas las lecciones de{" "}
            <strong className="text-foreground">{courseTitle}</strong>.
          </p>
        </div>

        {/* Progress summary card */}
        <div className="mt-6 rounded-xl border border-border bg-muted/30 p-5 text-center">
          <div className="flex items-center justify-center gap-2 font-semibold text-emerald-500">
            <Trophy className="size-5" />
            <span className="text-sm">100% Completado</span>
          </div>
          {totalLessons ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Completaste las {totalLessons} lecciones del curso.
            </p>
          ) : null}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Seguir explorando
          </Button>
          <Button
            onClick={() => {
              onClose();
              window.location.href = "/dashboard";
            }}
            className="w-full sm:w-auto"
          >
            Ir al Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
