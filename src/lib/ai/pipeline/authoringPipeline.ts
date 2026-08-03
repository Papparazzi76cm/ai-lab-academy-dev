import type { AIProvider } from "../providers/base";
import type {
  LessonGenerationContext,
  LessonPlan,
  GenerationResult,
  TelemetryData,
} from "../types";
import { LessonPlanner } from "../planner/lessonPlanner";
import { BlockGenerator } from "./blockGenerator";
import { autoRepairBlocks } from "../validation/autoRepair";

export interface PipelineProgressCallback {
  (
    step: "planning" | "generating" | "validating" | "repairing" | "completed",
    data?: { plan?: LessonPlan },
  ): void;
}

export class AuthoringPipeline {
  constructor(private provider: AIProvider) {}

  async execute(
    prompt: string,
    context?: LessonGenerationContext,
    onProgress?: PipelineProgressCallback,
  ): Promise<GenerationResult> {
    const startTime = Date.now();

    // Step 1: Planner
    if (onProgress) onProgress("planning");
    const planner = new LessonPlanner(this.provider);
    const {
      plan,
      tokensInput: planIn,
      tokensOutput: planOut,
    } = await planner.plan(prompt, context);

    if (onProgress) onProgress("generating", { plan });

    // Step 2: Block Generator
    const blockGen = new BlockGenerator(this.provider);
    const {
      blocks: rawBlocks,
      tokensInput: genIn,
      tokensOutput: genOut,
    } = await blockGen.generateBlocks(plan, context);

    // Step 3 & 4: Validation & AutoRepair
    if (onProgress) onProgress("validating");
    if (onProgress) onProgress("repairing");

    const repairResult = autoRepairBlocks(rawBlocks);

    const endTime = Date.now();
    const totalTokensIn = planIn + genIn;
    const totalTokensOut = planOut + genOut;
    const estimatedCost = this.provider.estimateCost(totalTokensIn, totalTokensOut);

    const telemetry: TelemetryData = {
      durationMs: endTime - startTime,
      tokensInput: totalTokensIn,
      tokensOutput: totalTokensOut,
      estimatedCost,
      model: this.provider.model,
      provider: this.provider.type,
      repairCount: repairResult.repairedCount,
      errorsCount: 0,
    };

    if (onProgress) onProgress("completed");

    return {
      plan,
      blocks: repairResult.repairedBlocks,
      telemetry,
      repairLog: repairResult.log,
      status: "completed",
    };
  }
}
