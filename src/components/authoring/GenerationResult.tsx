import React from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GenerationTelemetryHeader, GenerationTelemetryTab } from "./GenerationTelemetry";
import { GenerationPreview } from "./GenerationPreview";
import type { GenerationResult as GenerationResultType } from "@/lib/ai/types";
import type { AuthoringBlock } from "@/lib/authoring/types";

interface GenerationResultProps {
  lessonId: string;
  result: GenerationResultType;
  generatedBlocks: AuthoringBlock[];
}

export function GenerationResult({ lessonId, result, generatedBlocks }: GenerationResultProps) {
  return (
    <div className="space-y-6">
      <GenerationTelemetryHeader telemetry={result.telemetry} />

      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preview">Vista Previa de Lección</TabsTrigger>
          <TabsTrigger value="plan">Plan Pedagógico</TabsTrigger>
          <TabsTrigger value="telemetry">Detalles & Reparo</TabsTrigger>
        </TabsList>

        <TabsContent value="preview">
          <GenerationPreview
            lessonId={lessonId}
            lessonTitle={result.plan.title}
            generatedBlocks={generatedBlocks}
          />
        </TabsContent>

        <TabsContent value="plan" className="space-y-4 pt-4">
          <div className="rounded-xl border border-border p-4 space-y-4 bg-card">
            <h3 className="text-lg font-bold text-foreground">{result.plan.title}</h3>
            <div className="flex gap-2">
              <Badge>{result.plan.level}</Badge>
              <Badge variant="outline">{result.plan.estimatedDurationMinutes} min</Badge>
              <Badge variant="secondary">{result.blocks.length} Bloques generados</Badge>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Objetivos:</h4>
              <ul className="list-disc pl-5 text-sm space-y-1 text-foreground">
                {result.plan.objectives.map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                Estructura por Secciones:
              </h4>
              {result.plan.sections.map((sec, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-1"
                >
                  <div className="font-medium text-sm flex items-center gap-2">
                    <ChevronRight className="size-4 text-primary" />
                    <span>{sec.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">{sec.purpose}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="telemetry" className="pt-4">
          <GenerationTelemetryTab result={result} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
