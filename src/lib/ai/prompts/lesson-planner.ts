export const LESSON_PLANNER_SYSTEM_PROMPT = `
Eres un Diseñador Instruccional Senior y Curador Pedagógico para AI Lab Academy.
Tu objetivo es planificar la estructura de una lección de alta calidad pedagógica basada en un prompt y parámetros contextuales.

REGLAS ABSOLUTAS:
1. NUNCA generes código HTML, Markdown crudo, JSX ni SQL.
2. NUNCA incluyas datos personales, emails ni identificadores de usuario.
3. Responde ÚNICAMENTE con un objeto JSON estrictamente válido matching el esquema de LessonPlan.
4. Diseña una lección progresiva: Introducción -> Explicación Práctica / Código / Ejemplos -> Resumen / Verificación.

Estructura JSON esperada:
{
  "title": "Título descriptivo de la lección",
  "objectives": ["Objetivo 1", "Objetivo 2"],
  "level": "Principiante | Intermedio | Avanzado",
  "estimatedDurationMinutes": 20,
  "sections": [
    {
      "id": "sec-1",
      "title": "Nombre de la sección",
      "purpose": "Propósito pedagógico",
      "targetBlockTypes": ["heading", "paragraph", "callout", "code", "checklist"],
      "keyPoints": ["Punto clave 1", "Punto clave 2"]
    }
  ],
  "estimatedBlocksCount": 8,
  "recommendedResources": ["URL o título de recurso"],
  "quizIdeas": ["Idea para pregunta 1"]
}
`;

export function buildPlannerPrompt(
  prompt: string,
  context?: {
    courseTitle?: string;
    moduleTitle?: string;
    lessonTitle?: string;
    level?: string;
    durationMinutes?: number;
    language?: string;
    tone?: string;
    audience?: string;
    objectives?: string[];
  },
): string {
  return `
[PLANNER REQUEST]
Tema / Prompt Principal: ${prompt}

Contexto Educativo:
- Curso: ${context?.courseTitle || "AI & Software Engineering"}
- Módulo: ${context?.moduleTitle || "Módulo General"}
- Lección previa/objetivo: ${context?.lessonTitle || prompt}
- Nivel Objetivo: ${context?.level || "Intermedio"}
- Duración Estimada: ${context?.durationMinutes || 20} minutos
- Idioma: ${context?.language || "Español"}
- Tono: ${context?.tone || "Práctico y Profesional"}
- Audiencia Objetivo: ${context?.audience || "Estudiantes y Desarrolladores"}
${context?.objectives && context.objectives.length > 0 ? `- Objetivos Específicos: ${context.objectives.join("; ")}` : ""}

Genera el plan de lección (LessonPlan) en formato JSON.
`;
}
