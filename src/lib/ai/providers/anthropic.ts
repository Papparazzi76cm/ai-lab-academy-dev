import type { AIProvider } from "./base";
import { estimateModelCost, approxTokenCount } from "./base";
import type { GenerateParams, ProviderResponse } from "../types";

export class AnthropicProvider implements AIProvider {
  type = "anthropic" as const;
  model: string;
  private apiKey?: string;

  constructor(model = "claude-3-5-sonnet-20241022", apiKey?: string) {
    this.model = model;
    this.apiKey =
      apiKey || (typeof process !== "undefined" ? process.env["ANTHROPIC_API_KEY"] : undefined);
  }

  async countTokens(text: string): Promise<number> {
    return approxTokenCount(text);
  }

  estimateCost(tokensInput: number, tokensOutput: number): number {
    return estimateModelCost("anthropic", this.model, tokensInput, tokensOutput);
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
      const err = new Error("ANTHROPIC_API_KEY no está configurada en las variables de entorno.");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err as any).code = "PROVIDER_AUTH_ERROR";
      throw err;
    }

    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          system: systemInst,
          messages: [{ role: "user", content: prompt }],
          max_tokens: params.maxTokens || 4000,
          temperature: params.temperature ?? 0.7,
        }),
      });
    } catch (netErr) {
      const err = new Error(
        "Error de conexión con Anthropic: " +
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
        `Error en Anthropic API (${response.status}): ${errText.substring(0, 200)}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err as any).code = code;
      throw err;
    }

    const data = await response.json().catch(() => null);
    const text = data?.content?.[0]?.text || "";

    if (!text.trim()) {
      const err = new Error("Anthropic devolvió una respuesta vacía.");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err as any).code = "PROVIDER_INVALID_RESPONSE";
      throw err;
    }

    const usage = data?.usage || {};
    const tokensIn = usage.input_tokens || (await this.countTokens(prompt));
    const tokensOut = usage.output_tokens || (await this.countTokens(text));

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
        title: "Lección Claude: Fundamentos de IA",
        objectives: ["Aprender Claude API", "Construir flujos de trabajo"],
        level: "Avanzado",
        estimatedDurationMinutes: 25,
        sections: [
          {
            id: "s1",
            title: "Prompting con Claude",
            purpose: "Técnicas avanzadas",
            targetBlockTypes: ["heading", "paragraph"],
            keyPoints: ["System prompts", "XML tags"],
          },
        ],
        estimatedBlocksCount: 5,
      });
    } else {
      mockText = JSON.stringify({
        blocks: [
          {
            type: "heading",
            content_json: { text: "1. Prompting Avanzado", level: 1 },
          },
          {
            type: "paragraph",
            content_json: { text: "Usar etiquetas XML ayuda a Claude a estructurar respuestas..." },
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
