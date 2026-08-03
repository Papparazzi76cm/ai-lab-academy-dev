import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AuthoringBlock, AutosaveStatus } from "../types";

export interface SaveBlocksRpcResponse {
  success: boolean;
  revision?: number;
  error_code?: string;
  message?: string;
}

export interface UseAutosaveReturn {
  status: AutosaveStatus;
  isDirty: boolean;
  conflictMessage: string | null;
  flushPendingSave: () => Promise<boolean>;
  retrySave: () => Promise<boolean>;
}

export function useAutosave(
  lessonId: string,
  blocks: AuthoringBlock[],
  currentRevision: number,
  onRevisionUpdate: (newRev: number) => void,
  debounceMs: number = 2000,
  maxRetries: number = 3,
  initialRetryDelayMs: number = 1000,
): UseAutosaveReturn {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>(() => JSON.stringify(blocks));

  const sequenceCounterRef = useRef<number>(0);
  const retryCountRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);

  const currentSnapshot = JSON.stringify(blocks);
  const isDirty = currentSnapshot !== lastSavedSnapshot;

  const cancelTimers = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const performSaveRpc = useCallback(
    async (
      id: string,
      payloadBlocks: AuthoringBlock[],
      expectedRev: number,
      requestId: number,
    ): Promise<boolean> => {
      try {
        const { data, error } = await supabase.rpc(
          "save_lesson_blocks_rpc" as never,
          {
            p_lesson_id: id,
            p_blocks: payloadBlocks,
            p_expected_revision: expectedRev,
          } as never,
        );

        // Stale response protection: discard if sequence has moved on
        if (requestId < sequenceCounterRef.current) {
          console.warn(`[useAutosave] Discarding stale save response (request #${requestId})`);
          return false;
        }

        if (error) {
          const errObj = error as { code?: string; message?: string };
          if (errObj.code === "P0001" || errObj.message?.includes("REVISION_CONFLICT")) {
            setStatus("conflict");
            setConflictMessage(
              "Conflicto de edición: Otra persona o sesión ha actualizado esta lección. Por favor recarga la página.",
            );
            return false;
          }
          throw error;
        }

        const resData = data as unknown as SaveBlocksRpcResponse | null;
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

        const newRevision = resData?.revision ?? currentRevision + 1;
        retryCountRef.current = 0;
        onRevisionUpdate(newRevision);
        setLastSavedSnapshot(JSON.stringify(payloadBlocks));
        setStatus("saved");
        setConflictMessage(null);
        return true;
      } catch (err: unknown) {
        if (requestId >= sequenceCounterRef.current) {
          setStatus("error");
          console.error("[useAutosave] Save error:", err);

          // Schedule retry if under maxRetries limit and not in conflict
          if (retryCountRef.current < maxRetries) {
            const delay = initialRetryDelayMs * Math.pow(2, retryCountRef.current);
            retryCountRef.current += 1;
            retryTimerRef.current = setTimeout(() => {
              if (requestId === sequenceCounterRef.current) {
                const nextReqId = ++sequenceCounterRef.current;
                setStatus("saving");
                performSaveRpc(id, payloadBlocks, expectedRev, nextReqId);
              }
            }, delay);
          }
        }
        return false;
      }
    },
    [currentRevision, initialRetryDelayMs, maxRetries, onRevisionUpdate],
  );

  const flushPendingSave = useCallback(async (): Promise<boolean> => {
    cancelTimers();

    if (currentSnapshot === lastSavedSnapshot || status === "conflict") {
      return true;
    }

    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }

    const requestId = ++sequenceCounterRef.current;
    setStatus("saving");
    const success = await performSaveRpc(lessonId, blocks, currentRevision, requestId);
    if (!success) {
      throw new Error("Error al guardar cambios pendientes.");
    }
    return success;
  }, [
    blocks,
    cancelTimers,
    currentRevision,
    currentSnapshot,
    lastSavedSnapshot,
    lessonId,
    performSaveRpc,
    status,
  ]);

  const retrySave = useCallback(async (): Promise<boolean> => {
    retryCountRef.current = 0;
    return flushPendingSave();
  }, [flushPendingSave]);

  // Debounced autosave effect
  useEffect(() => {
    if (!isDirty || status === "conflict") return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      flushPendingSave().catch(() => {
        // Error state handled inside performSaveRpc
      });
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isDirty, debounceMs, flushPendingSave, status]);

  // Cleanup on unmount or lessonId change
  useEffect(() => {
    retryCountRef.current = 0;
    const controller = activeAbortControllerRef.current;
    return () => {
      cancelTimers();
      if (controller) {
        controller.abort();
      }
    };
  }, [lessonId, cancelTimers]);

  return {
    status,
    isDirty,
    conflictMessage,
    flushPendingSave,
    retrySave,
  };
}
