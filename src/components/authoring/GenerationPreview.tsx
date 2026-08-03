import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LessonRenderer } from "@/components/lesson/LessonRenderer";
import type { AuthoringBlock } from "@/lib/authoring/types";
import type { LessonBlockItem } from "@/lib/blocks";

interface GenerationPreviewProps {
  lessonId: string;
  lessonTitle: string;
  generatedBlocks: AuthoringBlock[];
}

export function GenerationPreview({
  lessonId,
  lessonTitle,
  generatedBlocks,
}: GenerationPreviewProps) {
  const lessonBlocksForPreview: LessonBlockItem[] = generatedBlocks.map((b) => ({
    id: b.id,
    lesson_id: lessonId,
    type: (b.type === "embed" ? "video" : b.type) as LessonBlockItem["type"],
    position: b.position,
    content_json: b.content_json,
    settings_json: b.settings_json,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  return (
    <div className="space-y-4">
      <Alert className="bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100">
        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
        <AlertTitle className="text-xs font-semibold">Generación Completada</AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground mt-0.5">
          Esta es la vista previa interactiva con el diseño exacto que verán los estudiantes.
          Revisa el contenido antes de insertarlo en el editor.
        </AlertDescription>
      </Alert>

      <div className="border border-border rounded-xl p-6 sm:p-8 bg-card shadow-sm max-h-[450px] overflow-y-auto">
        <LessonRenderer
          lesson={{
            id: lessonId,
            title: lessonTitle,
            slug: lessonId,
          }}
          blocks={lessonBlocksForPreview}
        />
      </div>
    </div>
  );
}
