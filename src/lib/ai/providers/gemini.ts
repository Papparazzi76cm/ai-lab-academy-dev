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
      apiKey || (typeof process !== "undefined" ? process.env["GEMINI_API_KEY"] : undefined);
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
      (typeof process !== "undefined" && process.env["AI_MOCK_MODE"] === "true");

    if (isMockMode) {
      return this.getMockResponse(params);
    }

    if (!this.apiKey) {
      const err = new Error("GEMINI_API_KEY no está configurada en las variables de entorno.");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err as any).code = "PROVIDER_AUTH_ERROR";
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err as any).code = "PROVIDER_TIMEOUT";
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err as any).code = code;
      throw err;
    }

    const data = await response.json().catch(() => null);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text.trim()) {
      const err = new Error("Gemini devolvió una respuesta vacía o sin candidatos válidos.");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err as any).code = "PROVIDER_INVALID_RESPONSE";
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
    const systemInst = params.systemInstruction || "";
    let mockText = "";

    if (systemInst.includes("Planificador") || prompt.includes("Planific")) {
      mockText = JSON.stringify({
        title: "Introducción Práctica a la Inteligencia Artificial",
        objectives: [
          "Comprender los conceptos fundamentales de IA Generativa",
          "Aprender a diseñar prompts efectivos",
          "Aplicar agentes en entornos de desarrollo",
        ],
        level: "Intermedio",
        estimatedDurationMinutes: 20,
        sections: [
          {
            id: "sec-1",
            title: "Conceptos Fundamentales",
            purpose: "Establecer la base teórica de modelos LLM",
            targetBlockTypes: ["heading", "paragraph", "callout"],
            keyPoints: ["Transformers", "Tokens", "Atención"],
          },
          {
            id: "sec-2",
            title: "Ingeniería de Prompts",
            purpose: "Aprender patrones de diseño de instrucciones",
            targetBlockTypes: ["heading", "paragraph", "code", "checklist"],
            keyPoints: ["Zero-shot", "Few-shot", "Chain of Thought"],
          },
          {
            id: "sec-3",
            title: "Evaluación y Práctica",
            purpose: "Comprobar el aprendizaje mediante preguntas interactivas",
            targetBlockTypes: ["heading", "quiz", "accordion"],
            keyPoints: ["Casos de uso", "Preguntas de repaso"],
          },
        ],
        estimatedBlocksCount: 8,
      });
    } else {
      mockText = JSON.stringify({
        blocks: [
          {
            type: "heading",
            content_json: { text: "1. Introducción a los Modelos de Lenguaje", level: 1 },
          },
          {
            type: "paragraph",
            content_json: {
              text: "Los modelos de lenguaje como Gemini permiten procesar y generar texto de forma altamente contextual.",
            },
          },
          {
            type: "callout",
            content_json: {
              type: "info",
              title: "Nota Importante",
              text: "Siempre debes validar la salida de la IA antes de insertarla directamente en producción.",
            },
          },
          {
            type: "heading",
            content_json: { text: "2. Ejemplo Práctico en TypeScript", level: 2 },
          },
          {
            type: "code",
            content_json: {
              language: "typescript",
              code: "import { GoogleGenAI } from '@google/genai';\n\nconst ai = new GoogleGenAI();\nconsole.log('AI Initialized');",
              filename: "example.ts",
            },
          },
          {
            type: "checklist",
            content_json: {
              items: [
                { id: "c1", text: "Configurar API Key", checked: true },
                { id: "c2", text: "Definir Schema Zod", checked: false },
                { id: "c3", text: "Probar Auto-repair", checked: false },
              ],
            },
          },
        ],
      });
    }

    const tokensIn = await this.countTokens(systemInst + " " + prompt);
    const tokensOut = await this.countTokens(mockText);

    return {
      text: mockText,
      tokenUsage: {
        tokensInput: tokensIn,
        tokensOutput: tokensOut,
        totalTokens: tokensIn + tokensOut,
      },
    };
  }
}
