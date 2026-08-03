import React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LessonEditor } from "@/lib/authoring/editor/LessonEditor";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuthoringBlock, BlockType, Visibility } from "@/lib/authoring/types";

export const Route = createFileRoute("/admin/authoring/$lessonId")({
  head: () => ({
    meta: [
      { title: "Authoring Studio — AI Lab Academy" },
      { name: "description", content: "Editor profesional de lecciones y bloques." },
    ],
  }),
  component: AuthoringStudioRoute,
});

function AuthoringStudioRoute() {
  const { lessonId } = Route.useParams();
  const navigate = useNavigate();

  const { data: lessonData, isLoading: isLessonLoading } = useQuery({
    queryKey: ["authoring-lesson", lessonId],
    queryFn: async () => {
      const { data: lesson, error: lErr } = await supabase
        .from("lessons")
        .select("id, title, course_id")
        .eq("id", lessonId)
        .single();

      if (lErr) throw lErr;

      const { data: blocks, error: bErr } = await supabase
        .from("lesson_blocks")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("position", { ascending: true });

      if (bErr) throw bErr;

      const mappedBlocks: AuthoringBlock[] = (blocks || []).map((b) => {
        const settings = (b.settings_json as Record<string, unknown>) || {};
        return {
          id: b.id,
          lesson_id: b.lesson_id,
          type: b.type as BlockType,
          position: b.position,
          visibility: (settings.visibility as Visibility) || "visible",
          content_json: (b.content_json as Record<string, unknown>) || {},
          settings_json: settings,
          created_at: b.created_at,
          updated_at: b.updated_at,
        };
      });

      return {
        lesson,
        blocks: mappedBlocks,
      };
    },
  });

  if (isLessonLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center p-8 bg-background">
        <div className="space-y-4 max-w-md w-full text-center">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <p className="text-xs text-muted-foreground">Cargando Authoring Studio...</p>
        </div>
      </div>
    );
  }

  if (!lessonData?.lesson) {
    return (
      <div className="h-screen w-full flex items-center justify-center p-8 bg-background text-center">
        <div>
          <p className="text-sm text-muted-foreground mb-4">No se encontró la lección indicada.</p>
          <button
            onClick={() => navigate({ to: "/admin/courses" })}
            className="text-xs font-semibold text-primary underline"
          >
            Volver a Cursos
          </button>
        </div>
      </div>
    );
  }

  return (
    <LessonEditor
      lessonId={lessonData.lesson.id}
      lessonTitle={lessonData.lesson.title}
      initialBlocks={lessonData.blocks}
      onBack={() => navigate({ to: `/admin/courses/${lessonData.lesson.course_id}` })}
    />
  );
}
