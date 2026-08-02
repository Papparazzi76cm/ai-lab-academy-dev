// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QuizPlayer } from "../components/quiz-player/QuizPlayer";
import * as quizApi from "../lib/quiz/api";
import {
  Quiz,
  QuizQuestion,
  StudentQuizQuestion,
  StartAttemptPayload,
  SubmitAttemptResult,
} from "../lib/quiz/types";

vi.mock("../lib/quiz/api");

const mockQuiz: Quiz = {
  id: "quiz-123",
  course_id: "course-123",
  title: "Cuestionario de Evaluación",
  description: "Descripción del cuestionario",
  status: "published",
  passing_score: 80,
  max_attempts: 3,
  time_limit_minutes: 20,
  shuffle_questions: false,
  shuffle_answers: false,
  show_correct_answers: true,
  show_explanations: true,
  required_for_completion: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockQuestions: StudentQuizQuestion[] = [
  {
    id: "q-1",
    quiz_id: "quiz-123",
    type: "single_choice",
    question_text: "Pregunta Uno",
    points: 10,
    position: 0,
    answers: [
      { id: "a-1", question_id: "q-1", answer_text: "Respuesta A", position: 0 },
      { id: "a-2", question_id: "q-1", answer_text: "Respuesta B", position: 1 },
    ],
  },
  {
    id: "q-2",
    quiz_id: "quiz-123",
    type: "single_choice",
    question_text: "Pregunta Dos",
    points: 10,
    position: 1,
    answers: [
      { id: "a-3", question_id: "q-2", answer_text: "Respuesta X", position: 0 },
      { id: "a-4", question_id: "q-2", answer_text: "Respuesta Y", position: 1 },
    ],
  },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

describe("Sprint 2.6 - QuizPlayer & useQuizAttempt Flow Integration Tests", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.resetAllMocks();
    queryClient = createTestQueryClient();

    vi.mocked(quizApi.fetchQuizDetail).mockResolvedValue({
      quiz: mockQuiz,
      questions: mockQuestions as unknown as QuizQuestion[],
    });
    vi.mocked(quizApi.fetchStudentAttempts).mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  describe("1. Real QuizPlayer start flow", () => {
    it("mounting QuizPlayer does NOT call startQuizAttemptRpc, renders QuizStartScreen", async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <QuizPlayer quizId="quiz-123" />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Cuestionario de Evaluación")).toBeTruthy();
      });

      expect(screen.getByText("Comenzar Cuestionario")).toBeTruthy();
      expect(quizApi.startQuizAttemptRpc).not.toHaveBeenCalled();
    });

    it("clicking 'Comenzar Cuestionario' calls startQuizAttemptRpc exactly once and prevents double click while pending", async () => {
      let resolveStart: (value: StartAttemptPayload) => void;
      const startPromise = new Promise<StartAttemptPayload>((resolve) => {
        resolveStart = resolve;
      });

      vi.mocked(quizApi.startQuizAttemptRpc).mockReturnValue(startPromise);

      render(
        <QueryClientProvider client={queryClient}>
          <QuizPlayer quizId="quiz-123" />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Comenzar Cuestionario")).toBeTruthy();
      });

      const startBtn = screen.getByRole("button", { name: /Comenzar Cuestionario/i });
      fireEvent.click(startBtn);
      fireEvent.click(startBtn);

      await waitFor(() => {
        expect(quizApi.startQuizAttemptRpc).toHaveBeenCalledTimes(1);
      });

      // Resolve the mutation
      resolveStart!({
        attempt: {
          id: "att-1",
          quiz_id: "quiz-123",
          user_id: "user-1",
          attempt_number: 1,
          status: "in_progress",
          started_at: new Date().toISOString(),
          score: 0,
          percentage: 0,
          passed: false,
          total_points: 20,
          earned_points: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        quiz: mockQuiz,
        questions: mockQuestions,
      });

      await waitFor(() => {
        expect(screen.getByText("Pregunta Uno")).toBeTruthy();
      });
    });

    it("rerender does NOT start another attempt", async () => {
      vi.mocked(quizApi.startQuizAttemptRpc).mockResolvedValue({
        attempt: {
          id: "att-1",
          quiz_id: "quiz-123",
          user_id: "user-1",
          attempt_number: 1,
          status: "in_progress",
          started_at: new Date().toISOString(),
          score: 0,
          percentage: 0,
          passed: false,
          total_points: 20,
          earned_points: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        quiz: mockQuiz,
        questions: mockQuestions,
      });

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <QuizPlayer quizId="quiz-123" />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Comenzar Cuestionario")).toBeTruthy();
      });

      fireEvent.click(screen.getByRole("button", { name: /Comenzar Cuestionario/i }));

      await waitFor(() => {
        expect(screen.getByText("Pregunta Uno")).toBeTruthy();
      });

      expect(quizApi.startQuizAttemptRpc).toHaveBeenCalledTimes(1);

      // Re-render
      rerender(
        <QueryClientProvider client={queryClient}>
          <QuizPlayer quizId="quiz-123" />
        </QueryClientProvider>,
      );

      expect(quizApi.startQuizAttemptRpc).toHaveBeenCalledTimes(1);
    });

    it("displays error on start failure and allows retrying controlled call", async () => {
      vi.mocked(quizApi.startQuizAttemptRpc)
        .mockRejectedValueOnce(new Error("Límite de intentos superado"))
        .mockResolvedValueOnce({
          attempt: {
            id: "att-2",
            quiz_id: "quiz-123",
            user_id: "user-1",
            attempt_number: 2,
            status: "in_progress",
            started_at: new Date().toISOString(),
            score: 0,
            percentage: 0,
            passed: false,
            total_points: 20,
            earned_points: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          quiz: mockQuiz,
          questions: mockQuestions,
        });

      render(
        <QueryClientProvider client={queryClient}>
          <QuizPlayer quizId="quiz-123" />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Comenzar Cuestionario")).toBeTruthy();
      });

      fireEvent.click(screen.getByRole("button", { name: /Comenzar Cuestionario/i }));

      await waitFor(() => {
        expect(quizApi.startQuizAttemptRpc).toHaveBeenCalledTimes(1);
      });

      // Click again after failure
      fireEvent.click(screen.getByRole("button", { name: /Comenzar Cuestionario/i }));

      await waitFor(() => {
        expect(quizApi.startQuizAttemptRpc).toHaveBeenCalledTimes(2);
        expect(screen.getByText("Pregunta Uno")).toBeTruthy();
      });
    });
  });

  describe("2. Resumption and state hydration", () => {
    it("hydrates saved_answers, selected options, question/answer order, and current_question_index", async () => {
      vi.mocked(quizApi.startQuizAttemptRpc).mockResolvedValue({
        attempt: {
          id: "att-resume",
          quiz_id: "quiz-123",
          user_id: "user-1",
          attempt_number: 1,
          status: "in_progress",
          started_at: new Date().toISOString(),
          score: 0,
          percentage: 0,
          passed: false,
          total_points: 20,
          earned_points: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        quiz: mockQuiz,
        questions: mockQuestions,
        selected_answers: {
          "q-1": ["a-1"],
          "q-2": ["a-4"],
        },
        current_question_index: 1,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <QuizPlayer quizId="quiz-123" />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Comenzar Cuestionario")).toBeTruthy();
      });

      fireEvent.click(screen.getByRole("button", { name: /Comenzar Cuestionario/i }));

      // Should recover current_question_index = 1 -> Pregunta Dos
      await waitFor(() => {
        expect(screen.getByText("Pregunta Dos")).toBeTruthy();
      });

      // Go back to Pregunta Uno to check option a-1 is selected
      const prevBtn = screen.getByRole("button", { name: /Anterior/i });
      fireEvent.click(prevBtn);

      await waitFor(() => {
        expect(screen.getByText("Pregunta Uno")).toBeTruthy();
      });

      const optionA1Card = screen.getByTestId("answer-option-a-1");
      expect(optionA1Card.className).toContain("border-primary");
    });
  });

  describe("3. Quiz Expiration behavior", () => {
    it("handles expired submit gracefully without approving quiz or calling onComplete with passed true", async () => {
      const onCompleteMock = vi.fn();

      vi.mocked(quizApi.startQuizAttemptRpc).mockResolvedValue({
        attempt: {
          id: "att-exp",
          quiz_id: "quiz-123",
          user_id: "user-1",
          attempt_number: 1,
          status: "in_progress",
          started_at: new Date().toISOString(),
          score: 0,
          percentage: 0,
          passed: false,
          total_points: 20,
          earned_points: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        quiz: mockQuiz,
        questions: mockQuestions,
      });

      const expiredResult: SubmitAttemptResult = {
        success: false,
        status: "expired",
        reason: "El tiempo límite de 20 minutos ha expirado.",
        attempt_id: "att-exp",
        passed: false,
        score: 0,
        percentage: 0,
        earned_points: 0,
        total_points: 20,
        passing_score: 80,
        show_correct_answers: false,
        show_explanations: false,
        details: [],
      };

      vi.mocked(quizApi.submitQuizAttemptRpc).mockResolvedValue(expiredResult);

      render(
        <QueryClientProvider client={queryClient}>
          <QuizPlayer quizId="quiz-123" onComplete={onCompleteMock} />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Comenzar Cuestionario")).toBeTruthy();
      });

      fireEvent.click(screen.getByRole("button", { name: /Comenzar Cuestionario/i }));

      await waitFor(() => {
        expect(screen.getByText("Pregunta Uno")).toBeTruthy();
      });

      // Go to next question (Pregunta Dos)
      const nextBtn = screen.getByRole("button", { name: /Siguiente/i });
      fireEvent.click(nextBtn);

      await waitFor(() => {
        expect(screen.getByText("Pregunta Dos")).toBeTruthy();
      });

      // Click Entregar Cuestionario
      const submitModalTrigger = screen.getByRole("button", { name: /Entregar Cuestionario/i });
      fireEvent.click(submitModalTrigger);

      await waitFor(() => {
        expect(screen.getByText("Confirmar y Enviar")).toBeTruthy();
      });

      const confirmBtn = screen.getByRole("button", { name: "Confirmar y Enviar" });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText("Tiempo Agotado")).toBeTruthy();
        expect(screen.queryByText("¡Cuestionario Aprobado!")).toBeNull();
      });

      expect(onCompleteMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "expired",
          passed: false,
        }),
      );
      expect(onCompleteMock).not.toHaveBeenCalledWith(
        expect.objectContaining({
          passed: true,
        }),
      );
    });

    it("displays controlled error when saveQuizAnswerRpc returns expired status", async () => {
      vi.mocked(quizApi.startQuizAttemptRpc).mockResolvedValue({
        attempt: {
          id: "att-exp-save",
          quiz_id: "quiz-123",
          user_id: "user-1",
          attempt_number: 1,
          status: "in_progress",
          started_at: new Date().toISOString(),
          score: 0,
          percentage: 0,
          passed: false,
          total_points: 20,
          earned_points: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        quiz: mockQuiz,
        questions: mockQuestions,
      });

      vi.mocked(quizApi.saveQuizAnswerRpc).mockResolvedValue({
        success: false,
        status: "expired",
        reason: "El tiempo del cuestionario ha expirado.",
      });

      render(
        <QueryClientProvider client={queryClient}>
          <QuizPlayer quizId="quiz-123" />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText("Comenzar Cuestionario")).toBeTruthy();
      });

      fireEvent.click(screen.getByRole("button", { name: /Comenzar Cuestionario/i }));

      await waitFor(() => {
        expect(screen.getByText("Pregunta Uno")).toBeTruthy();
      });

      const optionA1Card = screen.getByTestId("answer-option-a-1");
      fireEvent.click(optionA1Card);

      await waitFor(() => {
        expect(screen.getByText(/El tiempo del cuestionario ha expirado/i)).toBeTruthy();
      });
    });
  });
});
