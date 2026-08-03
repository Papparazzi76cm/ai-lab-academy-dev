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
      apiKey || (typeof process !== "undefined" ? process.env?.ANTHROPIC_API_KEY : undefined);
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

    if (this.apiKey && this.apiKey !== "mock") {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
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

        if (response.ok) {
          const data = await response.json();
          const text = data.content?.[0]?.text || "";
          const usage = data.usage || {};
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
      } catch (err) {
        console.warn("Anthropic API call failed, falling back to deterministic response:", err);
      }
    }

    // Fallback/Deterministic mode
    const tokensIn = await this.countTokens((systemInst || "") + " " + prompt);
    let responseText = "";

    if (params.responseFormat === "json") {
      if (prompt.includes("PLANNER") || prompt.includes("planner")) {
        responseText = JSON.stringify({
          title: "Lección Creada con Anthropic Claude",
          objectives: ["Comprensión profunda", "Aplicación guiada"],
          level: "Avanzado",
          estimatedDurationMinutes: 30,
          sections: [
            {
              id: "sec-1",
              title: "Análisis Arquitectónico",
              purpose: "Profundizar en la estructura.",
              targetBlockTypes: ["heading", "paragraph", "code"],
              keyPoints: ["Arquitectura de agentes", "Pipeline de validación"],
            },
          ],
          estimatedBlocksCount: 5,
        });
      } else {
        responseText = JSON.stringify({
          blocks: [
            { type: "heading", content_json: { text: "Lección Anthropic", level: 1 } },
            {
              type: "paragraph",
              content_json: { text: "Contenido generado mediante Anthropic API." },
            },
          ],
        });
      }
    } else {
      responseText = "Respuesta de Anthropic Claude.";
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
