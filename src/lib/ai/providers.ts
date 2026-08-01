/**
 * AI architecture placeholder.
 *
 * The platform is prepared to plug in multiple providers later. Each provider
 * will be called from server functions (never from the browser) so API keys
 * stay server-side. Nothing here performs network calls yet.
 */
export type AIProviderId =
  | "openai"
  | "gemini"
  | "claude"
  | "openrouter"
  | "elevenlabs"
  | "runway"
  | "veo"
  | "flux"
  | "ideogram";

export type AICapability = "chat" | "image" | "video" | "audio" | "embedding";

export type AIProvider = {
  id: AIProviderId;
  name: string;
  capabilities: AICapability[];
  enabled: boolean;
  description: string;
};

export const aiProviders: AIProvider[] = [
  {
    id: "openai",
    name: "ChatGPT",
    capabilities: ["chat", "image", "embedding"],
    enabled: false,
    description: "Modelos GPT para conversación, análisis y generación de texto.",
  },
  {
    id: "gemini",
    name: "Gemini",
    capabilities: ["chat", "image"],
    enabled: false,
    description: "Modelos multimodales de Google con contexto extenso.",
  },
  {
    id: "claude",
    name: "Claude",
    capabilities: ["chat"],
    enabled: false,
    description: "Razonamiento largo y redacción de alta calidad.",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    capabilities: ["chat"],
    enabled: false,
    description: "Acceso unificado a decenas de modelos.",
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    capabilities: ["audio"],
    enabled: false,
    description: "Voz sintética natural para narraciones.",
  },
  {
    id: "runway",
    name: "Runway",
    capabilities: ["video"],
    enabled: false,
    description: "Generación y edición de vídeo con IA.",
  },
  {
    id: "veo",
    name: "Veo",
    capabilities: ["video"],
    enabled: false,
    description: "Vídeo generativo de alta fidelidad.",
  },
  {
    id: "flux",
    name: "Flux",
    capabilities: ["image"],
    enabled: false,
    description: "Imágenes fotorrealistas y artísticas.",
  },
  {
    id: "ideogram",
    name: "Ideogram",
    capabilities: ["image"],
    enabled: false,
    description: "Imágenes con tipografía legible.",
  },
];

export const aiLabModules = [
  {
    id: "compare",
    title: "Comparador de modelos",
    description: "Lanza el mismo prompt a varios modelos y compara respuestas.",
  },
  {
    id: "generator",
    title: "Generador de prompts",
    description: "Plantillas guiadas por objetivo, tono y formato.",
  },
  {
    id: "playground",
    title: "Playground",
    description: "Prueba prompts con parámetros y guarda los resultados.",
  },
  {
    id: "library",
    title: "Biblioteca de prompts",
    description: "Tu repositorio personal de prompts favoritos.",
  },
  {
    id: "history",
    title: "Historial",
    description: "Conversaciones y ejercicios realizados en el laboratorio.",
  },
];
