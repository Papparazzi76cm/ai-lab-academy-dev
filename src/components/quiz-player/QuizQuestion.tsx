import React from "react";
import { QuizQuestion as IQuizQuestion, StudentQuizQuestion } from "@/lib/quiz/types";
import { Badge } from "@/components/ui/badge";
import { QuizAnswerOption } from "./QuizAnswerOption";

interface QuizQuestionProps {
  question: IQuizQuestion | StudentQuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswerIds: string[];
  onAnswerChange: (selectedIds: string[]) => void;
}

export function QuizQuestion({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswerIds,
  onAnswerChange,
}: QuizQuestionProps) {
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "single_choice":
        return <Badge variant="outline">Selección Única</Badge>;
      case "multiple_choice":
        return <Badge variant="outline">Opción Múltiple</Badge>;
      case "true_false":
        return <Badge variant="outline">Verdadero / Falso</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">
              Pregunta {questionNumber} de {totalQuestions}
            </span>
            {getTypeBadge(question.type)}
          </div>
          <span className="font-semibold text-primary">
            {question.points} Punto{question.points > 1 ? "s" : ""}
          </span>
        </div>
        <h3 className="text-lg font-bold tracking-tight text-foreground leading-snug">
          {question.question_text}
        </h3>
      </div>

      <QuizAnswerOption
        type={question.type}
        answers={question.answers || []}
        selectedIds={selectedAnswerIds}
        onChange={onAnswerChange}
      />
    </div>
  );
}
