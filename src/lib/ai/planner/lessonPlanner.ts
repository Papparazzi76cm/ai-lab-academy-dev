import type { AIProvider } from "../providers/base";
import type { LessonGenerationContext, LessonPlan } from "../types";
import { LESSON_PLANNER_SYSTEM_PROMPT, buildPlannerPrompt } from "../prompts/lesson-planner";
import { LessonPlanSchema } from "../schemas/lessonSchema";

export class LessonPlanner {
  constructor(private provider: AIProvider) {}

  async plan(
    prompt: string,
    context?: LessonGenerationContext,
  ): Promise<{ plan: LessonPlan; tokensInput: number; tokensOutput: number }> {
    const formattedPrompt = buildPlannerPrompt(prompt, context);

    const response = await this.provider.generate({
      prompt: formattedPrompt,
      systemInstruction: LESSON_PLANNER_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.7,
    });

    let plan: LessonPlan;

    try {
      const parsed = JSON.parse(response.text);
      const validationResult = LessonPlanSchema.safeParse(parsed);

      if (validationResult.success) {
        plan = validationResult.data as LessonPlan;
      } else {
        console.warn("LessonPlan JSON validation warnings:", validationResult.error);
        plan = this.fallbackPlan(prompt, context, parsed);
      }
    } catch (e) {
      console.warn("Failed to parse LessonPlan JSON, using fallback plan:", e);
      plan = this.fallbackPlan(prompt, context);
    }

    return {
      plan,
      tokensInput: response.tokenUsage.tokensInput,
      tokensOutput: response.tokenUsage.tokensOutput,
    };
  }

  private fallbackPlan(
    prompt: string,
    context?: LessonGenerationContext,
    partialJson?: Record<string, unknown>,
  ): LessonPlan {
    const title =
      (typeof partialJson?.title === "string" && partialJson.title) ||
      context?.lessonTitle ||
      `Lección: ${prompt.slice(0, 40)}`;

    return {
      title,
      objectives: [
        "Comprender la arquitectura y fundamentos de " + prompt,
        "Aplicar buenas prácticas en ejercicios interactivos",
        "Evaluar la comprensión mediante cuestionarios y verificaciones",
      ],
      level: context?.level || "Intermedio",
      estimatedDurationMinutes: context?.durationMinutes || 20,
      sections: [
        {
          id: "sec-1",
          title: "Visión General y Conceptos Clave",
          purpose: "Introducir los fundamentos de la materia de forma clara y accesible.",
          targetBlockTypes: ["heading", "paragraph", "callout"],
          keyPoints: ["Conceptos básicos", "Casos de uso principales", "Importancia práctica"],
        },
        {
          id: "sec-2",
          title: "Desarrollo Técnico y Código",
          purpose: "Mostrar la implementación práctica con ejemplos interactivos.",
          targetBlockTypes: ["heading", "paragraph", "code", "checklist"],
          keyPoints: ["Estructura de código", "Patrones recomendados", "Lista de comprobación"],
        },
        {
          id: "sec-3",
          title: "Resumen y Preguntas Frecuentes",
          purpose: "Sintetizar el contenido y resolver dudas habituales.",
          targetBlockTypes: ["heading", "paragraph", "accordion"],
          keyPoints: ["Puntos clave resueltos", "Preguntas comunes"],
        },
      ],
      estimatedBlocksCount: 8,
      recommendedResources: ["https://ai.google.dev", "https://react.dev"],
      quizIdeas: ["¿Cuál es el beneficio principal?", "¿Cómo se valida el flujo?"],
    };
  }
}
