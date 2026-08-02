import React from "react";
import { QuestionType, QuizAnswer } from "@/lib/quiz/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface QuizAnswerEditorProps {
  questionType: QuestionType;
  answers: Partial<QuizAnswer>[];
  onAnswersChange: (answers: Partial<QuizAnswer>[]) => void;
}

export function QuizAnswerEditor({
  questionType,
  answers,
  onAnswersChange,
}: QuizAnswerEditorProps) {
  const handleAddAnswer = () => {
    const newAnswers = [
      ...answers,
      { answer_text: `Opción ${answers.length + 1}`, is_correct: false, position: answers.length },
    ];
    onAnswersChange(newAnswers);
  };

  const handleRemoveAnswer = (index: number) => {
    if (answers.length <= 2 && questionType !== "true_false") {
      toast.error("Se requieren al menos 2 opciones.");
      return;
    }
    const filtered = answers.filter((_, i) => i !== index).map((a, i) => ({ ...a, position: i }));
    onAnswersChange(filtered);
  };

  const handleToggleCorrectSingle = (index: number) => {
    const updated = answers.map((a, i) => ({
      ...a,
      is_correct: i === index,
    }));
    onAnswersChange(updated);
  };

  const handleToggleCorrectMultiple = (index: number, checked: boolean) => {
    const updated = answers.map((a, i) => (i === index ? { ...a, is_correct: checked } : a));
    onAnswersChange(updated);
  };

  const handleAnswerTextChange = (index: number, text: string) => {
    const updated = [...answers];
    updated[index] = { ...updated[index], answer_text: text };
    onAnswersChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Opciones de Respuesta *</Label>
        {questionType !== "true_false" && (
          <Button type="button" variant="outline" size="sm" onClick={handleAddAnswer}>
            <Plus className="mr-1 size-3.5" /> Añadir Opción
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {questionType === "single_choice" || questionType === "true_false" ? (
          <RadioGroup
            value={answers.findIndex((a) => a.is_correct).toString()}
            onValueChange={(val) => handleToggleCorrectSingle(parseInt(val, 10))}
            className="space-y-2"
          >
            {answers.map((ans, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-lg border p-2.5">
                <RadioGroupItem value={idx.toString()} id={`ans-radio-${idx}`} />
                <Input
                  value={ans.answer_text || ""}
                  disabled={questionType === "true_false"}
                  onChange={(e) => handleAnswerTextChange(idx, e.target.value)}
                  placeholder={`Respuesta ${idx + 1}`}
                  className="flex-1"
                />
                {questionType !== "true_false" && answers.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveAnswer(idx)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </RadioGroup>
        ) : (
          <div className="space-y-2">
            {answers.map((ans, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-lg border p-2.5">
                <Checkbox
                  id={`ans-check-${idx}`}
                  checked={!!ans.is_correct}
                  onCheckedChange={(checked) => handleToggleCorrectMultiple(idx, !!checked)}
                />
                <Input
                  value={ans.answer_text || ""}
                  onChange={(e) => handleAnswerTextChange(idx, e.target.value)}
                  placeholder={`Respuesta ${idx + 1}`}
                  className="flex-1"
                />
                {answers.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveAnswer(idx)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
