import { useState, useEffect, useRef, useCallback } from "react";
import type { AuthoringBlock, AutosaveStatus } from "../types";
import { supabase } from "@/integrations/supabase/client";

export function useAutosave(lessonId: string | null, blocks: AuthoringBlock[]) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const lastSavedBlocksRef = useRef<string>("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const saveBlocks = useCallback(
    async (currentBlocks: AuthoringBlock[]) => {
      if (!lessonId) return;

      const jsonString = JSON.stringify(currentBlocks);
      if (jsonString === lastSavedBlocksRef.current) {
        return;
      }

      setStatus("saving");

      try {
        // Re-map positions to ensure strictly sequential ordering
        const payload = currentBlocks.map((b, idx) => ({
          id: b.id.startsWith("blk_") ? undefined : b.id,
          lesson_id: lessonId,
          type: b.type,
          position: idx,
          content_json: b.content_json as unknown as Record<string, unknown>,
          settings_json: { ...b.settings_json, visibility: b.visibility } as unknown as Record<
            string,
            unknown
          >,
          updated_at: new Date().toISOString(),
        }));

        const { error: deleteErr } = await supabase
          .from("lesson_blocks")
          .delete()
          .eq("lesson_id", lessonId);

        if (deleteErr) throw deleteErr;

        if (payload.length > 0) {
          const { error: insertErr } = await supabase.from("lesson_blocks").insert(payload);
          if (insertErr) throw insertErr;
        }

        lastSavedBlocksRef.current = jsonString;
        setStatus("saved");
        setLastSavedAt(new Date());
      } catch (err) {
        console.error("Autosave failed:", err);
        setStatus("error");
        // Retry in 5s
        setTimeout(() => {
          saveBlocks(currentBlocks);
        }, 5000);
      }
    },
    [lessonId],
  );

  useEffect(() => {
    if (!lessonId) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const jsonString = JSON.stringify(blocks);
    if (jsonString !== lastSavedBlocksRef.current) {
      timerRef.current = setTimeout(() => {
        saveBlocks(blocks);
      }, 2000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [blocks, lessonId, saveBlocks]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (blocks.length > 0 && lessonId) {
        saveBlocks(blocks);
      }
    };
  }, [blocks, lessonId, saveBlocks]);

  return {
    status,
    lastSavedAt,
    saveNow: () => saveBlocks(blocks),
  };
}
