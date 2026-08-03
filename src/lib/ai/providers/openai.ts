import type { AIProvider } from "./base";
import { estimateModelCost, approxTokenCount } from "./base";
import type { GenerateParams, ProviderResponse } from "../types";

export class OpenAIProvider implements AIProvider {
  type = "openai" as const;
  model: string;
  private apiKey?: string;

  constructor(model = "gpt-4o", apiKey?: string) {
    this.model = model;
    this.apiKey =
      apiKey || (typeof process !== "undefined" ? process.env["OPENAI_API_KEY"] : undefined);
  }

  async countTokens(text: string): Promise<number> {
    return approxTokenCount(text);
  }

  estimateCost(tokensInput: number, tokensOutput: number): number {
    return estimateModelCost("openai", this.model, tokensInput, tokensOutput);
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
      const err = new Error("OPENAI_API_KEY no está configurada en las variables de entorno.");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err as any).code = "PROVIDER_AUTH_ERROR";
      throw err;
    }

    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            ...(systemInst ? [{ role: "system", content: systemInst }] : []),
            { role: "user", content: prompt },
          ],
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxTokens,
          response_format: params.responseFormat === "json" ? { type: "json_object" } : undefined,
        }),
      });
    } catch (netErr) {
      const err = new Error(
        "Error de conexión con OpenAI: " +
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
        `Error en OpenAI API (${response.status}): ${errText.substring(0, 200)}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err as any).code = code;
      throw err;
    }

    const data = await response.json().catch(() => null);
    const text = data?.choices?.[0]?.message?.content || "";

    if (!text.trim()) {
      const err = new Error("OpenAI devolvió una respuesta vacía.");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err as any).code = "PROVIDER_INVALID_RESPONSE";
      throw err;
    }

    const usage = data?.usage || {};
    const tokensIn = usage.prompt_tokens || (await this.countTokens(prompt));
    const tokensOut = usage.completion_tokens || (await this.countTokens(text));

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
        title: "Lección OpenAI Mock: Desarrollo Ágil",
        objectives: ["Aprender metodologías ágiles", "Usar Scrum en proyectos de IA"],
        level: "Intermedio",
        estimatedDurationMinutes: 15,
        sections: [
          {
            id: "s1",
            title: "Scrum y Sprinting",
            purpose: "Fundamentos de trabajo iterativo",
            targetBlockTypes: ["heading", "paragraph"],
            keyPoints: ["Sprints", "Backlog"],
          },
        ],
        estimatedBlocksCount: 4,
      });
    } else {
      mockText = JSON.stringify({
        blocks: [
          {
            type: "heading",
            content_json: { text: "1. Metodologías Ágiles", level: 1 },
          },
          {
            type: "paragraph",
            content_json: { text: "Scrum es un marco de trabajo liviano..." },
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
