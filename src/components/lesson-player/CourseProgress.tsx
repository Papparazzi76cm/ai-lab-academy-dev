import { Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface CourseProgressProps {
  completedCount: number;
  totalCount: number;
  progressPercent: number;
}

export function CourseProgress({
  completedCount,
  totalCount,
  progressPercent,
}: CourseProgressProps) {
  return (
    <div className="space-y-2 rounded-xl border border-border/80 bg-muted/40 p-4">
      <div className="flex items-center justify-between text-xs font-semibold text-foreground">
        <span className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-primary" />
          Progreso del curso
        </span>
        <span className="font-mono text-xs font-bold text-primary">{progressPercent}%</span>
      </div>
      <Progress
        value={progressPercent}
        className="h-2 w-full bg-secondary"
        aria-label={`Progreso del curso: ${progressPercent}%`}
      />
      <p className="text-[11px] text-muted-foreground">
        {completedCount} de {totalCount} lecciones completadas
      </p>
    </div>
  );
}
