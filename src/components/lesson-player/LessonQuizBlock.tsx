/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Quiz, QuizAttempt } from "@/lib/quiz/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, CheckCircle2, Clock, Play, Award, AlertCircle } from "lucide-react";
import { QuizPlayer } from "@/components/quiz-player/QuizPlayer";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface LessonQuizBlockProps {
  lessonId: string;
  courseSlug: string;
}

export function LessonQuizBlock({ lessonId, courseSlug }: LessonQuizBlockProps) {
  const [playerOpen, setPlayerOpen] = useState(false);

  // Fetch quiz for this lesson
  const { data: quiz, isLoading: isQuizLoading } = useQuery({
    queryKey: ["lesson-quiz", lessonId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("quizzes")
        .select("*")
        .eq("lesson_id", lessonId)
        .eq("status", "published")
        .maybeSingle();

      if (error) return null;
      return data as unknown as Quiz | null;
    },
  });

  // Fetch attempts history for current user
  const { data: attempts = [], refetch: refetchAttempts } = useQuery({
    queryKey: ["lesson-quiz-attempts", quiz?.id],
    enabled: !!quiz?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", quiz!.id)
        .order("attempt_number", { ascending: false });

      return (data || []) as unknown as QuizAttempt[];
    },
  });

  if (isQuizLoading || !quiz) return null;

  const latestAttempt = attempts[0];
  const isPassed = attempts.some((a) => a.passed);
  const attemptsCount = attempts.length;
  const canTakeQuiz = quiz.max_attempts == null || attemptsCount < quiz.max_attempts;

  return (
    <div className="my-8">
      <Card
        className={`border-2 transition-all ${isPassed ? "border-emerald-500/30 bg-emerald-500/5" : "border-primary/30 bg-card shadow-soft"}`}
      >
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <HelpCircle className="size-5 text-primary" />
              <CardTitle className="text-lg">Cuestionario Evaluativo</CardTitle>
              {isPassed ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  Aprobado
                </Badge>
              ) : quiz.required_for_completion ? (
                <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                  Obligatorio
                </Badge>
              ) : (
                <Badge variant="secondary">Evaluación</Badge>
              )}
            </div>
            <CardDescription className="text-xs">{quiz.title}</CardDescription>
          </div>

          <Button
            onClick={() => setPlayerOpen(true)}
            disabled={!canTakeQuiz && !isPassed}
            className={isPassed ? "variant-outline" : "bg-primary"}
            id="start-lesson-quiz-btn"
          >
            {isPassed ? (
              <>
                <CheckCircle2 className="mr-2 size-4 text-emerald-500" /> Repasar Cuestionario
              </>
            ) : latestAttempt ? (
              <>
                <RotateCcwIcon className="mr-2 size-4" /> Reintentar Cuestionario ({attemptsCount}/
                {quiz.max_attempts || "∞"})
              </>
            ) : (
              <>
                <Play className="mr-2 size-4 fill-current" /> Iniciar Cuestionario
              </>
            )}
          </Button>
        </CardHeader>

        <CardContent className="space-y-3 pt-0 text-xs text-muted-foreground">
          {quiz.description && <p>{quiz.description}</p>}

          <div className="flex flex-wrap items-center gap-4 border-t border-border/60 pt-3">
            <span className="flex items-center gap-1">
              <Award className="size-3.5 text-primary" /> Nota de aprobación: {quiz.passing_score}%
            </span>
            {quiz.time_limit_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" /> Límite: {quiz.time_limit_minutes} min
              </span>
            )}
            {quiz.max_attempts && (
              <span className="flex items-center gap-1">
                Intentos permitidos: {attemptsCount} / {quiz.max_attempts}
              </span>
            )}
          </div>

          {latestAttempt && (
            <div className="rounded-lg bg-secondary/50 p-2.5 flex items-center justify-between mt-2">
              <span>Último Intento (#{latestAttempt.attempt_number}):</span>
              <span className="font-bold text-foreground">
                {latestAttempt.score}% — {latestAttempt.passed ? "Aprobado" : "Reprobado"}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={playerOpen} onOpenChange={setPlayerOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-4 sm:p-6">
          <QuizPlayer
            quizId={quiz.id}
            onComplete={() => {
              refetchAttempts();
            }}
            onContinue={() => setPlayerOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RotateCcwIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
