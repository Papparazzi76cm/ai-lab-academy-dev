import React, { useState } from "react";
import { QuizQuestion, QuizQuestionFormValues } from "@/lib/quiz/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, GripVertical, Edit, Copy, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { QuestionEditorModal } from "./QuestionEditorModal";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface QuestionListProps {
  questions: QuizQuestion[];
  onSaveQuestion: (question: QuizQuestionFormValues) => void;
  onDeleteQuestion: (questionId: string) => void;
  onReorderQuestions: (questions: QuizQuestion[]) => void;
}

function SortableQuestionItem({
  question,
  index,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  question: QuizQuestion;
  index: number;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "single_choice":
        return "Selección Única";
      case "multiple_choice":
        return "Opción Múltiple";
      case "true_false":
        return "Verdadero / Falso";
      default:
        return type;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            className="mt-1 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-5" />
          </button>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>
              <Badge variant="outline">{getTypeLabel(question.type)}</Badge>
              <Badge variant="secondary">
                {question.points} pt{question.points > 1 ? "s" : ""}
              </Badge>
            </div>
            <h4 className="text-sm font-semibold text-foreground">{question.question_text}</h4>
            {question.answers && (
              <p className="text-xs text-muted-foreground">
                {question.answers.length} opciones (
                {question.answers.filter((a) => a.is_correct).length} correcta
                {question.answers.filter((a) => a.is_correct).length > 1 ? "s" : ""})
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={onEdit}>
            <Edit className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={onDuplicate}>
            <Copy className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function QuestionList({
  questions,
  onSaveQuestion,
  onDeleteQuestion,
  onReorderQuestions,
}: QuestionListProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<QuizQuestion | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);
      const reordered = arrayMove(questions, oldIndex, newIndex).map((q, idx) => ({
        ...q,
        position: idx,
      }));
      onReorderQuestions(reordered);
    }
  };

  const handleOpenAdd = () => {
    setSelectedQuestion(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (q: QuizQuestion) => {
    setSelectedQuestion(q);
    setModalOpen(true);
  };

  const handleDuplicate = (q: QuizQuestion) => {
    onSaveQuestion({
      type: q.type,
      question_text: `${q.question_text} (Copia)`,
      explanation: q.explanation || "",
      points: q.points,
      position: questions.length,
      answers: (q.answers || []).map((a, i) => ({
        answer_text: a.answer_text,
        is_correct: a.is_correct ?? false,
        position: i,
      })),
    });
  };

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Preguntas del Cuestionario
              <Badge variant="secondary" className="font-normal">
                {questions.length} pregunta{questions.length !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="outline" className="font-normal border-primary/40 text-primary">
                Total: {totalPoints} pt{totalPoints !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
            <CardDescription>
              Añade, edita y reordena las preguntas. Arrastra para cambiar su orden.
            </CardDescription>
          </div>
          <Button onClick={handleOpenAdd} id="add-question-btn">
            <Plus className="mr-2 size-4" /> Añadir Pregunta
          </Button>
        </CardHeader>

        <CardContent>
          {questions.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <AlertCircle className="mx-auto size-10 text-muted-foreground/60" />
              <h4 className="mt-3 text-sm font-semibold">Sin preguntas aún</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Haz clic en "Añadir Pregunta" para crear la primera pregunta del cuestionario.
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={questions.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <SortableQuestionItem
                      key={q.id}
                      question={q}
                      index={idx}
                      onEdit={() => handleOpenEdit(q)}
                      onDuplicate={() => handleDuplicate(q)}
                      onDelete={() => onDeleteQuestion(q.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <QuestionEditorModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        question={selectedQuestion}
        onSave={onSaveQuestion}
        nextPosition={questions.length}
      />
    </div>
  );
}
