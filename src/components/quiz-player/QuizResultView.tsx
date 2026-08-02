import React from "react";
import { SubmitAttemptResult, QuizAttempt } from "@/lib/quiz/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, RotateCcw, ArrowRight, Award, HelpCircle } from "lucide-react";

interface QuizResultViewProps {
  result: SubmitAttemptResult;
  attemptsHistory?: QuizAttempt[];
  maxAttempts?: number | null;
  onRetry?: () => void;
  onContinue?: () => void;
}

export function QuizResultView({
  result,
  attemptsHistory = [],
  maxAttempts,
  onRetry,
  onContinue,
}: QuizResultViewProps) {
  const attemptsCount = attemptsHistory.length;
  const canRetry = maxAttempts == null || attemptsCount < maxAttempts;

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <Card
        className={`border-2 text-center transition-all ${
          result.passed
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-destructive/40 bg-destructive/5"
        }`}
      >
        <CardContent className="space-y-4 pt-8 pb-8">
          {result.passed ? (
            <CheckCircle2 className="mx-auto size-16 text-emerald-500" />
          ) : (
            <XCircle className="mx-auto size-16 text-destructive" />
          )}

          <div className="space-y-1">
            <Badge
              className={`text-sm px-3 py-1 font-semibold ${
                result.passed
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                  : "bg-destructive/10 text-destructive border-destructive/30"
              }`}
            >
              {result.passed ? "¡Cuestionario Aprobado!" : "Cuestionario No Aprobado"}
            </Badge>
            <h2 className="text-4xl font-extrabold tracking-tight mt-2">{result.score}%</h2>
            <p className="text-xs text-muted-foreground">
              Obtuviste {result.earned_points} de {result.total_points} puntos (Mínimo para aprobar:{" "}
              {result.passing_score}%)
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            {!result.passed && canRetry && onRetry && (
              <Button onClick={onRetry} variant="outline" id="retry-quiz-btn">
                <RotateCcw className="mr-2 size-4" /> Intentar de Nuevo
              </Button>
            )}

            {onContinue && (
              <Button onClick={onContinue} className="bg-primary" id="continue-lesson-btn">
                Continuar Aprendiendo <ArrowRight className="ml-2 size-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {result.show_correct_answers && result.details && result.details.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revisión de Preguntas</CardTitle>
            <CardDescription>
              Consulta tus respuestas y las correcciones del cuestionario.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.details.map((q, idx) => (
              <div key={q.question_id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Pregunta #{idx + 1}
                    </span>
                    <h4 className="text-sm font-semibold">{q.question_text}</h4>
                  </div>
                  <Badge variant={q.is_correct ? "default" : "destructive"}>
                    {q.is_correct ? `+${q.points_earned} pts` : "0 pts"}
                  </Badge>
                </div>

                <div className="space-y-1.5 pt-1">
                  {q.answers.map((ans) => (
                    <div
                      key={ans.id}
                      className={`flex items-center justify-between rounded-md p-2.5 text-xs ${
                        ans.is_correct
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium border border-emerald-500/20"
                          : ans.selected
                            ? "bg-destructive/10 text-destructive border border-destructive/20 font-medium"
                            : "bg-secondary/40 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{ans.answer_text}</span>
                        {ans.selected && (
                          <Badge variant="outline" className="text-[10px] py-0">
                            Tu selección
                          </Badge>
                        )}
                      </div>
                      {ans.is_correct && (
                        <span className="font-semibold text-[10px] uppercase">Correcta</span>
                      )}
                    </div>
                  ))}
                </div>

                {result.show_explanations && q.explanation && (
                  <div className="rounded-md bg-secondary/60 p-3 text-xs text-muted-foreground">
                    <strong className="text-foreground block mb-0.5">Explicación:</strong>
                    {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {attemptsHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Historial de Intentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              {attemptsHistory.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between border-b py-2 last:border-none"
                >
                  <span>Intento #{att.attempt_number}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{att.score}%</span>
                    <Badge variant={att.passed ? "default" : "secondary"}>
                      {att.passed ? "Aprobado" : "Reprobado"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
