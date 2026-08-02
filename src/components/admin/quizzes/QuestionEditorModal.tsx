import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  QuizQuestionSchema,
  QuizQuestionFormValues,
  QuestionType,
  QuizQuestion,
} from "@/lib/quiz/types";
import { QuizAnswerEditor } from "./QuizAnswerEditor";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

          {errors.answers && <p className="text-xs text-destructive">{errors.answers.message}</p>}

          <QuizAnswerEditor
            questionType={questionType}
            answers={answers}
            onAnswersChange={(newAnswers) => setValue("answers", newAnswers)}
          />

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
