import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  QuizQuestion as IQuizQuestion,
  StartAttemptPayload,
  SubmitAttemptResult,
} from "@/lib/quiz/types";
import { startQuizAttemptRpc, saveQuizAnswerRpc, submitQuizAttemptRpc } from "@/lib/quiz/api";
import { QuizTimer } from "./QuizTimer";
import { QuizProgress } from "./QuizProgress";
import { QuizQuestion } from "./QuizQuestion";
import { QuizSubmitDialog } from "./QuizSubmitDialog";
import { QuizResultView } from "./QuizResultView";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Send, AlertCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface QuizPlayerProps {
  quizId: string;
  onComplete?: (result: SubmitAttemptResult) => void;
  onContinue?: () => void;
}

export function QuizPlayer({ quizId, onComplete, onContinue }: QuizPlayerProps) {
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({});
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [result, setResult] = useState<SubmitAttemptResult | null>(null);

  // Start attempt query
  const {
    data: attemptData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["quiz-attempt-start", quizId],
    queryFn: () => startQuizAttemptRpc(quizId),
    refetchOnWindowFocus: false,
  });

  const quiz = attemptData?.quiz;
  const attempt = attemptData?.attempt;
  const questions = attemptData?.questions || [];

  const currentQuestion = questions[currentIndex];

  // Save answer mutation
  const saveAnswerMutation = useMutation({
    mutationFn: ({ questionId, selectedIds }: { questionId: string; selectedIds: string[] }) =>
      saveQuizAnswerRpc(attempt!.id, questionId, selectedIds),
    onError: (err: Error) => toast.error(`Error guardando respuesta: ${err.message}`),
  });

  // Submit attempt mutation
  const submitAttemptMutation = useMutation({
    mutationFn: () => submitQuizAttemptRpc(attempt!.id),
    onSuccess: (res) => {
      setResult(res);
      setSubmitDialogOpen(false);
      toast.success(res.passed ? "¡Cuestionario aprobado!" : "Cuestionario completado.");
      queryClient.invalidateQueries({ queryKey: ["quiz-attempt-start", quizId] });
      if (onComplete) onComplete(res);
    },
    onError: (err: Error) => toast.error(`Error enviando cuestionario: ${err.message}`),
  });

  const handleAnswerChange = (selectedIds: string[]) => {
    if (!currentQuestion || !attempt) return;

    setUserAnswers((prev) => ({ ...prev, [currentQuestion.id]: selectedIds }));
    saveAnswerMutation.mutate({ questionId: currentQuestion.id, selectedIds });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleTimeExpired = useCallback(() => {
    if (!result && attempt && !submitAttemptMutation.isPending) {
      toast.warning("¡Tiempo agotado! Enviando cuestionario automáticamente...");
      submitAttemptMutation.mutate();
    }
  }, [result, attempt, submitAttemptMutation]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (result || submitDialogOpen || !currentQuestion) return;

      if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrevious();
      } else if (e.key >= "1" && e.key <= "9") {
        const optionIdx = parseInt(e.key, 10) - 1;
        const answers = currentQuestion.answers || [];
        if (answers[optionIdx]) {
          if (currentQuestion.type === "multiple_choice") {
            const currentSel = userAnswers[currentQuestion.id] || [];
            const ansId = answers[optionIdx].id;
            const updated = currentSel.includes(ansId)
              ? currentSel.filter((id) => id !== ansId)
              : [...currentSel, ansId];
            handleAnswerChange(updated);
          } else {
            handleAnswerChange([answers[optionIdx].id]);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, currentQuestion, userAnswers, result, submitDialogOpen]);

  if (isLoading) {
    return (
      <Card className="mx-auto max-w-3xl my-8 py-12 text-center">
        <CardContent>
          <div className="text-sm text-muted-foreground animate-pulse">
            Iniciando cuestionario...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-3xl my-8 border-destructive/40 bg-destructive/5 text-center">
        <CardContent className="space-y-4 pt-8">
          <AlertCircle className="mx-auto size-10 text-destructive" />
          <h3 className="text-lg font-bold">No se pudo cargar el cuestionario</h3>
          <p className="text-xs text-muted-foreground">{error.message}</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (result) {
    return (
      <QuizResultView
        result={result}
        maxAttempts={quiz?.max_attempts}
        onRetry={() => {
          setResult(null);
          setCurrentIndex(0);
          setUserAnswers({});
          refetch();
        }}
        onContinue={onContinue}
      />
    );
  }

  const answeredQuestionIds = new Set(
    Object.entries(userAnswers)
      .filter(([_, sel]) => sel && sel.length > 0)
      .map(([qId]) => qId),
  );

  const unansweredCount = questions.length - answeredQuestionIds.size;

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      {/* Sticky Top Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border bg-card/95 p-4 shadow-sm backdrop-blur">
        <div>
          <h2 className="line-clamp-1 text-base font-bold">{quiz?.title}</h2>
          <p className="text-xs text-muted-foreground">
            Pregunta {currentIndex + 1} de {questions.length}
          </p>
        </div>

        {attempt?.expires_at && (
          <QuizTimer expiresAt={attempt.expires_at} onExpire={handleTimeExpired} />
        )}
      </div>

      <QuizProgress
        totalQuestions={questions.length}
        currentIndex={currentIndex}
        answeredQuestionIds={answeredQuestionIds}
        questionIds={questions.map((q) => q.id)}
        onSelectQuestion={(idx) => setCurrentIndex(idx)}
      />

      <Card>
        <CardContent className="pt-6">
          {currentQuestion && (
            <QuizQuestion
              question={currentQuestion}
              questionNumber={currentIndex + 1}
              totalQuestions={questions.length}
              selectedAnswerIds={userAnswers[currentQuestion.id] || []}
              onAnswerChange={handleAnswerChange}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          id="prev-question-btn"
        >
          <ChevronLeft className="mr-1 size-4" /> Anterior
        </Button>

        <div className="flex items-center gap-2">
          {currentIndex < questions.length - 1 ? (
            <Button onClick={handleNext} id="next-question-btn">
              Siguiente <ChevronRight className="ml-1 size-4" />
            </Button>
          ) : (
            <Button
              onClick={() => setSubmitDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              id="submit-quiz-btn"
            >
              <Send className="mr-1.5 size-4" /> Entregar Cuestionario
            </Button>
          )}
        </div>
      </div>

      <QuizSubmitDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        unansweredCount={unansweredCount}
        totalQuestions={questions.length}
        onConfirmSubmit={() => submitAttemptMutation.mutate()}
        isSubmitting={submitAttemptMutation.isPending}
      />
    </div>
  );
}
