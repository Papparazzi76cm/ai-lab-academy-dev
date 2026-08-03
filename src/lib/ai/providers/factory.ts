import type { AIProvider } from "./base";
import { GeminiProvider } from "./gemini";
import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";
import type { AISettings } from "../types";

export class ProviderFactory {
  static create(settings: AISettings): AIProvider {
    switch (settings.provider) {
      case "gemini":
        return new GeminiProvider(settings.model || "gemini-3.6-flash", settings.apiKey);
      case "openai":
        return new OpenAIProvider(settings.model || "gpt-4o", settings.apiKey);
      case "anthropic":
        return new AnthropicProvider(
          settings.model || "claude-3-5-sonnet-20241022",
          settings.apiKey,
        );
      default:
        return new GeminiProvider(settings.model || "gemini-3.6-flash", settings.apiKey);
    }
  }
}
