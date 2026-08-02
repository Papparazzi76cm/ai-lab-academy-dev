// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QuizProgress } from "../components/quiz-player/QuizProgress";
import { QuizQuestion } from "../components/quiz-player/QuizQuestion";
import { QuizSubmitDialog } from "../components/quiz-player/QuizSubmitDialog";
import { QuizResultView } from "../components/quiz-player/QuizResultView";
import { QuizAnswerOption } from "../components/quiz-player/QuizAnswerOption";
import { QuizStartScreen } from "../components/quiz-player/QuizStartScreen";
import {
  StudentQuizQuestion,
  StudentQuizAnswer,
  AdminQuizAnswer,
  SubmitAttemptResult,
  Quiz,
  QuestionResultDetail,
} from "../lib/quiz/types";

describe("Sprint 2.6 - Interactive Quiz System & Type Safety Tests", () => {
  afterEach(() => {
    cleanup();
  });

  it("0. Compile-time & runtime type assertions for Quiz Types", () => {
    // 1. StudentQuizAnswer does not contain is_correct
    const studentAns: StudentQuizAnswer = {
      id: "sa-1",
      question_id: "q-1",
      answer_text: "Opción Alumno",
      position: 0,
    };
    expect((studentAns as Record<string, unknown>).is_correct).toBeUndefined();

    // 2. StudentQuizQuestion does not contain explanation
    const studentQ: StudentQuizQuestion = {
      id: "sq-1",
      quiz_id: "quiz-1",
      type: "single_choice",
      question_text: "Pregunta Alumno",
      points: 1,
      position: 0,
      answers: [studentAns],
    };
    expect((studentQ as Record<string, unknown>).explanation).toBeUndefined();

    // 3. AdminQuizAnswer accepts is_correct
    const adminAns: AdminQuizAnswer = {
      id: "aa-1",
      question_id: "q-1",
      answer_text: "Opción Admin",
      is_correct: true,
      position: 0,
    };
    expect(adminAns.is_correct).toBe(true);

    // 4. QuestionResultDetail answers accepts is_correct as optional
    const detailAns: QuestionResultDetail["answers"][number] = {
      id: "da-1",
      answer_text: "Opción Resultado",
      position: 0,
      selected: true,
      is_correct: true,
    };
    expect(detailAns.is_correct).toBe(true);

    const detailAnsNoCorrect: QuestionResultDetail["answers"][number] = {
      id: "da-2",
      answer_text: "Opción Sin Corregir",
      position: 1,
      selected: false,
    };
    expect(detailAnsNoCorrect.is_correct).toBeUndefined();
  });
  const sampleQuiz: Quiz = {
    id: "quiz-1",
    course_id: "course-1",
    title: "Evaluación de IA Generativa",
    description: "Pon a prueba tus conocimientos sobre LLMs y Prompts.",
    status: "published",
    passing_score: 70,
    max_attempts: 3,
    time_limit_minutes: 15,
    shuffle_questions: false,
    shuffle_answers: false,
    show_correct_answers: true,
    show_explanations: true,
    required_for_completion: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const sampleStudentQuestion: StudentQuizQuestion = {
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
        position: 0,
      },
      {
        id: "a-2",
        question_id: "q-1",
        answer_text: "Sistemas de bases de datos relacionales",
        position: 1,
      },
    ],
  };

  it("1. Renders pre-start screen and does NOT auto-start until button click", () => {
    const onStart = vi.fn();
    render(
      <QuizStartScreen
        quiz={sampleQuiz}
        questionsCount={5}
        completedAttemptsCount={0}
        onStart={onStart}
      />,
    );

    expect(screen.getByText("Evaluación de IA Generativa")).toBeTruthy();
    expect(screen.getByText("70%")).toBeTruthy();
    expect(screen.getByText("15 min")).toBeTruthy();
    expect(screen.getByText("Comenzar Cuestionario")).toBeTruthy();
    expect(onStart).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Comenzar Cuestionario"));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("2. Student question view strictly hides correct answer flags before submission", () => {
    render(
      <QuizQuestion
        question={sampleStudentQuestion}
        questionNumber={1}
        totalQuestions={1}
        selectedAnswerIds={[]}
        onAnswerChange={vi.fn()}
      />,
    );

    expect(screen.getByText("¿Qué es la Inteligencia Artificial Generativa?")).toBeTruthy();
    expect(screen.queryByText("Correcta")).toBeNull();
    expect(screen.queryByText("is_correct")).toBeNull();
  });

  it("3. QuizProgress renders progress counter and percentage correctly", () => {
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

  it("4. Renders single choice question option list and handles selection", () => {
    const onChange = vi.fn();
    render(
      <QuizAnswerOption
        type="single_choice"
        answers={sampleStudentQuestion.answers}
        selectedIds={[]}
        onChange={onChange}
      />,
    );

    expect(screen.getByText("Modelos que generan nuevo contenido")).toBeTruthy();
    expect(screen.getByText("Sistemas de bases de datos relacionales")).toBeTruthy();

    const optionCard = screen.getByTestId("answer-option-a-1");
    fireEvent.click(optionCard);
    expect(onChange).toHaveBeenCalledWith(["a-1"]);
  });

  it("5. Displays warning dialog when submitting with unanswered questions", () => {
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

    expect(screen.getByText(/Atención: Te quedan 3 de 5 preguntas sin responder./i)).toBeTruthy();

    const confirmBtn = screen.getByRole("button", { name: /Confirmar y Enviar/i });
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalled();
  });

  it("6. Displays final quiz results with passed status and score", () => {
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
    expect(screen.getByText("Obtuviste 17 de 20 puntos (Mínimo para aprobar: 70%)")).toBeTruthy();
    expect(
      screen.getByText("Los modelos generativos sintetizan texto, imágenes o código."),
    ).toBeTruthy();
  });

  it("7. Displays failed result screen when score is below passing score", () => {
    const failedResult: SubmitAttemptResult = {
      success: true,
      attempt_id: "att-2",
      passed: false,
      score: 40,
      percentage: 40,
      earned_points: 8,
      total_points: 20,
      passing_score: 70,
      show_correct_answers: true,
      show_explanations: true,
      details: [],
    };

    render(<QuizResultView result={failedResult} />);

    expect(screen.getByText("Cuestionario No Aprobado")).toBeTruthy();
    expect(screen.getAllByText("40%")[0]).toBeTruthy();
    expect(screen.getByText("Obtuviste 8 de 20 puntos (Mínimo para aprobar: 70%)")).toBeTruthy();
  });
});
