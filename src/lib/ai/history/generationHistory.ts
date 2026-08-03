import { supabase } from "@/integrations/supabase/client";
import type { GenerationJob, GenerationJobStatus } from "../types";

export async function createGenerationJob(
  lessonId: string,
  provider: string,
  model: string,
  prompt: string,
  metadata: Record<string, unknown> = {},
): Promise<string> {
  try {
    const { data, error } = await (
      supabase.rpc as unknown as (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: { success: boolean; job_id: string }; error: unknown }>
    )("create_generation_job_rpc", {
      p_lesson_id: lessonId,
      p_provider: provider,
      p_model: model,
      p_prompt: prompt,
      p_metadata: metadata,
    });

    if (error) {
      console.warn("create_generation_job_rpc failed, returning local job ID:", error);
      return `job-local-${Math.random().toString(36).substring(2, 9)}`;
    }

    return data?.job_id || `job-local-${Math.random().toString(36).substring(2, 9)}`;
  } catch (err) {
    console.warn("Error calling create_generation_job_rpc:", err);
    return `job-local-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export async function updateGenerationJob(
  jobId: string,
  status: GenerationJobStatus,
  tokensInput = 0,
  tokensOutput = 0,
  estimatedCost = 0,
  createdBlocks = 0,
  metadata: Record<string, unknown> = {},
): Promise<boolean> {
  if (jobId.startsWith("job-local-")) {
    return true;
  }

  try {
    const { data, error } = await (
      supabase.rpc as unknown as (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: { success: boolean }; error: unknown }>
    )("update_generation_job_rpc", {
      p_job_id: jobId,
      p_status: status,
      p_tokens_input: tokensInput,
      p_tokens_output: tokensOutput,
      p_estimated_cost: estimatedCost,
      p_created_blocks: createdBlocks,
      p_metadata: metadata,
    });

    if (error) {
      console.warn("update_generation_job_rpc error:", error);
      return false;
    }

    return Boolean(data?.success);
  } catch (err) {
    console.warn("Error calling update_generation_job_rpc:", err);
    return false;
  }
}

export async function cancelGenerationJob(jobId: string): Promise<boolean> {
  if (jobId.startsWith("job-local-")) {
    return true;
  }

  try {
    const { data, error } = await (
      supabase.rpc as unknown as (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: { success: boolean }; error: unknown }>
    )("cancel_generation_job_rpc", {
      p_job_id: jobId,
    });

    if (error) {
      console.warn("cancel_generation_job_rpc error:", error);
      return false;
    }

    return Boolean(data?.success);
  } catch (err) {
    console.warn("Error calling cancel_generation_job_rpc:", err);
    return false;
  }
}
