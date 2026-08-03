import React, { useState } from "react";
import { Sparkles, Bot, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { AuthoringBlock } from "@/lib/authoring/types";
import { useLessonGeneration } from "@/hooks/useLessonGeneration";
import { GenerationForm } from "./GenerationForm";
import { GenerationProgress } from "./GenerationProgress";
import { GenerationResult } from "./GenerationResult";

interface GenerateLessonDialogProps {
  lessonId: string;
  lessonTitle?: string;
  courseTitle?: string;
  moduleTitle?: string;
  onAcceptBlocks: (blocks: AuthoringBlock[]) => Promise<void>;
  triggerButton?: React.ReactNode;
}

export function GenerateLessonDialog({
  lessonId,
  lessonTitle = "Nueva Lección",
  courseTitle,
  moduleTitle,
  onAcceptBlocks,
  triggerButton,
}: GenerateLessonDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    step,
    setStep,
    prompt,
    setPrompt,
    level,
    setLevel,
    duration,
    setDuration,
    language,
    setLanguage,
    tone,
    setTone,
    audience,
    setAudience,
    objectivesText,
    setObjectivesText,
    provider,
    model,
    setModel,
    temperature,
    setTemperature,
    progressStep,
    progressValue,
    currentPlan,
    result,
    generatedBlocks,
    errorMsg,
    isSaving,
    handleProviderChange,
    handleStartGeneration,
    handleCancelGeneration,
    handleAcceptAndSave,
  } = useLessonGeneration({
    lessonId,
    lessonTitle,
    courseTitle,
    moduleTitle,
    onAcceptBlocks,
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button
            variant="default"
            className="gap-2 bg-gradient-to-r from-primary via-indigo-600 to-purple-600 text-primary-foreground shadow-md transition-all hover:brightness-110"
          >
            <Sparkles className="size-4 animate-pulse" />
            <span>Generar lección con IA</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 sm:rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bot className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                Agente de Autoría IA
                <Badge variant="outline" className="text-xs font-mono">
                  Sprint 2.9
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Genera lecciones completas estructuradas en el Authoring Studio
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Error de Generación</AlertTitle>
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          {step === "form" && (
            <GenerationForm
              prompt={prompt}
              setPrompt={setPrompt}
              level={level}
              setLevel={setLevel}
              duration={duration}
              setDuration={setDuration}
              language={language}
              setLanguage={setLanguage}
              tone={tone}
              setTone={setTone}
              audience={audience}
              setAudience={setAudience}
              objectivesText={objectivesText}
              setObjectivesText={setObjectivesText}
              provider={provider}
              model={model}
              setModel={setModel}
              temperature={temperature}
              setTemperature={setTemperature}
              onProviderChange={handleProviderChange}
            />
          )}

          {step === "generating" && (
            <GenerationProgress
              progressStep={progressStep}
              progressValue={progressValue}
              currentPlan={currentPlan}
              onCancel={handleCancelGeneration}
            />
          )}

          {step === "result" && result && (
            <GenerationResult
              lessonId={lessonId}
              result={result}
              generatedBlocks={generatedBlocks}
            />
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          {step === "result" ? (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("form")}
                disabled={isSaving}
                className="gap-2"
              >
                <RefreshCw className="size-4" />
                <span>Re-generar</span>
              </Button>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isSaving}>
                  Descartar
                </Button>
                <Button
                  onClick={() => handleAcceptAndSave(() => setIsOpen(false))}
                  disabled={isSaving}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="size-4" />
                  <span>{isSaving ? "Guardando..." : "Aceptar e Insertar Lección"}</span>
                </Button>
              </div>
            </>
          ) : (
            <div className="flex justify-end w-full gap-2">
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleStartGeneration}
                disabled={step === "generating" || !prompt.trim()}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Sparkles className="size-4" />
                <span>Generar Lección</span>
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
