import { useState, useEffect, useRef, useCallback } from "react";
import type { AuthoringBlock, AutosaveStatus } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UseAutosaveResult {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  serverRevision: number;
  saveNow: () => Promise<boolean>;
  flushPendingSave: () => Promise<boolean>;
  conflictMessage: string | null;
}

export function useAutosave(
  lessonId: string | null,
  blocks: AuthoringBlock[],
  initialRevision: number = 1,
  onRevisionUpdated?: (newRevision: number) => void,
): UseAutosaveResult {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [serverRevision, setServerRevision] = useState<number>(initialRevision);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  const lastSavedBlocksRef = useRef<string>("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sequenceCounterRef = useRef<number>(0);
  const currentLessonIdRef = useRef<string | null>(lessonId);
  const blocksRef = useRef<AuthoringBlock[]>(blocks);
  const serverRevisionRef = useRef<number>(initialRevision);

  blocksRef.current = blocks;
  serverRevisionRef.current = serverRevision;

  // Reset when lessonId changes
  useEffect(() => {
    if (lessonId !== currentLessonIdRef.current) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      currentLessonIdRef.current = lessonId;
      setServerRevision(initialRevision);
      serverRevisionRef.current = initialRevision;
      lastSavedBlocksRef.current = JSON.stringify(blocks);
      setStatus("idle");
      setConflictMessage(null);
    }
  }, [lessonId, initialRevision, blocks]);

  const executeSave = useCallback(
    async (blocksToSave: AuthoringBlock[]): Promise<boolean> => {
      const activeLessonId = currentLessonIdRef.current;
      if (!activeLessonId) return false;

      const serialized = JSON.stringify(blocksToSave);
      if (serialized === lastSavedBlocksRef.current && status === "saved") {
        return true;
      }

      // Increment sequence ID to discard stale out-of-order responses
      const currentSeq = ++sequenceCounterRef.current;
      setStatus("saving");

      try {
        const payload = blocksToSave.map((b, idx) => ({
          id: b.id,
          lesson_id: activeLessonId,
          type: b.type,
          position: idx,
          content_json: b.content_json,
          settings_json: { ...b.settings_json, visibility: b.visibility },
        }));

        const { data, error } = await supabase.rpc("save_lesson_blocks_rpc", {
          p_lesson_id: activeLessonId,
          p_blocks: payload,
          p_expected_revision: serverRevisionRef.current,
        });

        // Ignore response if sequence or lesson changed during inflight request
        if (
          currentSeq !== sequenceCounterRef.current ||
          activeLessonId !== currentLessonIdRef.current
        ) {
          return false;
        }

        if (error) {
          if (error.message.includes("REVISION_CONFLICT")) {
            setStatus("conflict");
            const conflictMsg =
              "La lección fue modificada en otra sesión. Recarga para evitar sobrescribir cambios.";
            setConflictMessage(conflictMsg);
            toast.error("Conflicto de Edición", { description: conflictMsg });
            return false;
          }
          throw error;
        }

        const newRevision = data?.revision ? Number(data.revision) : serverRevisionRef.current + 1;
        setServerRevision(newRevision);
        serverRevisionRef.current = newRevision;
        if (onRevisionUpdated) {
          onRevisionUpdated(newRevision);
        }

        lastSavedBlocksRef.current = serialized;
        setStatus("saved");
        setLastSavedAt(new Date());
        setConflictMessage(null);
        return true;
      } catch (err) {
        if (currentSeq !== sequenceCounterRef.current) return false;
        console.error("Autosave error:", err);
        setStatus("error");
        toast.error("Error al guardar borrador de lección");
        return false;
      }
    },
    [onRevisionUpdated, status],
  );

  const flushPendingSave = useCallback(async (): Promise<boolean> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    return await executeSave(blocksRef.current);
  }, [executeSave]);

  // Schedule debounced 2s autosave on change
  useEffect(() => {
    if (!lessonId) return;

    const serialized = JSON.stringify(blocks);
    if (serialized !== lastSavedBlocksRef.current && status !== "conflict") {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        executeSave(blocksRef.current);
      }, 2000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [blocks, lessonId, status, executeSave]);

  return {
    status,
    lastSavedAt,
    serverRevision,
    saveNow: () => executeSave(blocksRef.current),
    flushPendingSave,
    conflictMessage,
  };
}
