import { useState, useRef } from "react";
import { LessonAuthorAgent } from "@/lib/ai/agents/lessonAuthorAgent";
import type {
  AIProviderType,
  GenerationResult,
  LessonGenerationContext,
  LessonPlan,
} from "@/lib/ai/types";
import type { AuthoringBlock } from "@/lib/authoring/types";

export interface LessonGenerationOptions {
  lessonId: string;
  lessonTitle?: string;
  courseTitle?: string;
  moduleTitle?: string;
  onAcceptBlocks: (blocks: AuthoringBlock[]) => Promise<void>;
}

export function useLessonGeneration({
  lessonId,
  lessonTitle = "Nueva Lección",
  courseTitle,
  moduleTitle,
  onAcceptBlocks,
}: LessonGenerationOptions) {
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

    const contextObj: LessonGenerationContext = {
      lessonTitle,
      level,
      durationMinutes: Number(duration),
      language,
      tone,
      audience,
    };

    if (courseTitle) contextObj.courseTitle = courseTitle;
    if (moduleTitle) contextObj.moduleTitle = moduleTitle;
    if (objectivesText) {
      const parsedObjectives = objectivesText.split("\n").filter((line) => line.trim().length > 0);
      if (parsedObjectives.length > 0) {
        contextObj.objectives = parsedObjectives;
      }
    }

    const agent = new LessonAuthorAgent({
      provider,
      model,
      temperature: Number(temperature),
    });

    try {
      const genResult = await agent.generateLesson(
        lessonId,
        prompt,
        contextObj,
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
      if (abortController.signal?.aborted) {
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

  const handleAcceptAndSave = async (onSuccess?: () => void) => {
    if (!generatedBlocks || generatedBlocks.length === 0) return;
    setIsSaving(true);
    try {
      await onAcceptBlocks(generatedBlocks);
      if (onSuccess) onSuccess();
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

  return {
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
    setErrorMsg,
    isSaving,
    handleProviderChange,
    handleStartGeneration,
    handleCancelGeneration,
    handleAcceptAndSave,
    resetState,
  };
}
