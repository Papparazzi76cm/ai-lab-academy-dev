import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Send, Eye, BarChart2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchQuizDetail,
  createQuiz,
  updateQuiz,
  saveQuestionWithAnswers,
  deleteQuestion,
  publishQuizRpc,
} from "@/lib/quiz/api";
import { QuizSettings } from "./QuizSettings";
import { QuestionList } from "./QuestionList";
import { QuizPreviewModal } from "./QuizPreviewModal";
import { QuizQuestionFormValues, QuizSettingsFormValues, QuizQuestion } from "@/lib/quiz/types";

export function QuizEditor({ quizId }: { quizId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = quizId === "new";

  const [activeTab, setActiveTab] = useState<string>("settings");
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["quiz-detail", quizId],
    queryFn: () => fetchQuizDetail(quizId),
    enabled: !isNew,
  });

  const quiz = data?.quiz;
  const questions = data?.questions || [];

  const saveSettingsMutation = useMutation({
    mutationFn: async (values: QuizSettingsFormValues) => {
      if (isNew) {
        const created = await createQuiz(values);
        return created;
      } else {
        const updated = await updateQuiz(quizId, values);
        return updated;
      }
    },
    onSuccess: (savedQuiz) => {
      toast.success("Configuración del cuestionario guardada");
      queryClient.invalidateQueries({ queryKey: ["quiz-detail", savedQuiz.id] });
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      if (isNew) {
        navigate({ to: "/admin/quizzes/$quizId", params: { quizId: savedQuiz.id } });
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveQuestionMutation = useMutation({
    mutationFn: (qData: QuizQuestionFormValues) => saveQuestionWithAnswers(quizId, qData),
    onSuccess: () => {
      toast.success("Pregunta guardada");
      queryClient.invalidateQueries({ queryKey: ["quiz-detail", quizId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (qId: string) => deleteQuestion(qId),
    onSuccess: () => {
      toast.success("Pregunta eliminada");
      queryClient.invalidateQueries({ queryKey: ["quiz-detail", quizId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reorderQuestionsMutation = useMutation({
    mutationFn: async (reordered: QuizQuestion[]) => {
      for (const q of reordered) {
        await saveQuestionWithAnswers(quizId, {
          id: q.id,
          type: q.type,
          question_text: q.question_text,
          explanation: q.explanation || "",
          points: q.points,
          position: q.position,
          answers: q.answers || [],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-detail", quizId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishQuizRpc(quizId),
    onSuccess: (res) => {
      toast.success(`¡Cuestionario publicado exitosamente! Total: ${res.total_points} puntos.`);
      queryClient.invalidateQueries({ queryKey: ["quiz-detail", quizId] });
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!isNew && isLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Cargando cuestionario...
      </div>
    );
  }

  if (!isNew && error) {
    return (
      <div className="py-12 text-center text-sm text-destructive">
        Error al cargar el cuestionario: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/quizzes">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">
                {quiz?.title || "Nuevo Cuestionario"}
              </h2>
              {quiz && (
                <Badge variant={quiz.status === "published" ? "default" : "secondary"}>
                  {quiz.status === "published"
                    ? "Publicado"
                    : quiz.status === "archived"
                      ? "Archivado"
                      : "Borrador"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isNew ? "Configura los campos iniciales del cuestionario." : `ID: ${quizId}`}
            </p>
          </div>
        </div>

        {!isNew && quiz && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
              <Eye className="mr-1.5 size-4" /> Vista Previa
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/quizzes/$quizId/results" params={{ quizId }}>
                <BarChart2 className="mr-1.5 size-4" /> Resultados
              </Link>
            </Button>
            <Button
              size="sm"
              disabled={publishMutation.isPending || quiz.status === "published"}
              onClick={() => publishMutation.mutate()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              id="publish-quiz-btn"
            >
              <Send className="mr-1.5 size-4" />
              {quiz.status === "published"
                ? "Publicado"
                : publishMutation.isPending
                  ? "Publicando..."
                  : "Publicar"}
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="settings">1. Configuración</TabsTrigger>
          <TabsTrigger value="questions" disabled={isNew}>
            2. Preguntas ({questions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <QuizSettings
            quiz={quiz}
            onSave={async (vals) => {
              await saveSettingsMutation.mutateAsync(vals);
            }}
            isSaving={saveSettingsMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <QuestionList
            questions={questions}
            onSaveQuestion={(qVals) => saveQuestionMutation.mutate(qVals)}
            onDeleteQuestion={(qId) => deleteQuestionMutation.mutate(qId)}
            onReorderQuestions={(reordered) => reorderQuestionsMutation.mutate(reordered)}
          />
        </TabsContent>
      </Tabs>

      {quiz && (
        <QuizPreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          quiz={quiz}
          questions={questions}
        />
      )}
    </div>
  );
}
