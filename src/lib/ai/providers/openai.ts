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
      apiKey || (typeof process !== "undefined" ? process.env?.OPENAI_API_KEY : undefined);
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
      (typeof process !== "undefined" && process.env?.AI_MOCK_MODE === "true");

    if (isMockMode) {
      return this.getMockResponse(params);
    }

    if (!this.apiKey) {
      const err = new Error("OPENAI_API_KEY no está configurada en las variables de entorno.");
      (err as unknown as Record<string, string>).code = "PROVIDER_AUTH_ERROR";
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
        `Error en OpenAI API (${response.status}): ${errText.substring(0, 200)}`,
      );
      (err as unknown as Record<string, string>).code = code;
      throw err;
    }

    const data = await response.json().catch(() => null);
    const text = data?.choices?.[0]?.message?.content || "";

    if (!text.trim()) {
      const err = new Error("OpenAI devolvió una respuesta vacía.");
      (err as unknown as Record<string, string>).code = "PROVIDER_INVALID_RESPONSE";
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
    const systemInst = params.systemInstruction;
    const tokensIn = await this.countTokens((systemInst || "") + " " + prompt);
    let responseText = "";

    if (params.responseFormat === "json") {
      if (prompt.includes("PLANNER") || prompt.includes("planner")) {
        responseText = JSON.stringify({
          title: "Lección Creada con OpenAI Provider",
          objectives: ["Aprender los conceptos fundamentales", "Implementar ejemplos prácticos"],
          level: "Intermedio",
          estimatedDurationMinutes: 20,
          sections: [
            {
              id: "sec-1",
              title: "Visión General",
              purpose: "Explicar el contexto general.",
              targetBlockTypes: ["heading", "paragraph"],
              keyPoints: ["Punto 1", "Punto 2"],
            },
          ],
          estimatedBlocksCount: 4,
        });
      } else {
        responseText = JSON.stringify({
          blocks: [
            { type: "heading", content_json: { text: "Lección OpenAI", level: 1 } },
            {
              type: "paragraph",
              content_json: { text: "Contenido generado mediante OpenAI API." },
            },
          ],
        });
      }
    } else {
      responseText = "Respuesta de OpenAI.";
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
