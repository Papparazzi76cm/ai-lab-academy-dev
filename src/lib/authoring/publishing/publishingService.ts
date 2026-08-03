import { supabase } from "@/integrations/supabase/client";
import type { AuthoringBlock, LessonVersion, VersionDiff, ModifiedBlockDiff } from "../types";

export async function publishLesson(lessonId: string, commitMessage?: string) {
  const { data, error } = await supabase.rpc("publish_lesson_rpc", {
    p_lesson_id: lessonId,
    p_commit_message: commitMessage || null,
  });

  if (error) {
    throw new Error(error.message || "Error al publicar la lección.");
  }

  return data;
}

export async function fetchLessonVersions(lessonId: string): Promise<LessonVersion[]> {
  const { data, error } = await supabase
    .from("lesson_versions")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("version_number", { ascending: false });

  if (error) {
    console.error("Error fetching lesson versions:", error);
    return [];
  }

  return (data || []).map((v) => ({
    id: v.id,
    lesson_id: v.lesson_id,
    version_number: v.version_number,
    blocks_snapshot: (v.blocks_snapshot as unknown as AuthoringBlock[]) || [],
    commit_message: v.commit_message,
    published_by: v.published_by,
    created_at: v.created_at,
  }));
}

export async function restoreLessonVersion(lessonId: string, versionNumber: number) {
  const { data, error } = await supabase.rpc("restore_lesson_version_rpc", {
    p_lesson_id: lessonId,
    p_version_number: versionNumber,
  });

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

  // Find added and modified
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

  // Find removed
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
