import type { AuthoringBlock } from "@/lib/authoring/types";

export type AIProviderType = "gemini" | "openai" | "anthropic";

export interface AISettings {
  provider: AIProviderType;
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey?: string;
}

export interface LessonGenerationContext {
  courseTitle?: string;
  moduleTitle?: string;
  lessonTitle?: string;
  level?: "Principiante" | "Intermedio" | "Avanzado" | string;
  durationMinutes?: number;
  language?: string;
  tone?: "Profesional" | "Cercano" | "Académico" | "Práctico" | string;
  audience?: string;
  objectives?: string[];
}

export interface LessonSectionPlan {
  id: string;
  title: string;
  purpose: string;
  targetBlockTypes: string[];
  keyPoints: string[];
}

export interface LessonPlan {
  title: string;
  objectives: string[];
  level: string;
  estimatedDurationMinutes: number;
  sections: LessonSectionPlan[];
  estimatedBlocksCount: number;
  recommendedResources?: string[];
  quizIdeas?: string[];
}

export interface TokenUsage {
  tokensInput: number;
  tokensOutput: number;
  totalTokens: number;
}

export interface ProviderResponse {
  text: string;
  tokenUsage: TokenUsage;
  rawResponse?: unknown;
}

export interface RepairResult {
  repairedCount: number;
  repairedBlocks: AuthoringBlock[];
  log: string[];
}

export type GenerationJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface GenerationJob {
  id: string;
  lessonId: string;
  userId: string;
  provider: string;
  model: string;
  prompt: string;
  status: GenerationJobStatus;
  startedAt: string;
  finishedAt?: string;
  tokensInput: number;
  tokensOutput: number;
  estimatedCost: number;
  createdBlocks: number;
  metadata: Record<string, unknown>;
}

export interface TelemetryData {
  durationMs: number;
  tokensInput: number;
  tokensOutput: number;
  estimatedCost: number;
  model: string;
  provider: string;
  repairCount: number;
  errorsCount: number;
}

export interface GenerationResult {
  jobId?: string;
  plan: LessonPlan;
  blocks: AuthoringBlock[];
  telemetry: TelemetryData;
  repairLog: string[];
  status: GenerationJobStatus;
}

export interface GenerateParams {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
}
