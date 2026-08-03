import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AuthoringBlock, AutosaveStatus } from "../types";

export interface UseAutosaveReturn {
  status: AutosaveStatus;
  isDirty: boolean;
  conflictMessage: string | null;
  flushPendingSave: () => Promise<void>;
  retrySave: () => Promise<void>;
}

export function useAutosave(
  lessonId: string,
  blocks: AuthoringBlock[],
  currentRevision: number,
  onRevisionUpdate: (newRev: number) => void,
  debounceMs: number = 2000,
): UseAutosaveReturn {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>(() => JSON.stringify(blocks));

  const sequenceCounterRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);

  const currentSnapshot = JSON.stringify(blocks);
  const isDirty = currentSnapshot !== lastSavedSnapshot;

  const performSaveRpc = useCallback(
    async (
      id: string,
      payloadBlocks: AuthoringBlock[],
      expectedRev: number,
      requestId: number,
    ): Promise<boolean> => {
      try {
        const { data, error } = await (supabase.rpc as any)("save_lesson_blocks_rpc", {
          p_lesson_id: id,
          p_blocks: payloadBlocks,
          p_expected_revision: expectedRev,
        });

        // Stale response protection
        if (requestId < sequenceCounterRef.current) {
          console.warn(`[useAutosave] Discarding stale save response (request #${requestId})`);
          return false;
        }

        if (error) {
          if (error.code === "P0001" || error.message?.includes("REVISION_CONFLICT")) {
            setStatus("conflict");
            setConflictMessage(
              "Conflicto de edición: Otra persona o sesión ha actualizado esta lección. Por favor recarga la página.",
            );
            return false;
          }
          throw error;
        }

        const resData = data as any;
        if (resData && resData.success === false) {
          if (resData.error_code === "REVISION_CONFLICT") {
            setStatus("conflict");
            setConflictMessage(
              resData.message || "Conflicto de revisión detectado. Guarda tus cambios localmente.",
            );
            return false;
          }
          throw new Error(resData.message || "Error al guardar bloques.");
        }

        const newRevision = (resData?.revision as number) ?? currentRevision + 1;
        onRevisionUpdate(newRevision);
        setLastSavedSnapshot(JSON.stringify(payloadBlocks));
        setStatus("saved");
        setConflictMessage(null);
        return true;
      } catch (err: unknown) {
        if (requestId >= sequenceCounterRef.current) {
          setStatus("error");
          console.error("[useAutosave] Save error:", err);
        }
        return false;
      }
    },
    [currentRevision, onRevisionUpdate],
  );

  const flushPendingSave = useCallback(async (): Promise<void> => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (currentSnapshot === lastSavedSnapshot || status === "conflict") {
      return;
    }

    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }

    const requestId = ++sequenceCounterRef.current;
    setStatus("saving");
    await performSaveRpc(lessonId, blocks, currentRevision, requestId);
  }, [
    blocks,
    currentRevision,
    currentSnapshot,
    lastSavedSnapshot,
    lessonId,
    performSaveRpc,
    status,
  ]);

  // Debounced autosave effect
  useEffect(() => {
    if (!isDirty || status === "conflict") return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      flushPendingSave();
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isDirty, debounceMs, flushPendingSave, status]);

  // Cleanup on unmount or lessonId change
  useEffect(() => {
    return () => {
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [lessonId]);

  return {
    status,
    isDirty,
    conflictMessage,
    flushPendingSave,
    retrySave: flushPendingSave,
  };
}
