// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuizProgress } from "../components/quiz-player/QuizProgress";
import { QuizQuestion } from "../components/quiz-player/QuizQuestion";
import { QuizSubmitDialog } from "../components/quiz-player/QuizSubmitDialog";
import { QuizResultView } from "../components/quiz-player/QuizResultView";
import { QuizAnswerOption } from "../components/quiz-player/QuizAnswerOption";
import { QuizQuestion as IQuizQuestion, SubmitAttemptResult } from "../lib/quiz/types";

describe("Sprint 2.6 - Interactive Quiz System Tests", () => {
  const sampleQuestion: IQuizQuestion = {
    id: "q-1",
    quiz_id: "quiz-1",
    type: "single_choice",
    question_text: "¿Qué es la Inteligencia Artificial Generativa?",
    points: 2,
    position: 0,
    answers: [
      {
        id: "a-1",
        question_id: "q-1",
        answer_text: "Modelos que generan nuevo contenido",
        is_correct: true,
        position: 0,
      },
      {
        id: "a-2",
        question_id: "q-1",
        answer_text: "Sistemas de bases de datos relacionales",
        is_correct: false,
        position: 1,
      },
    ],
  };

  it("1. Renders QuizProgress correctly with question buttons and percentage", () => {
    const onSelect = vi.fn();
    render(
      <QuizProgress
        totalQuestions={5}
        currentIndex={0}
        answeredQuestionIds={new Set(["q-1", "q-2"])}
        questionIds={["q-1", "q-2", "q-3", "q-4", "q-5"]}
        onSelectQuestion={onSelect}
      />,
    );

    expect(screen.getByText(/Progreso: 2 de 5 respondidas/i)).toBeTruthy();
    expect(screen.getByText("40%")).toBeTruthy();

    const btn3 = screen.getByRole("button", { name: /Ir a la pregunta 3/i });
    fireEvent.click(btn3);
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("2. Renders single choice question option list and handles selection", () => {
    const onChange = vi.fn();
    render(
      <QuizAnswerOption
        type="single_choice"
        answers={sampleQuestion.answers || []}
        selectedIds={[]}
        onChange={onChange}
      />,
    );

    expect(screen.getByText("Modelos que generan nuevo contenido")).toBeTruthy();
    expect(screen.getByText("Sistemas de bases de datos relacionales")).toBeTruthy();

    fireEvent.click(screen.getByText("Modelos que generan nuevo contenido"));
    expect(onChange).toHaveBeenCalledWith(["a-1"]);
  });

  it("3. Displays warning dialog when submitting with unanswered questions", () => {
    const onConfirm = vi.fn();
    render(
      <QuizSubmitDialog
        open={true}
        onOpenChange={vi.fn()}
        unansweredCount={3}
        totalQuestions={5}
        onConfirmSubmit={onConfirm}
      />,
    );

    expect(
      screen.getByText(/Atención: Te quedan 3 de 5 preguntas sin responder./i),
    ).toBeTruthy();

    const confirmBtn = screen.getByRole("button", { name: /Confirmar y Enviar/i });
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalled();
  });

  it("4. Displays final quiz results with passed status and score", () => {
    const result: SubmitAttemptResult = {
      success: true,
      attempt_id: "att-1",
      passed: true,
      score: 85,
      percentage: 85,
      earned_points: 17,
      total_points: 20,
      passing_score: 70,
      show_correct_answers: true,
      show_explanations: true,
      details: [
        {
          question_id: "q-1",
          question_text: "¿Qué es la Inteligencia Artificial Generativa?",
          type: "single_choice",
          points: 2,
          points_earned: 2,
          is_correct: true,
          explanation: "Los modelos generativos sintetizan texto, imágenes o código.",
          answers: [
            {
              id: "a-1",
              answer_text: "Modelos que generan nuevo contenido",
              position: 0,
              is_correct: true,
              selected: true,
            },
          ],
        },
      ],
    };

    render(<QuizResultView result={result} />);

    expect(screen.getByText("¡Cuestionario Aprobado!")).toBeTruthy();
    expect(screen.getByText("85%")).toBeTruthy();
    expect(
      screen.getByText("Obtuviste 17 de 20 puntos (Mínimo para aprobar: 70%)"),
    ).toBeTruthy();
    expect(
      screen.getByText("Los modelos generativos sintetizan texto, imágenes o código."),
    ).toBeTruthy();
  });
});
