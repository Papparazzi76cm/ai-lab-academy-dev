import React from "react";
import { QuizAnswer, QuestionType } from "@/lib/quiz/types";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface QuizAnswerOptionProps {
  type: QuestionType;
  answers: QuizAnswer[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
}

export function QuizAnswerOption({ type, answers, selectedIds, onChange }: QuizAnswerOptionProps) {
  if (type === "single_choice" || type === "true_false") {
    const selectedValue = selectedIds[0] || "";

    return (
      <fieldset className="space-y-3">
        <legend className="sr-only">Selecciona una opción de respuesta</legend>
        <RadioGroup
          value={selectedValue}
          onValueChange={(val) => onChange([val])}
          className="space-y-2.5"
        >
          {answers.map((ans) => {
            const isSelected = selectedValue === ans.id;
            return (
              <div
                key={ans.id}
                onClick={() => onChange([ans.id])}
                className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-lg border p-4 transition-all hover:border-primary/50 ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "bg-card hover:bg-secondary/40"
                }`}
              >
                <RadioGroupItem value={ans.id} id={`opt-${ans.id}`} className="size-5" />
                <Label
                  htmlFor={`opt-${ans.id}`}
                  className="flex-1 cursor-pointer text-sm font-medium leading-relaxed"
                >
                  {ans.answer_text}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </fieldset>
    );
  }

  // Multiple Choice
  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Selecciona una o varias opciones de respuesta</legend>
      <div className="space-y-2.5">
        {answers.map((ans) => {
          const isSelected = selectedIds.includes(ans.id);

          const handleToggle = () => {
            const next = isSelected
              ? selectedIds.filter((id) => id !== ans.id)
              : [...selectedIds, ans.id];
            onChange(next);
          };

          return (
            <div
              key={ans.id}
              onClick={handleToggle}
              className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-lg border p-4 transition-all hover:border-primary/50 ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "bg-card hover:bg-secondary/40"
              }`}
            >
              <Checkbox
                id={`opt-${ans.id}`}
                checked={isSelected}
                onCheckedChange={handleToggle}
                className="size-5"
              />
              <Label
                htmlFor={`opt-${ans.id}`}
                className="flex-1 cursor-pointer text-sm font-medium leading-relaxed"
              >
                {ans.answer_text}
              </Label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
