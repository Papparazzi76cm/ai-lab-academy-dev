import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Quiz,
  StudentQuizQuestion,
  QuizAttempt,
  SubmitAttemptResult,
  StartAttemptPayload,
} from "@/lib/quiz/types";
import {
  fetchQuizDetail,
  startQuizAttemptRpc,
  saveQuizAnswerRpc,
  submitQuizAttemptRpc,
  fetchStudentAttempts,
} from "@/lib/quiz/api";
import { toast } from "sonner";

export function useQuizAttempt(quizId: string, onComplete?: (result: SubmitAttemptResult) => void) {
  const queryClient = useQueryClient();

  const [hasStarted, setHasStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<SubmitAttemptResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch static quiz details for pre-start screen
  const {
    data: previewData,
    isLoading: isPreviewLoading,
    error: previewError,
  } = useQuery({
    queryKey: ["quiz-detail-preview", quizId],
    queryFn: () => fetchQuizDetail(quizId),
    enabled: !hasStarted,
  });

  // Fetch student attempt history to calculate count
  const { data: studentAttempts = [] } = useQuery({
    queryKey: ["student-quiz-attempts", quizId],
    queryFn: () => fetchStudentAttempts(),
    enabled: !hasStarted,
  });

  const completedAttemptsCount = studentAttempts.filter(
    (a) => a.quiz_id === quizId && (a.status === "submitted" || a.status === "expired"),
  ).length;

  const activeAttempt = studentAttempts.find(
    (a) => a.quiz_id === quizId && a.status === "in_progress",
  );

  const isStartingRef = useRef(false);

  // Start attempt mutation (explicit start)
  const startAttemptMutation = useMutation({
    mutationFn: () => {
      isStartingRef.current = true;
      return startQuizAttemptRpc(quizId);
    },
    onSuccess: (data: StartAttemptPayload) => {
      isStartingRef.current = false;
      setHasStarted(true);
      if (data.selected_answers) {
        setUserAnswers(data.selected_answers);
      }
      if (typeof data.current_question_index === "number" && data.current_question_index >= 0) {
        setCurrentIndex(data.current_question_index);
      }
    },
    onError: (err: Error) => {
      isStartingRef.current = false;
      toast.error(`Error al iniciar cuestionario: ${err.message}`);
    },
  });

  const attemptData = startAttemptMutation.data;
  const quiz = attemptData?.quiz || previewData?.quiz;
  const attempt = attemptData?.attempt;
  const questions: StudentQuizQuestion[] = attemptData?.questions || [];

  // Save answer mutation
  const saveAnswerMutation = useMutation({
    mutationFn: ({ questionId, selectedIds }: { questionId: string; selectedIds: string[] }) =>
      saveQuizAnswerRpc(attempt!.id, questionId, selectedIds),
    onSuccess: (res) => {
      if (res.status === "expired") {
        setSaveError(res.reason || "El tiempo límite ha expirado.");
        toast.warning("El tiempo del cuestionario ha expirado.");
      } else {
        setSaveError(null);
      }
    },
    onError: (err: Error) => {
      setSaveError(err.message);
      toast.error(`Error guardando respuesta: ${err.message}`);
    },
  });

  // Submit attempt mutation
  const submitAttemptMutation = useMutation({
    mutationFn: () => submitQuizAttemptRpc(attempt!.id),
    onSuccess: (res) => {
      setResult(res);
      if (res.status === "expired") {
        toast.warning(res.reason || "Cuestionario expirado.");
      } else {
        toast.success(res.passed ? "¡Cuestionario aprobado!" : "Cuestionario completado.");
      }
      queryClient.invalidateQueries({ queryKey: ["quiz-attempt-start", quizId] });
      queryClient.invalidateQueries({ queryKey: ["student-quiz-attempts"] });
      if (onComplete) onComplete(res);
    },
    onError: (err: Error) => toast.error(`Error enviando cuestionario: ${err.message}`),
  });

  const handleAnswerChange = (selectedIds: string[]) => {
    const currentQ = questions[currentIndex];
    if (!currentQ || !attempt) return;

    setUserAnswers((prev) => ({ ...prev, [currentQ.id]: selectedIds }));
    saveAnswerMutation.mutate({ questionId: currentQ.id, selectedIds });
  };

  const handleRetrySave = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ || !attempt) return;
    const selectedIds = userAnswers[currentQ.id] || [];
    saveAnswerMutation.mutate({ questionId: currentQ.id, selectedIds });
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

  return {
    quiz,
    attempt,
    questions,
    currentIndex,
    setCurrentIndex,
    userAnswers,
    hasStarted,
    startAttempt: () => {
      if (isStartingRef.current || startAttemptMutation.isPending || hasStarted) return;
      isStartingRef.current = true;
      startAttemptMutation.mutate();
    },
    isStarting: startAttemptMutation.isPending,
    hasActiveAttempt: !!activeAttempt,
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
    submitQuiz: () => submitAttemptMutation.mutate(),
    isSubmitting: submitAttemptMutation.isPending,
  };
}
