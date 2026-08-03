import type { AIProvider } from "./base";
import { estimateModelCost, approxTokenCount } from "./base";
import type { GenerateParams, ProviderResponse } from "../types";

export class GeminiProvider implements AIProvider {
  type = "gemini" as const;
  model: string;
  private apiKey?: string;

  constructor(model = "gemini-3.6-flash", apiKey?: string) {
    this.model = model;
    this.apiKey =
      apiKey || (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : undefined);
  }

  async countTokens(text: string): Promise<number> {
    return approxTokenCount(text);
  }

  estimateCost(tokensInput: number, tokensOutput: number): number {
    return estimateModelCost("gemini", this.model, tokensInput, tokensOutput);
  }

  async generate(params: GenerateParams): Promise<ProviderResponse> {
    const prompt = params.prompt;
    const systemInst = params.systemInstruction;
    const isMockMode =
      this.apiKey === "mock" ||
      (typeof process !== "undefined" && process.env?.AI_MOCK_MODE === "true");

    if (isMockMode) {
      return this.getMockResponse(params);
    }

    if (!this.apiKey) {
      const err = new Error("GEMINI_API_KEY no está configurada en las variables de entorno.");
      (err as unknown as Record<string, string>).code = "PROVIDER_AUTH_ERROR";
      throw err;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const payload = {
      systemInstruction: systemInst ? { parts: [{ text: systemInst }] } : undefined,
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: params.temperature ?? 0.7,
        maxOutputTokens: params.maxTokens,
        responseMimeType: params.responseFormat === "json" ? "application/json" : "text/plain",
      },
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "aistudio-build",
        },
        body: JSON.stringify(payload),
      });
    } catch (netErr) {
      const err = new Error(
        "Error de conexión al llamar a Gemini: " +
          (netErr instanceof Error ? netErr.message : String(netErr)),
      );
      (err as unknown as Record<string, string>).code = "PROVIDER_TIMEOUT";
      throw err;
    }

    if (!response.ok) {
      let code = "PROVIDER_UNAVAILABLE";
      if (response.status === 401 || response.status === 403) code = "PROVIDER_AUTH_ERROR";
      else if (response.status === 429) code = "PROVIDER_RATE_LIMIT";
      else if (response.status === 504) code = "PROVIDER_TIMEOUT";

      const errText = await response.text().catch(() => "");
      const err = new Error(
        `Error en Gemini API (${response.status}): ${errText.substring(0, 200)}`,
      );
      (err as unknown as Record<string, string>).code = code;
      throw err;
    }

    const data = await response.json().catch(() => null);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text.trim()) {
      const err = new Error("Gemini devolvió una respuesta vacía o sin candidatos válidos.");
      (err as unknown as Record<string, string>).code = "PROVIDER_INVALID_RESPONSE";
      throw err;
    }

    const usage = data?.usageMetadata || {};
    const tokensIn =
      usage.promptTokenCount || (await this.countTokens((systemInst || "") + " " + prompt));
    const tokensOut = usage.candidatesTokenCount || (await this.countTokens(text));

    return {
      text,
      tokenUsage: {
        tokensInput: tokensIn,
        tokensOutput: tokensOut,
        totalTokens: tokensIn + tokensOut,
      },
      rawResponse: data,
    };
  }

  private async getMockResponse(params: GenerateParams): Promise<ProviderResponse> {
    const prompt = params.prompt;
    const systemInst = params.systemInstruction;
    const tokensIn = await this.countTokens((systemInst || "") + " " + prompt);

    let responseText = "";
    if (params.responseFormat === "json") {
      if (prompt.includes("PLANNER") || prompt.includes("planner")) {
        responseText = JSON.stringify({
          title: "Introducción Práctica a AI Lab Academy",
          objectives: [
            "Comprender los conceptos fundamentales del desarrollo asistido por IA",
            "Aprender a estructurar un flujo de trabajo con agentes inteligentes",
            "Aplicar buenas prácticas de ingeniería de prompts y autoría de bloques",
          ],
          level: "Principiante",
          estimatedDurationMinutes: 25,
          sections: [
            {
              id: "sec-1",
              title: "Introducción y Conceptos Clave",
              purpose: "Establecer la base conceptual y contextualizar el aprendizaje.",
              targetBlockTypes: ["heading", "paragraph", "callout"],
              keyPoints: [
                "Definición de IA Generativa",
                "Casos de uso en el aula",
                "Beneficios principales",
              ],
            },
            {
              id: "sec-2",
              title: "Ejemplos Prácticos y Código",
              purpose: "Mostrar la implementación técnica con código interactivo.",
              targetBlockTypes: ["heading", "paragraph", "code", "checklist"],
              keyPoints: [
                "Estructura de un prompt",
                "Validación de salida",
                "Checklist de verificación",
              ],
            },
            {
              id: "sec-3",
              title: "Resumen y Evaluación",
              purpose: "Sintetizar el aprendizaje y consolidar dudas frecuentes.",
              targetBlockTypes: ["heading", "paragraph", "accordion"],
              keyPoints: ["Puntos clave", "Preguntas frecuentes"],
            },
          ],
          estimatedBlocksCount: 9,
          recommendedResources: ["https://ai.google.dev/docs", "https://react.dev"],
          quizIdeas: [
            "¿Cuál es el rol principal del agente de autoría?",
            "¿Cómo se garantiza la validación de bloques?",
          ],
        });
      } else {
        responseText = JSON.stringify({
          blocks: [
            {
              type: "heading",
              content_json: { text: "Fundamentos de Inteligencia Artificial", level: 1 },
            },
            {
              type: "paragraph",
              content_json: {
                text: "Bienvenido a esta lección interactiva. Aquí exploraremos cómo la IA transforma el diseño educativo y la creación de contenidos adaptativos.",
              },
            },
            {
              type: "callout",
              content_json: {
                type: "info",
                title: "Nota Importante",
                text: "Toda lección generada por IA sigue una estricta validación de esquemas en el Authoring Studio.",
              },
            },
            {
              type: "heading",
              content_json: { text: "Código de Ejemplo", level: 2 },
            },
            {
              type: "code",
              content_json: {
                language: "typescript",
                filename: "agent.ts",
                code: "const agent = new LessonAuthorAgent();\nconst result = await agent.generate(prompt);",
              },
            },
            {
              type: "checklist",
              content_json: {
                items: [
                  { id: "c1", text: "Definir objetivos", checked: true },
                  { id: "c2", text: "Generar estructura", checked: true },
                  { id: "c3", text: "Validar y publicar", checked: false },
                ],
              },
            },
            {
              type: "accordion",
              content_json: {
                items: [
                  {
                    id: "a1",
                    title: "¿La IA escribe directo en DB?",
                    content:
                      "No, la IA genera un objeto borrador que debe ser revisado y aceptado por el usuario.",
                  },
                ],
              },
            },
          ],
        });
      }
    } else {
      responseText = "Resultado generado por el asistente de autoría IA.";
    }

    const tokensOut = await this.countTokens(responseText);

    return {
      text: responseText,
      tokenUsage: {
        tokensInput: tokensIn,
        tokensOutput: tokensOut,
        totalTokens: tokensIn + tokensOut,
      },
    };
  }
}
