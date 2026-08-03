import type { AuthoringBlock } from "@/lib/authoring/types";
import type {
  AISettings,
  LessonGenerationContext,
  GenerationResult,
  GenerationJobStatus,
  LessonPlan,
} from "../types";
import { ProviderFactory } from "../providers/factory";
import { AuthoringPipeline } from "../pipeline/authoringPipeline";
import {
  createGenerationJob,
  updateGenerationJob,
  cancelGenerationJob,
} from "../history/generationHistory";
import { logGenerationStart, logGenerationEnd, logGenerationError } from "../telemetry/telemetry";
import { autoRepairBlock } from "../validation/autoRepair";

export class LessonAuthorAgent {
  private settings: AISettings;

  constructor(settings?: Partial<AISettings>) {
    this.settings = {
      provider: settings?.provider || "gemini",
      model: settings?.model || "gemini-3.6-flash",
      temperature: settings?.temperature ?? 0.7,
      maxTokens: settings?.maxTokens || 4000,
      apiKey: settings?.apiKey,
    };
  }

  async generateLesson(
    lessonId: string,
    prompt: string,
    context?: LessonGenerationContext,
    onProgress?: (
      step: "planning" | "generating" | "validating" | "repairing" | "completed",
      data?: { plan?: LessonPlan },
    ) => void,
    signal?: AbortSignal,
  ): Promise<GenerationResult> {
    const provider = ProviderFactory.create(this.settings);
    const pipeline = new AuthoringPipeline(provider);

    // 1. Create DB Job (status: queued -> running)
    const jobId = await createGenerationJob(
      lessonId,
      this.settings.provider,
      this.settings.model,
      prompt,
      { context },
    );

    await updateGenerationJob(jobId, "running", 0, 0, 0, 0, { context });
    logGenerationStart(jobId, this.settings.provider, this.settings.model, prompt);

    if (signal?.aborted) {
      await cancelGenerationJob(jobId);
      throw new Error("Generación cancelada por el usuario");
    }

    try {
      // 2. Execute Pipeline
      const result = await pipeline.execute(prompt, context, onProgress);

      if (signal?.aborted) {
        await cancelGenerationJob(jobId);
        return {
          ...result,
          jobId,
          status: "cancelled",
        };
      }

      // 3. Record completed job telemetry
      await updateGenerationJob(
        jobId,
        "completed",
        result.telemetry.tokensInput,
        result.telemetry.tokensOutput,
        result.telemetry.estimatedCost,
        result.blocks.length,
        {
          durationMs: result.telemetry.durationMs,
          repairCount: result.telemetry.repairCount,
        },
      );

      logGenerationEnd(jobId, result.telemetry);

      return {
        ...result,
        jobId,
        status: "completed" as GenerationJobStatus,
      };
    } catch (err) {
      logGenerationError(jobId, err);
      await updateGenerationJob(jobId, "failed", 0, 0, 0, 0, {
        error: err instanceof Error ? err.message : String(err),
      });

      throw err;
    }
  }

  /**
   * Regenerates a single block using AI or fallback repair
   */
  async regenerateBlock(block: AuthoringBlock, instruction: string): Promise<AuthoringBlock> {
    const provider = ProviderFactory.create(this.settings);
    const response = await provider.generate({
      prompt: `Mejora o regenera el siguiente bloque según la instrucción: "${instruction}".\nBloque actual: ${JSON.stringify(block.content_json)}`,
      temperature: 0.7,
      responseFormat: "json",
    });

    try {
      const parsed = JSON.parse(response.text);
      const newContent = parsed.content_json || parsed.content || parsed;
      const { repairedBlock } = autoRepairBlock({
        ...block,
        content_json: newContent,
      });
      return repairedBlock;
    } catch {
      return block;
    }
  }

  /**
   * Regenerates a single section by replacing section blocks
   */
  async regenerateSection(
    sectionPlan: LessonPlan["sections"][0],
    language = "Español",
  ): Promise<AuthoringBlock[]> {
    const provider = ProviderFactory.create(this.settings);
    const blockGen = new (await import("../pipeline/blockGenerator")).BlockGenerator(provider);

    const tempPlan: LessonPlan = {
      title: sectionPlan.title,
      objectives: [sectionPlan.purpose],
      level: "Intermedio",
      estimatedDurationMinutes: 5,
      sections: [sectionPlan],
      estimatedBlocksCount: 3,
    };

    const { blocks } = await blockGen.generateBlocks(tempPlan, { language });
    return blocks;
  }
}
