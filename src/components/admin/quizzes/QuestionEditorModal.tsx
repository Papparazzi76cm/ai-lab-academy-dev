import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  QuizQuestionSchema,
  QuizQuestionFormValues,
  QuestionType,
  QuizQuestion,
} from "@/lib/quiz/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, HelpCircle } from "lucide-react";
import { toast } from "sonner";

interface QuestionEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question?: QuizQuestion | null;
  onSave: (question: QuizQuestionFormValues) => void;
  nextPosition: number;
}

export function QuestionEditorModal({
  open,
  onOpenChange,
  question,
  onSave,
  nextPosition,
}: QuestionEditorModalProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<QuizQuestionFormValues>({
    resolver: zodResolver(QuizQuestionSchema),
    defaultValues: {
      type: "single_choice",
      question_text: "",
      explanation: "",
      points: 1,
      position: nextPosition,
      answers: [
        { answer_text: "Opción 1", is_correct: true, position: 0 },
        { answer_text: "Opción 2", is_correct: false, position: 1 },
      ],
    },
  });

  const questionType = watch("type");
  const answers = watch("answers") || [];

  useEffect(() => {
    if (question) {
      reset({
        id: question.id,
        type: question.type,
        question_text: question.question_text,
        explanation: question.explanation || "",
        points: question.points || 1,
        position: question.position,
        answers:
          question.answers && question.answers.length > 0
            ? question.answers.map((a, i) => ({
                id: a.id,
                answer_text: a.answer_text,
                is_correct: a.is_correct ?? false,
                position: i,
              }))
            : [
                { answer_text: "Opción 1", is_correct: true, position: 0 },
                { answer_text: "Opción 2", is_correct: false, position: 1 },
              ],
      });
    } else {
      reset({
        type: "single_choice",
        question_text: "",
        explanation: "",
        points: 1,
        position: nextPosition,
        answers: [
          { answer_text: "Opción 1", is_correct: true, position: 0 },
          { answer_text: "Opción 2", is_correct: false, position: 1 },
        ],
      });
    }
  }, [question, open, reset, nextPosition]);

  const handleTypeChange = (newType: QuestionType) => {
    setValue("type", newType);
    if (newType === "true_false") {
      setValue("answers", [
        { answer_text: "Verdadero", is_correct: true, position: 0 },
        { answer_text: "Falso", is_correct: false, position: 1 },
      ]);
    } else if (answers.length < 2) {
      setValue("answers", [
        { answer_text: "Opción 1", is_correct: true, position: 0 },
        { answer_text: "Opción 2", is_correct: false, position: 1 },
      ]);
    }
  };

  const handleAddAnswer = () => {
    const newAnswers = [
      ...answers,
      { answer_text: `Opción ${answers.length + 1}`, is_correct: false, position: answers.length },
    ];
    setValue("answers", newAnswers);
  };

  const handleRemoveAnswer = (index: number) => {
    if (answers.length <= 2 && questionType !== "true_false") {
      toast.error("Se requieren al menos 2 opciones.");
      return;
    }
    const filtered = answers.filter((_, i) => i !== index).map((a, i) => ({ ...a, position: i }));
    setValue("answers", filtered);
  };

  const handleToggleCorrectSingle = (index: number) => {
    const updated = answers.map((a, i) => ({
      ...a,
      is_correct: i === index,
    }));
    setValue("answers", updated);
  };

  const handleToggleCorrectMultiple = (index: number, checked: boolean) => {
    const updated = answers.map((a, i) => (i === index ? { ...a, is_correct: checked } : a));
    setValue("answers", updated);
  };

  const handleAnswerTextChange = (index: number, text: string) => {
    const updated = [...answers];
    updated[index].answer_text = text;
    setValue("answers", updated);
  };

  const onSubmit = (values: QuizQuestionFormValues) => {
    onSave(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{question ? "Editar Pregunta" : "Nueva Pregunta"}</DialogTitle>
          <DialogDescription>
            Configura el enunciado, opciones y la respuesta correcta.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <Label>Tipo de Pregunta</Label>
              <Select
                value={questionType}
                onValueChange={(val) => handleTypeChange(val as QuestionType)}
              >
                <SelectTrigger id="question-type-trigger">
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_choice">Selección Única</SelectItem>
                  <SelectItem value="multiple_choice">Opción Múltiple</SelectItem>
                  <SelectItem value="true_false">Verdadero / Falso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="points">Puntos *</Label>
              <Input
                id="points"
                type="number"
                min={1}
                {...register("points", { valueAsNumber: true })}
              />
              {errors.points && <p className="text-xs text-destructive">{errors.points.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="question_text">Enunciado de la Pregunta *</Label>
            <Textarea
              id="question_text"
              {...register("question_text")}
              placeholder="Escribe la pregunta aquí..."
              rows={3}
            />
            {errors.question_text && (
              <p className="text-xs text-destructive">{errors.question_text.message}</p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Opciones de Respuesta *</Label>
              {questionType !== "true_false" && (
                <Button type="button" variant="outline" size="sm" onClick={handleAddAnswer}>
                  <Plus className="mr-1 size-3.5" /> Añadir Opción
                </Button>
              )}
            </div>

            {errors.answers && <p className="text-xs text-destructive">{errors.answers.message}</p>}

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
                        value={ans.answer_text}
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
                        checked={ans.is_correct}
                        onCheckedChange={(checked) => handleToggleCorrectMultiple(idx, !!checked)}
                      />
                      <Input
                        value={ans.answer_text}
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

          <div className="space-y-2">
            <Label htmlFor="explanation">Explicación / Retroalimentación (Opcional)</Label>
            <Textarea
              id="explanation"
              {...register("explanation")}
              placeholder="Explicación técnica que se mostrará al alumno tras corregir..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" id="save-question-submit-btn">
              {question ? "Guardar Cambios" : "Añadir Pregunta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
