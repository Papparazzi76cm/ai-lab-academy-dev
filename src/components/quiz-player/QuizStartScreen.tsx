import React from "react";
import { Quiz } from "@/lib/quiz/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, Clock, RotateCcw, Award, CheckCircle2, Play } from "lucide-react";

interface QuizStartScreenProps {
  quiz: Quiz;
  questionsCount?: number;
  completedAttemptsCount?: number;
  hasActiveAttempt?: boolean;
  onStart: () => void;
  isStarting?: boolean;
}

export function QuizStartScreen({
  quiz,
  questionsCount = 0,
  completedAttemptsCount = 0,
  hasActiveAttempt = false,
  onStart,
  isStarting = false,
}: QuizStartScreenProps) {
  const maxAttempts = quiz.max_attempts;
  const remainingAttempts =
    maxAttempts != null ? Math.max(0, maxAttempts - completedAttemptsCount) : null;

  return (
    <Card className="mx-auto max-w-2xl my-8 border bg-card shadow-sm">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <HelpCircle className="size-6" />
        </div>
        <CardTitle className="text-2xl font-bold">{quiz.title}</CardTitle>
        {quiz.description && (
          <CardDescription className="mt-2 text-sm leading-relaxed">
            {quiz.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-6 pt-2">
        <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/40 p-4 sm:grid-cols-4 text-center">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Preguntas</span>
            <p className="text-lg font-bold">{questionsCount}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">Nota Mínima</span>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {quiz.passing_score}%
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">Tiempo Límite</span>
            <p className="text-lg font-bold flex items-center justify-center gap-1">
              <Clock className="size-4 text-muted-foreground" />
              {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min` : "Sin límite"}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-medium">Intentos</span>
            <p className="text-lg font-bold">
              {maxAttempts ? `${completedAttemptsCount} / ${maxAttempts}` : "Ilimitados"}
            </p>
          </div>
        </div>

        {quiz.required_for_completion && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300">
            <Award className="size-5 shrink-0 text-amber-600" />
            <span>
              Este cuestionario es <strong>obligatorio</strong> para completar el módulo o lección.
            </span>
          </div>
        )}

        <div className="flex flex-col items-center gap-3 pt-2">
          <Button
            size="lg"
            onClick={onStart}
            disabled={
              isStarting ||
              (remainingAttempts !== null && remainingAttempts <= 0 && !hasActiveAttempt)
            }
            className="w-full sm:w-auto px-8 font-semibold"
            id="start-quiz-btn"
          >
            {isStarting ? (
              "Iniciando..."
            ) : hasActiveAttempt ? (
              <>
                <RotateCcw className="mr-2 size-5" /> Reanudar Cuestionario
              </>
            ) : (
              <>
                <Play className="mr-2 size-5" /> Comenzar Cuestionario
              </>
            )}
          </Button>

          {remainingAttempts !== null && remainingAttempts <= 0 && !hasActiveAttempt && (
            <p className="text-xs font-medium text-destructive">
              Has agotado todos los intentos permitidos para este cuestionario.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
