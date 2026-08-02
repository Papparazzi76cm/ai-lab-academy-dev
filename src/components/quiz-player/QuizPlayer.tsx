import React from "react";
import { SubmitAttemptResult } from "@/lib/quiz/types";
import { useQuizAttempt } from "./useQuizAttempt";
import { QuizStartScreen } from "./QuizStartScreen";
import { QuizAttemptView } from "./QuizAttemptView";
import { QuizResultView } from "./QuizResultView";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface QuizPlayerProps {
  quizId: string;
  onComplete?: (result: SubmitAttemptResult) => void;
  onContinue?: () => void;
}

export function QuizPlayer({ quizId, onComplete, onContinue }: QuizPlayerProps) {
  const {
    quiz,
    attempt,
    questions,
    currentIndex,
    setCurrentIndex,
    userAnswers,
    hasStarted,
    startAttempt,
    isStarting,
    hasActiveAttempt,
    completedAttemptsCount,
    result,
    setResult,
    saveError,
    handleRetrySave,
    isPreviewLoading,
    previewError,
    handleAnswerChange,
    handleNext,
    handlePrevious,
    submitQuiz,
    isSubmitting,
  } = useQuizAttempt(quizId, onComplete);

  if (isPreviewLoading) {
    return (
      <Card className="mx-auto max-w-2xl my-8 py-12 text-center">
        <CardContent>
          <div className="text-sm text-muted-foreground animate-pulse">
            Cargando cuestionario...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (previewError || !quiz) {
    return (
      <Card className="mx-auto max-w-2xl my-8 border-destructive/40 bg-destructive/5 text-center">
        <CardContent className="space-y-4 pt-8">
          <AlertCircle className="mx-auto size-10 text-destructive" />
          <h3 className="text-lg font-bold">No se pudo cargar el cuestionario</h3>
          <p className="text-xs text-muted-foreground">
            {previewError ? (previewError as Error).message : "Cuestionario no encontrado"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (result) {
    return (
      <QuizResultView
        result={result}
        maxAttempts={quiz.max_attempts ?? null}
        onRetry={() => {
          setResult(null);
          startAttempt();
        }}
        onContinue={onContinue}
      />
    );
  }

  if (!hasStarted) {
    return (
      <QuizStartScreen
        quiz={quiz}
        questionsCount={quiz.questions_count || questions.length}
        completedAttemptsCount={completedAttemptsCount}
        hasActiveAttempt={hasActiveAttempt}
        onStart={startAttempt}
        isStarting={isStarting}
      />
    );
  }

  return (
    <QuizAttemptView
      quiz={quiz}
      attempt={attempt!}
      questions={questions}
      currentIndex={currentIndex}
      onSelectIndex={(idx) => setCurrentIndex(idx)}
      userAnswers={userAnswers}
      onAnswerChange={handleAnswerChange}
      onPrevious={handlePrevious}
      onNext={handleNext}
      onSubmit={submitQuiz}
      isSubmitting={isSubmitting}
      saveError={saveError}
      onRetrySave={handleRetrySave}
    />
  );
}
