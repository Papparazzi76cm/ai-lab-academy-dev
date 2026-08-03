import type { GenerateParams, ProviderResponse, AIProviderType } from "../types";

export interface AIProvider {
  type: AIProviderType;
  model: string;

  generate(params: GenerateParams): Promise<ProviderResponse>;
  countTokens(text: string): Promise<number>;
  estimateCost(tokensInput: number, tokensOutput: number): number;
}

export function estimateModelCost(
  provider: AIProviderType,
  model: string,
  tokensInput: number,
  tokensOutput: number,
): number {
  let inputRatePer1k = 0.0001;
  let outputRatePer1k = 0.0004;

  const m = model.toLowerCase();

  if (provider === "gemini") {
    if (m.includes("pro")) {
      inputRatePer1k = 0.00125;
      outputRatePer1k = 0.005;
    } else {
      inputRatePer1k = 0.0001;
      outputRatePer1k = 0.0004;
    }
  } else if (provider === "openai") {
    if (m.includes("gpt-4o-mini")) {
      inputRatePer1k = 0.00015;
      outputRatePer1k = 0.0006;
    } else {
      inputRatePer1k = 0.0025;
      outputRatePer1k = 0.01;
    }
  } else if (provider === "anthropic") {
    if (m.includes("haiku")) {
      inputRatePer1k = 0.00025;
      outputRatePer1k = 0.00125;
    } else {
      inputRatePer1k = 0.003;
      outputRatePer1k = 0.015;
    }
  }

  const cost = (tokensInput / 1000) * inputRatePer1k + (tokensOutput / 1000) * outputRatePer1k;
  return Number(cost.toFixed(6));
}

export function approxTokenCount(text: string): number {
  if (!text) return 0;
  // Approximation: ~4 characters per token for English/Spanish text
  return Math.ceil(text.length / 3.8);
}
