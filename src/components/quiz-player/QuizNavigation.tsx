import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";

interface QuizNavigationProps {
  currentIndex: number;
  totalQuestions: number;
  onPrevious: () => void;
  onNext: () => void;
  onSubmitOpen: () => void;
}

export function QuizNavigation({
  currentIndex,
  totalQuestions,
  onPrevious,
  onNext,
  onSubmitOpen,
}: QuizNavigationProps) {
  const isLastQuestion = currentIndex >= totalQuestions - 1;

  return (
    <div className="flex items-center justify-between border-t pt-4">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={currentIndex === 0}
        id="prev-question-btn"
      >
        <ChevronLeft className="mr-1 size-4" /> Anterior
      </Button>

      <div className="flex items-center gap-2">
        {!isLastQuestion ? (
          <Button onClick={onNext} id="next-question-btn">
            Siguiente <ChevronRight className="ml-1 size-4" />
          </Button>
        ) : (
          <Button
            onClick={onSubmitOpen}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            id="submit-quiz-btn"
          >
            <Send className="mr-1.5 size-4" /> Entregar Cuestionario
          </Button>
        )}
      </div>
    </div>
  );
}
