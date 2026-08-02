import React, { useState } from "react";
import { Quiz, QuizQuestion } from "@/lib/quiz/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";

interface QuizPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz: Quiz;
  questions: QuizQuestion[];
}

export function QuizPreviewModal({ open, onOpenChange, quiz, questions }: QuizPreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion = questions[currentIndex];

  const handleSelectSingle = (qId: string, answerId: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [qId]: [answerId] }));
  };

  const handleToggleMultiple = (qId: string, answerId: string) => {
    setSelectedAnswers((prev) => {
      const current = prev[qId] || [];
      const updated = current.includes(answerId)
        ? current.filter((id) => id !== answerId)
        : [...current, answerId];
      return { ...prev, [qId]: updated };
    });
  };

  const calculatePreviewScore = () => {
    let earned = 0;
    let total = 0;

    for (const q of questions) {
      total += q.points;
      const userSel = selectedAnswers[q.id] || [];
      const correctIds = (q.answers || []).filter((a) => a.is_correct).map((a) => a.id);

      if (q.type === "single_choice" || q.type === "true_false") {
        if (userSel.length === 1 && correctIds.length === 1 && userSel[0] === correctIds[0]) {
          earned += q.points;
        }
      } else if (q.type === "multiple_choice") {
        const setSel = new Set(userSel);
        const setCorr = new Set(correctIds);
        if (setSel.size === setCorr.size && [...setSel].every((id) => setCorr.has(id))) {
          earned += q.points;
        }
      }
    }

    const percentage = total > 0 ? Math.round((earned / total) * 100) : 0;
    const passed = percentage >= quiz.passing_score;
    return { earned, total, percentage, passed };
  };

  const scoreResult = submitted ? calculatePreviewScore() : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2">
              <EyeIcon className="size-5 text-primary" /> Vista Previa: {quiz.title}
            </DialogTitle>
            <Badge variant="secondary">Modo Simulación</Badge>
          </div>
        </DialogHeader>

        {questions.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No hay preguntas en este cuestionario para previsualizar.
          </div>
        ) : submitted && scoreResult ? (
          <div className="space-y-6 py-4">
            <div
              className={`rounded-lg border p-6 text-center ${scoreResult.passed ? "border-emerald-500/30 bg-emerald-500/10" : "border-destructive/30 bg-destructive/10"}`}
            >
              {scoreResult.passed ? (
                <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
              ) : (
                <XCircle className="mx-auto size-12 text-destructive" />
              )}
              <h3 className="mt-2 text-xl font-bold">
                {scoreResult.passed ? "¡Aprobado!" : "No Aprobado"}
              </h3>
              <p className="mt-1 text-2xl font-black">{scoreResult.percentage}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Puntos: {scoreResult.earned} / {scoreResult.total} (Nota mínima:{" "}
                {quiz.passing_score}%)
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Revisión de Respuestas:</h4>
              {questions.map((q, idx) => {
                const userSel = selectedAnswers[q.id] || [];
                const correctIds = (q.answers || []).filter((a) => a.is_correct).map((a) => a.id);
                const isCorrect =
                  q.type === "multiple_choice"
                    ? userSel.length === correctIds.length &&
                      userSel.every((id) => correctIds.includes(id))
                    : userSel.length === 1 && userSel[0] === correctIds[0];

                return (
                  <div key={q.id} className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <h5 className="font-medium text-sm">
                        #{idx + 1}. {q.question_text}
                      </h5>
                      <Badge variant={isCorrect ? "default" : "destructive"}>
                        {isCorrect ? `+${q.points} pts` : "0 pts"}
                      </Badge>
                    </div>

                    <div className="space-y-1 pl-2 border-l-2 border-border mt-2">
                      {(q.answers || []).map((ans) => {
                        const isSelected = userSel.includes(ans.id);
                        const isAnsCorrect = ans.is_correct;
                        return (
                          <div
                            key={ans.id}
                            className={`text-xs p-1.5 rounded flex items-center justify-between ${
                              isAnsCorrect
                                ? "bg-emerald-500/10 font-medium text-emerald-600"
                                : isSelected
                                  ? "bg-destructive/10 text-destructive"
                                  : "text-muted-foreground"
                            }`}
                          >
                            <span>{ans.answer_text}</span>
                            {isAnsCorrect && (
                              <span className="text-[10px] uppercase">Correcta</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded mt-2">
                        💡 {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSubmitted(false);
                  setCurrentIndex(0);
                  setSelectedAnswers({});
                }}
              >
                Reiniciar Simulación
              </Button>
            </div>
          </div>
        ) : !currentQuestion ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No hay preguntas en este cuestionario.
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground border-b pb-3">
              <span>
                Pregunta {currentIndex + 1} de {questions.length}
              </span>
              <span>
                {currentQuestion.points} Punto{currentQuestion.points > 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{currentQuestion.question_text}</h3>

              <div className="space-y-2 pt-2">
                {currentQuestion.type === "single_choice" ||
                currentQuestion.type === "true_false" ? (
                  <RadioGroup
                    value={(selectedAnswers[currentQuestion.id] || [])[0] || ""}
                    onValueChange={(val) => handleSelectSingle(currentQuestion.id, val)}
                    className="space-y-2"
                  >
                    {(currentQuestion.answers || []).map((ans) => (
                      <div
                        key={ans.id}
                        className="flex items-center gap-3 rounded-lg border p-3 hover:bg-secondary/50 cursor-pointer"
                        onClick={() => handleSelectSingle(currentQuestion.id, ans.id)}
                      >
                        <RadioGroupItem value={ans.id} id={`prev-ans-${ans.id}`} />
                        <Label
                          htmlFor={`prev-ans-${ans.id}`}
                          className="cursor-pointer flex-1 text-sm font-normal"
                        >
                          {ans.answer_text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="space-y-2">
                    {(currentQuestion.answers || []).map((ans) => {
                      const isChecked = (selectedAnswers[currentQuestion.id] || []).includes(
                        ans.id,
                      );
                      return (
                        <div
                          key={ans.id}
                          className="flex items-center gap-3 rounded-lg border p-3 hover:bg-secondary/50 cursor-pointer"
                          onClick={() => handleToggleMultiple(currentQuestion.id, ans.id)}
                        >
                          <Checkbox id={`prev-ans-${ans.id}`} checked={isChecked} />
                          <Label
                            htmlFor={`prev-ans-${ans.id}`}
                            className="cursor-pointer flex-1 text-sm font-normal"
                          >
                            {ans.answer_text}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <Button
                variant="outline"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => prev - 1)}
              >
                <ChevronLeft className="mr-1 size-4" /> Anterior
              </Button>

              {currentIndex < questions.length - 1 ? (
                <Button onClick={() => setCurrentIndex((prev) => prev + 1)}>
                  Siguiente <ChevronRight className="ml-1 size-4" />
                </Button>
              ) : (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setSubmitted(true)}
                >
                  Finalizar Simulación
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
