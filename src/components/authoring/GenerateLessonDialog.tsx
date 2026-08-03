import React, { useState, useRef } from "react";
import {
  Sparkles,
  Bot,
  Layers,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Coins,
  ShieldCheck,
  FileCode,
  Wand2,
  AlertTriangle,
  ChevronRight,
  BookOpen,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LessonAuthorAgent } from "@/lib/ai/agents/lessonAuthorAgent";
import type {
  AIProviderType,
  GenerationResult,
  LessonGenerationContext,
  LessonPlan,
} from "@/lib/ai/types";
import type { AuthoringBlock } from "@/lib/authoring/types";
import { LessonRenderer } from "@/components/lesson/LessonRenderer";
import type { LessonBlockItem } from "@/lib/blocks";

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
  const [step, setStep] = useState<"form" | "generating" | "result">("form");

  // Form State
  const [prompt, setPrompt] = useState("");
  const [level, setLevel] = useState("Intermedio");
  const [duration, setDuration] = useState(20);
  const [language, setLanguage] = useState("Español");
  const [tone, setTone] = useState("Práctico y Profesional");
  const [audience, setAudience] = useState("Estudiantes y Desarrolladores");
  const [objectivesText, setObjectivesText] = useState("");

  // AI Config State
  const [provider, setProvider] = useState<AIProviderType>("gemini");
  const [model, setModel] = useState("gemini-3.6-flash");
  const [temperature, setTemperature] = useState(0.7);

  // Generation State
  const [progressStep, setProgressStep] = useState<
    "planning" | "generating" | "validating" | "repairing" | "completed"
  >("planning");
  const [progressValue, setProgressValue] = useState(10);
  const [currentPlan, setCurrentPlan] = useState<LessonPlan | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [generatedBlocks, setGeneratedBlocks] = useState<AuthoringBlock[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleProviderChange = (val: AIProviderType) => {
    setProvider(val);
    if (val === "gemini") {
      setModel("gemini-3.6-flash");
    } else if (val === "openai") {
      setModel("gpt-4o");
    } else if (val === "anthropic") {
      setModel("claude-3-5-sonnet-20241022");
    }
  };

  const handleStartGeneration = async () => {
    if (!prompt.trim()) {
      setErrorMsg("Por favor, introduce un tema o prompt para la lección.");
      return;
    }

    setErrorMsg(null);
    setStep("generating");
    setProgressStep("planning");
    setProgressValue(20);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const context: LessonGenerationContext = {
      courseTitle,
      moduleTitle,
      lessonTitle,
      level,
      durationMinutes: Number(duration),
      language,
      tone,
      audience,
      objectives: objectivesText
        ? objectivesText.split("\n").filter((line) => line.trim().length > 0)
        : undefined,
    };

    const agent = new LessonAuthorAgent({
      provider,
      model,
      temperature: Number(temperature),
    });

    try {
      const genResult = await agent.generateLesson(
        lessonId,
        prompt,
        context,
        (progress, data) => {
          setProgressStep(progress);
          if (progress === "planning") setProgressValue(25);
          else if (progress === "generating") {
            setProgressValue(55);
            if (data?.plan) setCurrentPlan(data.plan);
          } else if (progress === "validating") setProgressValue(75);
          else if (progress === "repairing") setProgressValue(90);
          else if (progress === "completed") setProgressValue(100);
        },
        abortController.signal,
      );

      setResult(genResult);
      setGeneratedBlocks(genResult.blocks);
      setStep("result");
    } catch (err) {
      if (abortController.signal.aborted) {
        setErrorMsg("Generación cancelada por el usuario.");
      } else {
        setErrorMsg(
          err instanceof Error ? err.message : "Ocurrió un error inesperado al generar la lección.",
        );
      }
      setStep("form");
    }
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStep("form");
  };

  const handleAcceptAndSave = async () => {
    if (!generatedBlocks || generatedBlocks.length === 0) return;
    setIsSaving(true);
    try {
      await onAcceptBlocks(generatedBlocks);
      setIsOpen(false);
      resetState();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Error al guardar los bloques en la base de datos.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const resetState = () => {
    setStep("form");
    setPrompt("");
    setResult(null);
    setGeneratedBlocks([]);
    setCurrentPlan(null);
    setErrorMsg(null);
  };

  // Convert AuthoringBlocks to LessonBlockItem for LessonRenderer preview
  const lessonBlocksForPreview: LessonBlockItem[] = generatedBlocks.map((b) => ({
    id: b.id,
    lesson_id: lessonId,
    type: b.type,
    position: b.position,
    content_json: b.content_json,
    settings_json: b.settings_json,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

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

          {/* STEP 1: FORM INPUTS */}
          {step === "form" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="prompt" className="text-sm font-semibold">
                  Tema o Prompt Principal <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="prompt"
                  placeholder="Ej: 'Cómo implementar React Server Components con Server Actions y revalidación de datos en TanStack Query...'"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px] text-sm resize-y"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level" className="text-xs font-medium">
                    Nivel Dificultad
                  </Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger id="level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Principiante">Principiante</SelectItem>
                      <SelectItem value="Intermedio">Intermedio</SelectItem>
                      <SelectItem value="Avanzado">Avanzado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-xs font-medium">
                    Duración Estimada (min)
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    min={5}
                    max={120}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language" className="text-xs font-medium">
                    Idioma
                  </Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Español">Español</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Português">Português</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tone" className="text-xs font-medium">
                    Tono Pedagógico
                  </Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger id="tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Práctico y Profesional">Práctico y Profesional</SelectItem>
                      <SelectItem value="Académico">Académico</SelectItem>
                      <SelectItem value="Cercano y Entusiasta">Cercano y Entusiasta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audience" className="text-xs font-medium">
                    Público Objetivo
                  </Label>
                  <Input
                    id="audience"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="Ej: Desarrolladores Frontend"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="objectives" className="text-xs font-medium">
                  Objetivos Específicos (opcional, uno por línea)
                </Label>
                <Textarea
                  id="objectives"
                  placeholder="• Comprender el ciclo de vida&#10;• Escribir código limpio"
                  value={objectivesText}
                  onChange={(e) => setObjectivesText(e.target.value)}
                  className="min-h-[70px] text-sm"
                />
              </div>

              {/* Advanced AI Settings */}
              <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Wand2 className="size-4 text-primary" />
                  <span>Configuración del Modelo IA</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="provider" className="text-xs">
                      Proveedor
                    </Label>
                    <Select
                      value={provider}
                      onValueChange={(v) => handleProviderChange(v as AIProviderType)}
                    >
                      <SelectTrigger id="provider" className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini">Google Gemini</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="model" className="text-xs">
                      Modelo
                    </Label>
                    <Input
                      id="model"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="temp" className="text-xs">
                      Temperatura ({temperature})
                    </Label>
                    <Input
                      id="temp"
                      type="number"
                      step={0.1}
                      min={0}
                      max={1}
                      value={temperature}
                      onChange={(e) => setTemperature(Number(e.target.value))}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: GENERATING STATE */}
          {step === "generating" && (
            <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
              <div className="relative">
                <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
                  <Bot className="size-8 animate-bounce" />
                </div>
                <Sparkles className="size-5 text-amber-500 absolute -top-1 -right-1 animate-spin" />
              </div>

              <div className="space-y-2 max-w-md">
                <h3 className="text-lg font-bold">Generando lección interactiva...</h3>
                <p className="text-sm text-muted-foreground">
                  El agente está analizando los requisitos, construyendo el plan y creando los
                  bloques.
                </p>
              </div>

              <div className="w-full max-w-md space-y-2">
                <Progress value={progressValue} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>
                    {progressStep === "planning" && "1/4 Planificando estructura..."}
                    {progressStep === "generating" && "2/4 Generando bloques..."}
                    {progressStep === "validating" && "3/4 Validando esquemas Zod..."}
                    {progressStep === "repairing" && "4/4 Ejecutando Auto-repair..."}
                    {progressStep === "completed" && "¡Completado!"}
                  </span>
                  <span>{progressValue}%</span>
                </div>
              </div>

              {currentPlan && (
                <div className="rounded-xl border border-border bg-card p-4 text-left max-w-lg w-full space-y-2 text-xs">
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    <BookOpen className="size-4 text-primary" />
                    <span>Plan Detectado: {currentPlan.title}</span>
                  </div>
                  <p className="text-muted-foreground">
                    {currentPlan.sections?.length || 0} Secciones planificadas
                  </p>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelGeneration}
                className="mt-4 gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <XCircle className="size-4" />
                <span>Cancelar Generación</span>
              </Button>
            </div>
          )}

          {/* STEP 3: RESULT PREVIEW STATE */}
          {step === "result" && result && (
            <div className="space-y-6">
              {/* Telemetry Header Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl border border-border bg-muted/20 text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  <div>
                    <div className="text-muted-foreground font-medium">Tiempo</div>
                    <div className="font-semibold font-mono">
                      {(result.telemetry.durationMs / 1000).toFixed(2)}s
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Coins className="size-4 text-amber-500" />
                  <div>
                    <div className="text-muted-foreground font-medium">Coste Est.</div>
                    <div className="font-semibold font-mono">
                      ${result.telemetry.estimatedCost.toFixed(5)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <FileCode className="size-4 text-blue-500" />
                  <div>
                    <div className="text-muted-foreground font-medium">Tokens</div>
                    <div className="font-semibold font-mono">
                      {result.telemetry.tokensInput + result.telemetry.tokensOutput}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  <div>
                    <div className="text-muted-foreground font-medium">Auto-Repairs</div>
                    <div className="font-semibold font-mono">
                      {result.telemetry.repairCount} correcciones
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs view for Preview */}
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="preview">Vista Previa de Lección</TabsTrigger>
                  <TabsTrigger value="plan">Plan Pedagógico</TabsTrigger>
                  <TabsTrigger value="telemetry">Detalles & Reparo</TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="space-y-4 pt-4">
                  <Alert className="bg-primary/5 border-primary/20 text-xs">
                    <CheckCircle2 className="size-4 text-primary" />
                    <AlertTitle className="font-semibold">Borrador listo para revisión</AlertTitle>
                    <AlertDescription>
                      Esta lección aún NO se ha guardado en la base de datos. Utiliza el botón
                      "Aceptar e Insertar" para incorporarla a tu lección mediante RPC.
                    </AlertDescription>
                  </Alert>

                  <div className="border border-border rounded-xl p-2 bg-background max-h-[500px] overflow-y-auto">
                    <LessonRenderer
                      lesson={{
                        id: lessonId,
                        title: result.plan.title,
                        slug: "preview-lesson",
                      }}
                      blocks={lessonBlocksForPreview}
                    />
                  </div>
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
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                        Objetivos:
                      </h4>
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

                <TabsContent value="telemetry" className="space-y-4 pt-4">
                  <div className="rounded-xl border border-border p-4 space-y-4 bg-card text-xs">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-foreground">Información de Ejecución:</h4>
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <div>
                          Proveedor:{" "}
                          <span className="font-mono text-foreground">
                            {result.telemetry.provider}
                          </span>
                        </div>
                        <div>
                          Modelo:{" "}
                          <span className="font-mono text-foreground">
                            {result.telemetry.model}
                          </span>
                        </div>
                        <div>
                          Tokens Entrada:{" "}
                          <span className="font-mono text-foreground">
                            {result.telemetry.tokensInput}
                          </span>
                        </div>
                        <div>
                          Tokens Salida:{" "}
                          <span className="font-mono text-foreground">
                            {result.telemetry.tokensOutput}
                          </span>
                        </div>
                      </div>
                    </div>

                    {result.repairLog && result.repairLog.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-foreground">
                          Registro de Auto-Reparación ({result.repairLog.length}):
                        </h4>
                        <div className="p-3 rounded-lg bg-black/90 text-emerald-400 font-mono text-[11px] space-y-1 max-h-40 overflow-y-auto">
                          {result.repairLog.map((logItem, idx) => (
                            <div key={idx}>{logItem}</div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        No se requirieron correcciones. Todos los bloques pasaron la validación en
                        el primer intento.
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        {/* DIALOG FOOTER */}
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
                  onClick={handleAcceptAndSave}
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
