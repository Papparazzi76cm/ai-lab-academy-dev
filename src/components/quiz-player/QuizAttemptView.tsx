import React, { useState, useEffect, useCallback } from "react";
import { Quiz, StudentQuizQuestion, QuizAttempt, SubmitAttemptResult } from "@/lib/quiz/types";
import { QuizTimer } from "./QuizTimer";
import { QuizProgress } from "./QuizProgress";
import { QuizQuestion } from "./QuizQuestion";
import { QuizSubmitDialog } from "./QuizSubmitDialog";
import { QuizNavigation } from "./QuizNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface QuizAttemptViewProps {
  quiz?: Quiz;
  attempt?: QuizAttempt;
  questions: StudentQuizQuestion[];
  currentIndex: number;
  onSelectIndex: (idx: number) => void;
  userAnswers: Record<string, string[]>;
  onAnswerChange: (selectedIds: string[]) => void;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  saveError?: string | null;
  onRetrySave?: () => void;
}

export function QuizAttemptView({
  quiz,
  attempt,
  questions,
  currentIndex,
  onSelectIndex,
  userAnswers,
  onAnswerChange,
  onPrevious,
  onNext,
  onSubmit,
  isSubmitting,
  saveError,
  onRetrySave,
}: QuizAttemptViewProps) {
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  const currentQuestion = questions[currentIndex];

  const handleTimeExpired = useCallback(() => {
    if (attempt && !isSubmitting) {
      toast.warning("¡Tiempo agotado! Enviando cuestionario automáticamente...");
      onSubmit();
    }
  }, [attempt, isSubmitting, onSubmit]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (submitDialogOpen || !currentQuestion) return;

      if (e.key === "ArrowRight") {
        onNext();
      } else if (e.key === "ArrowLeft") {
        onPrevious();
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
            onAnswerChange(updated);
          } else {
            onAnswerChange([answers[optionIdx].id]);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentIndex,
    currentQuestion,
    userAnswers,
    submitDialogOpen,
    onNext,
    onPrevious,
    onAnswerChange,
  ]);

  const answeredQuestionIds = new Set(
    Object.entries(userAnswers)
      .filter(([_, sel]) => sel && sel.length > 0)
      .map(([qId]) => qId),
  );

  const unansweredCount = questions.length - answeredQuestionIds.size;

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      {/* Sticky Header */}
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
        onSelectQuestion={onSelectIndex}
      />

      {saveError && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{saveError}</span>
          </div>
          {onRetrySave && (
            <Button size="sm" variant="outline" onClick={onRetrySave} className="h-7 text-xs">
              <RotateCcw className="mr-1 size-3" /> Reintentar guardar
            </Button>
          )}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {currentQuestion && (
            <QuizQuestion
              question={currentQuestion}
              questionNumber={currentIndex + 1}
              totalQuestions={questions.length}
              selectedAnswerIds={userAnswers[currentQuestion.id] || []}
              onAnswerChange={onAnswerChange}
            />
          )}
        </CardContent>
      </Card>

      <QuizNavigation
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        onPrevious={onPrevious}
        onNext={onNext}
        onSubmitOpen={() => setSubmitDialogOpen(true)}
      />

      <QuizSubmitDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        unansweredCount={unansweredCount}
        totalQuestions={questions.length}
        onConfirmSubmit={() => {
          setSubmitDialogOpen(false);
          onSubmit();
        }}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
