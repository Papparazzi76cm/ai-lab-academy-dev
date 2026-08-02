import React from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface QuizProgressProps {
  totalQuestions: number;
  currentIndex: number;
  answeredQuestionIds: Set<string>;
  questionIds: string[];
  onSelectQuestion: (index: number) => void;
}

export function QuizProgress({
  totalQuestions,
  currentIndex,
  answeredQuestionIds,
  questionIds,
  onSelectQuestion,
}: QuizProgressProps) {
  const answeredCount = answeredQuestionIds.size;
  const percentage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Progreso: {answeredCount} de {totalQuestions} respondidas
        </span>
        <span className="font-semibold">{percentage}%</span>
      </div>

      <Progress value={percentage} className="h-2" />

      <div className="flex flex-wrap gap-1.5 pt-1">
        {questionIds.map((qId, idx) => {
          const isAnswered = answeredQuestionIds.has(qId);
          const isCurrent = idx === currentIndex;

          return (
            <Button
              key={qId}
              type="button"
              variant={isCurrent ? "default" : isAnswered ? "secondary" : "outline"}
              size="sm"
              className={`size-8 p-0 text-xs font-semibold ${
                isCurrent
                  ? "ring-2 ring-primary ring-offset-2"
                  : isAnswered
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : ""
              }`}
              onClick={() => onSelectQuestion(idx)}
              aria-label={`Ir a la pregunta ${idx + 1}${isAnswered ? ", respondida" : ""}`}
            >
              {idx + 1}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
