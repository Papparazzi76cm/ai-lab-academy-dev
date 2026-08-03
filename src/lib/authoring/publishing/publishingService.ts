import { supabase } from "@/integrations/supabase/client";
import type { AuthoringBlock, LessonVersion, VersionDiff, ModifiedBlockDiff } from "../types";

export interface PublishResult {
  success: boolean;
  version_number?: number;
  revision?: number;
  published_at?: string;
  errors?: Array<{ block_id?: string; field?: string; message: string }>;
}

export async function publishLesson(
  lessonId: string,
  commitMessage?: string,
): Promise<PublishResult> {
  const { data, error } = await supabase.rpc(
    "publish_lesson_rpc" as never,
    {
      p_lesson_id: lessonId,
      p_commit_message: commitMessage || null,
    } as never,
  );

  if (error) {
    throw new Error(error.message || "Error al publicar la lección.");
  }

  const result = data as unknown as PublishResult;
  if (
    result &&
    result.success === false &&
    Array.isArray(result.errors) &&
    result.errors.length > 0
  ) {
    const errorDetails = result.errors
      .map((e) => `• ${e.field || "Bloque"}: ${e.message}`)
      .join("\n");
    throw new Error(`Errores de validación en el servidor:\n${errorDetails}`);
  }

  return result;
}

export async function fetchLessonVersions(
  lessonId: string,
  limit: number = 10,
  offset: number = 0,
): Promise<{ total: number; versions: LessonVersion[] }> {
  const { data, error } = await supabase.rpc(
    "get_lesson_versions_rpc" as never,
    {
      p_lesson_id: lessonId,
      p_limit: limit,
      p_offset: offset,
    } as never,
  );

  if (error) {
    console.error("Error fetching lesson versions via RPC, falling back to direct query:", error);
    const { data: fallbackData, error: fallbackErr } = await (
      supabase.from as (table: string) => ReturnType<typeof supabase.from>
    )("lesson_versions")
      .select("*")
      .eq("lesson_id" as never, lessonId as never)
      .order("version_number" as never, { ascending: false } as never);

    if (fallbackErr) return { total: 0, versions: [] };

    const rawRows = fallbackData as unknown as Record<string, unknown>[] | null;
    const mapped: LessonVersion[] = (rawRows || []).map((v) => ({
      id: String(v["id"] || ""),
      lesson_id: String(v["lesson_id"] || ""),
      version_number: Number(v["version_number"] || 1),
      blocks_snapshot: (v["blocks_snapshot"] as unknown as AuthoringBlock[]) || [],
      commit_message: (v["commit_message"] as string) || null,
      published_by: (v["published_by"] as string) || null,
      created_at: String(v["created_at"] || new Date().toISOString()),
    }));

    return { total: mapped.length, versions: mapped };
  }

  const payload = data as unknown as { total: number; versions: LessonVersion[] };
  return {
    total: payload?.total || 0,
    versions: payload?.versions || [],
  };
}

export async function restoreLessonVersion(lessonId: string, versionNumber: number) {
  const { data, error } = await supabase.rpc(
    "restore_lesson_version_rpc" as never,
    {
      p_lesson_id: lessonId,
      p_version_number: versionNumber,
    } as never,
  );

  if (error) {
    throw new Error(error.message || "Error al restaurar la versión.");
  }

  return data;
}

export function compareLessonVersions(
  oldBlocks: AuthoringBlock[],
  newBlocks: AuthoringBlock[],
): VersionDiff {
  const oldMap = new Map(oldBlocks.map((b) => [b.id, b]));
  const newMap = new Map(newBlocks.map((b) => [b.id, b]));

  const addedBlocks: AuthoringBlock[] = [];
  const removedBlocks: AuthoringBlock[] = [];
  const modifiedBlocks: ModifiedBlockDiff[] = [];

  newBlocks.forEach((newBlock) => {
    const oldBlock = oldMap.get(newBlock.id);
    if (!oldBlock) {
      addedBlocks.push(newBlock);
    } else {
      const changes: string[] = [];
      if (oldBlock.type !== newBlock.type) {
        changes.push(`Tipo cambiado de '${oldBlock.type}' a '${newBlock.type}'`);
      }
      if (oldBlock.position !== newBlock.position) {
        changes.push(`Posición movida de ${oldBlock.position} a ${newBlock.position}`);
      }
      if (JSON.stringify(oldBlock.content_json) !== JSON.stringify(newBlock.content_json)) {
        changes.push("Contenido modificado");
      }
      if (JSON.stringify(oldBlock.settings_json) !== JSON.stringify(newBlock.settings_json)) {
        changes.push("Ajustes modificados");
      }

      if (changes.length > 0) {
        modifiedBlocks.push({ oldBlock, newBlock, changes });
      }
    }
  });

  oldBlocks.forEach((oldBlock) => {
    if (!newMap.has(oldBlock.id)) {
      removedBlocks.push(oldBlock);
    }
  });

  return {
    addedBlocks,
    removedBlocks,
    modifiedBlocks,
  };
}
