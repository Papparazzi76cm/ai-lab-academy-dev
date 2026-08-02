import React from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { QuizSettingsSchema, QuizSettingsFormValues, Quiz } from "@/lib/quiz/types";
import { QuizAssociationFields } from "./QuizAssociationFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface QuizSettingsProps {
  quiz?: Partial<Quiz> | undefined;
  onSave: (values: QuizSettingsFormValues) => Promise<void>;
  isSaving?: boolean;
}

export function QuizSettings({ quiz, onSave, isSaving }: QuizSettingsProps) {
  const { data: courses = [] } = useQuery({
    queryKey: ["courses-list-select"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, title").order("title");
      return data || [];
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<QuizSettingsFormValues>({
    resolver: zodResolver(QuizSettingsSchema) as unknown as Resolver<QuizSettingsFormValues>,
    defaultValues: {
      title: quiz?.title || "Nuevo Cuestionario",
      description: quiz?.description || "",
      course_id: quiz?.course_id || "",
      module_id: quiz?.module_id || null,
      lesson_id: quiz?.lesson_id || null,
      passing_score: quiz?.passing_score ?? 70,
      max_attempts: quiz?.max_attempts ?? null,
      time_limit_minutes: quiz?.time_limit_minutes ?? null,
      shuffle_questions: quiz?.shuffle_questions ?? false,
      shuffle_answers: quiz?.shuffle_answers ?? false,
      show_correct_answers: quiz?.show_correct_answers ?? true,
      show_explanations: quiz?.show_explanations ?? true,
      required_for_completion: quiz?.required_for_completion ?? false,
    },
  });

  const selectedCourseId = watch("course_id");

  const { data: modules = [] } = useQuery({
    queryKey: ["modules-list-select", selectedCourseId],
    enabled: !!selectedCourseId,
    queryFn: async () => {
      const { data } = await supabase
        .from("modules")
        .select("id, title")
        .eq("course_id", selectedCourseId)
        .order("position");
      return data || [];
    },
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons-list-select", selectedCourseId],
    enabled: !!selectedCourseId,
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select("id, title")
        .eq("course_id", selectedCourseId)
        .order("position");
      return data || [];
    },
  });

  return (
    <form onSubmit={handleSubmit((data) => onSave(data))} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración General</CardTitle>
          <CardDescription>
            Establece los datos principales y la asociación del cuestionario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título del Cuestionario *</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Ej: Evaluación de Fundamentos de IA"
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Instrucciones o resumen para los estudiantes..."
              rows={3}
            />
          </div>

          <QuizAssociationFields
            courses={courses}
            modules={modules}
            lessons={lessons}
            selectedCourseId={selectedCourseId}
            selectedModuleId={watch("module_id") ?? null}
            selectedLessonId={watch("lesson_id") ?? null}
            onSelectCourse={(courseId) => {
              setValue("course_id", courseId);
              setValue("module_id", null);
              setValue("lesson_id", null);
            }}
            onSelectModule={(modId) => setValue("module_id", modId)}
            onSelectLesson={(lesId) => setValue("lesson_id", lesId)}
            courseError={errors.course_id?.message}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reglas de Evaluación y Tiempo</CardTitle>
          <CardDescription>
            Criterios de aprobación, límites de intentos y temporizador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="passing_score">Nota Mínima de Aprobación (%) *</Label>
              <Input
                id="passing_score"
                type="number"
                min={0}
                max={100}
                {...register("passing_score", { valueAsNumber: true })}
              />
              {errors.passing_score && (
                <p className="text-xs text-destructive">{errors.passing_score.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_attempts">Máximo de Intentos (Vacío = Ilimitado)</Label>
              <Input
                id="max_attempts"
                type="number"
                min={1}
                placeholder="Ilimitado"
                value={watch("max_attempts") ?? ""}
                onChange={(e) =>
                  setValue("max_attempts", e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time_limit_minutes">
                Límite de Tiempo (Minutos, Vacío = Sin Límite)
              </Label>
              <Input
                id="time_limit_minutes"
                type="number"
                min={1}
                placeholder="Sin límite"
                value={watch("time_limit_minutes") ?? ""}
                onChange={(e) =>
                  setValue("time_limit_minutes", e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Preguntas Aleatorias</Label>
                <p className="text-xs text-muted-foreground">
                  Mezcla el orden de las preguntas para cada intento.
                </p>
              </div>
              <Switch
                checked={watch("shuffle_questions")}
                onCheckedChange={(val) => setValue("shuffle_questions", val)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Respuestas Aleatorias</Label>
                <p className="text-xs text-muted-foreground">
                  Mezcla las opciones dentro de cada pregunta.
                </p>
              </div>
              <Switch
                checked={watch("shuffle_answers")}
                onCheckedChange={(val) => setValue("shuffle_answers", val)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Mostrar Respuestas Correctas</Label>
                <p className="text-xs text-muted-foreground">
                  Muestra las correcciones al finalizar el intento.
                </p>
              </div>
              <Switch
                checked={watch("show_correct_answers")}
                onCheckedChange={(val) => setValue("show_correct_answers", val)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Mostrar Explicaciones</Label>
                <p className="text-xs text-muted-foreground">
                  Muestra la retroalimentación técnica al terminar.
                </p>
              </div>
              <Switch
                checked={watch("show_explanations")}
                onCheckedChange={(val) => setValue("show_explanations", val)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 mt-2">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Obligatorio para Completar la Lección / Módulo
              </Label>
              <p className="text-xs text-muted-foreground">
                Si está activado, el estudiante debe APROBAR el quiz para poder avanzar o marcar
                como completado.
              </p>
            </div>
            <Switch
              checked={watch("required_for_completion")}
              onCheckedChange={(val) => setValue("required_for_completion", val)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving} id="save-quiz-settings-btn">
          {isSaving ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </div>
    </form>
  );
}
