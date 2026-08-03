import React from "react";
import { Bot, Sparkles, XCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { LessonPlan } from "@/lib/ai/types";

interface GenerationProgressProps {
  progressStep: "planning" | "generating" | "validating" | "repairing" | "completed";
  progressValue: number;
  currentPlan: LessonPlan | null;
  onCancel: () => void;
}

export function GenerationProgress({
  progressStep,
  progressValue,
  currentPlan,
  onCancel,
}: GenerationProgressProps) {
  return (
    <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
      <div className="relative">
        <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
          <Bot className="size-8 animate-bounce" />
        </div>
        <Sparkles className="size-5 text-amber-500 absolute -top-1 -right-1 animate-spin" />
      </div>

      <div className="space-y-2 max-w-md">
        <h3 className="text-lg font-bold">Generando lección interactiva...</h3>
        <p className="text-sm text-muted-foreground">
          El agente está analizando los requisitos, construyendo el plan y creando los bloques.
        </p>
      </div>

      <div className="w-full max-w-md space-y-2">
        <Progress value={progressValue} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground font-mono">
          <span>
            {progressStep === "planning" && "1/4 Planificando estructura..."}
            {progressStep === "generating" && "2/4 Generando bloques..."}
            {progressStep === "validating" && "3/4 Validando esquemas Zod..."}
            {progressStep === "repairing" && "4/4 Ejecutando Auto-repair..."}
            {progressStep === "completed" && "¡Completado!"}
          </span>
          <span>{progressValue}%</span>
        </div>
      </div>

      {currentPlan && (
        <div className="rounded-xl border border-border bg-card p-4 text-left max-w-lg w-full space-y-2 text-xs">
          <div className="font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            <span>Plan Detectado: {currentPlan.title}</span>
          </div>
          <p className="text-muted-foreground">
            {currentPlan.sections?.length || 0} Secciones planificadas
          </p>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={onCancel}
        className="mt-4 gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
      >
        <XCircle className="size-4" />
        <span>Cancelar Generación</span>
      </Button>
    </div>
  );
}
