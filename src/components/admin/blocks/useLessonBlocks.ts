import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  type BlockType,
  type LessonBlockItem,
  getDefaultBlockPayload,
  validateBlockContent,
} from "@/lib/blocks";
import { toast } from "sonner";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const MAX_HISTORY_LENGTH = 50;

export function useLessonBlocks(lessonId: string) {
  const queryClient = useQueryClient();
  const [blocks, setBlocks] = useState<LessonBlockItem[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [expandedBlockIds, setExpandedBlockIds] = useState<Set<string>>(new Set());

  // History stack for undo / redo scoped to current lessonId
  const [history, setHistory] = useState<LessonBlockItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const pendingSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveBlocksRef = useRef<{ blocks: LessonBlockItem[]; lessonId: string } | null>(null);
  const isDirtyRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const currentLessonIdRef = useRef<string>(lessonId);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 1. Fetch blocks from Supabase
  const queryKey = ["lesson-blocks", lessonId];

  const {
    data: fetchedBlocks,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!lessonId) return [];
      const { data, error } = await supabase
        .from("lesson_blocks")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("position", { ascending: true });

      if (error) throw error;
      return (data as LessonBlockItem[]) || [];
    },
    enabled: Boolean(lessonId),
  });

  // Reset state when lessonId changes
  useEffect(() => {
    if (currentLessonIdRef.current !== lessonId) {
      // Flush any pending save for old lesson
      if (pendingSaveBlocksRef.current && pendingSaveTimeoutRef.current) {
        clearTimeout(pendingSaveTimeoutRef.current);
        const { blocks: oldBlocks, lessonId: oldLessonId } = pendingSaveBlocksRef.current;
        void saveBlocksToSupabase(oldBlocks, oldLessonId);
        pendingSaveBlocksRef.current = null;
      }

      currentLessonIdRef.current = lessonId;
      isDirtyRef.current = false;
      setHistory([]);
      setHistoryIndex(-1);
      setBlocks([]);
    }
  }, [lessonId]);

  // Sync query data to local state WITHOUT overwriting active local edits or server responses to history
  useEffect(() => {
    if (fetchedBlocks) {
      // If user has local dirty edits pending, do not let stale server response overwrite them
      if (isDirtyRef.current && pendingSaveBlocksRef.current) {
        return;
      }

      // Validate fetched blocks
      const validated = fetchedBlocks.map((b) => {
        const check = validateBlockContent(b.type, b.content_json);
        return {
          ...b,
          validation_error: check.valid ? undefined : check.error,
        };
      });

      setBlocks(validated);
      const allIds = new Set(validated.map((b) => b.id));
      setExpandedBlockIds(allIds);

      // Only set initial history if empty
      setHistory((prev) => (prev.length === 0 ? [validated] : prev));
      setHistoryIndex((prev) => (prev === -1 ? 0 : prev));
    }
  }, [fetchedBlocks]);

  // Helper to push user actions to history stack (max 50)
  const pushHistory = useCallback(
    (newBlocks: LessonBlockItem[]) => {
      setHistory((prev) => {
        const sliced = historyIndex >= 0 ? prev.slice(0, historyIndex + 1) : [];
        const updated = [...sliced, newBlocks];
        return updated.slice(-MAX_HISTORY_LENGTH);
      });
      setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY_LENGTH - 1));
    },
    [historyIndex],
  );

  // Core save function
  const saveBlocksToSupabase = async (blocksToSave: LessonBlockItem[], targetLessonId: string) => {
    if (!targetLessonId) return false;

    // Filter valid blocks to save, skip saving blocks with validation errors
    const validBlocks = blocksToSave.filter((b) => {
      const check = validateBlockContent(b.type, b.content_json);
      return check.valid;
    });

    if (validBlocks.length === 0 && blocksToSave.length > 0) {
      if (isMountedRef.current) setSaveStatus("error");
      return false;
    }

    const payload = validBlocks.map((b, idx) => ({
      id: b.id,
      lesson_id: targetLessonId,
      position: idx,
      type: b.type,
      content_json: b.content_json as unknown as import("@/integrations/supabase/types").Json,
      settings_json: b.settings_json as unknown as import("@/integrations/supabase/types").Json,
    }));

    try {
      if (isMountedRef.current) setSaveStatus("saving");
      const { error } = await supabase.from("lesson_blocks").upsert(payload, { onConflict: "id" });
      if (error) throw error;

      if (isMountedRef.current) {
        setSaveStatus("saved");
        isDirtyRef.current = false;
        setTimeout(() => {
          if (isMountedRef.current) {
            setSaveStatus((current) => (current === "saved" ? "idle" : current));
          }
        }, 1500);
      }
      return true;
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setSaveStatus("error");
        const msg = err instanceof Error ? err.message : "Error al guardar";
        toast.error(`Error al autoguardar: ${msg}`);
      }
      return false;
    }
  };

  // Immediate Flush function for pending saves
  const flushPendingSave = useCallback(async () => {
    if (pendingSaveTimeoutRef.current) {
      clearTimeout(pendingSaveTimeoutRef.current);
      pendingSaveTimeoutRef.current = null;
    }
    if (pendingSaveBlocksRef.current) {
      const { blocks: blocksToSave, lessonId: targetLessonId } = pendingSaveBlocksRef.current;
      pendingSaveBlocksRef.current = null;
      await saveBlocksToSupabase(blocksToSave, targetLessonId);
    }
  }, []);

  // Debounced save scheduler (~1 second)
  const scheduleAutosave = useCallback(
    (newBlocks: LessonBlockItem[]) => {
      isDirtyRef.current = true;
      pendingSaveBlocksRef.current = { blocks: newBlocks, lessonId };

      if (pendingSaveTimeoutRef.current) {
        clearTimeout(pendingSaveTimeoutRef.current);
      }

      if (isMountedRef.current) setSaveStatus("saving");

      pendingSaveTimeoutRef.current = setTimeout(() => {
        if (pendingSaveBlocksRef.current) {
          const { blocks: blocksToSave, lessonId: targetLessonId } = pendingSaveBlocksRef.current;
          pendingSaveBlocksRef.current = null;
          void saveBlocksToSupabase(blocksToSave, targetLessonId);
        }
      }, 1000);
    },
    [lessonId],
  );

  // Clean up and flush pending save on unmount
  useEffect(() => {
    return () => {
      if (pendingSaveTimeoutRef.current) {
        clearTimeout(pendingSaveTimeoutRef.current);
      }
      if (pendingSaveBlocksRef.current) {
        const { blocks: blocksToSave, lessonId: targetLessonId } = pendingSaveBlocksRef.current;
        pendingSaveBlocksRef.current = null;
        void saveBlocksToSupabase(blocksToSave, targetLessonId);
      }
    };
  }, []);

  // 3. Block operations
  const addBlock = useCallback(
    async (type: BlockType, targetIndex?: number) => {
      const payload = getDefaultBlockPayload(type);
      const newId = crypto.randomUUID();
      const insertAt = targetIndex !== undefined ? targetIndex : blocks.length;

      const newBlock: LessonBlockItem = {
        id: newId,
        lesson_id: lessonId,
        position: insertAt,
        type,
        content_json: payload.content_json,
        settings_json: payload.settings_json,
      };

      const updated = [...blocks];
      updated.splice(insertAt, 0, newBlock);
      const reindexed = updated.map((b, idx) => ({ ...b, position: idx }));

      setBlocks(reindexed);
      setExpandedBlockIds((prev) => new Set([...prev, newId]));
      pushHistory(reindexed);
      scheduleAutosave(reindexed);
    },
    [blocks, lessonId, pushHistory, scheduleAutosave],
  );

  const updateBlockContent = useCallback(
    (
      id: string,
      content_json: Record<string, unknown>,
      settings_json?: Record<string, unknown>,
    ) => {
      setBlocks((prev) => {
        const next = prev.map((b) => {
          if (b.id !== id) return b;
          const updatedContent = { ...b.content_json, ...content_json };
          const updatedSettings = settings_json
            ? { ...b.settings_json, ...settings_json }
            : b.settings_json;

          const check = validateBlockContent(b.type, updatedContent);

          return {
            ...b,
            content_json: updatedContent,
            settings_json: updatedSettings,
            validation_error: check.valid ? undefined : check.error,
          };
        });

        scheduleAutosave(next);
        return next;
      });
    },
    [scheduleAutosave],
  );

  const duplicateBlock = useCallback(
    (id: string) => {
      const index = blocks.findIndex((b) => b.id === id);
      if (index < 0) return;

      const target = blocks[index];
      if (!target) return;

      const copyId = crypto.randomUUID();
      const copy: LessonBlockItem = {
        id: copyId,
        lesson_id: target.lesson_id,
        position: index + 1,
        type: target.type,
        content_json: JSON.parse(JSON.stringify(target.content_json)),
        settings_json: JSON.parse(JSON.stringify(target.settings_json)),
      };

      const updated = [...blocks];
      updated.splice(index + 1, 0, copy);
      const reindexed = updated.map((b, idx) => ({ ...b, position: idx }));

      setBlocks(reindexed);
      setExpandedBlockIds((prev) => new Set([...prev, copyId]));
      pushHistory(reindexed);
      scheduleAutosave(reindexed);
      toast.info("Bloque duplicado");
    },
    [blocks, pushHistory, scheduleAutosave],
  );

  const deleteBlock = useCallback(
    async (id: string) => {
      const updated = blocks.filter((b) => b.id !== id);
      const reindexed = updated.map((b, idx) => ({ ...b, position: idx }));

      setBlocks(reindexed);
      pushHistory(reindexed);

      const { error } = await supabase.from("lesson_blocks").delete().eq("id", id);
      if (error) {
        toast.error("No se pudo eliminar el bloque");
        refetch();
        return;
      }

      scheduleAutosave(reindexed);
      toast.success("Bloque eliminado");
    },
    [blocks, pushHistory, refetch, scheduleAutosave],
  );

  const reorderBlocks = useCallback(
    async (reorderedIds: string[]) => {
      const map = new Map(blocks.map((b) => [b.id, b]));
      const nextBlocks: LessonBlockItem[] = [];

      reorderedIds.forEach((id, idx) => {
        const b = map.get(id);
        if (b) {
          nextBlocks.push({ ...b, position: idx });
        }
      });

      setBlocks(nextBlocks);
      pushHistory(nextBlocks);

      setSaveStatus("saving");
      try {
        const payload = nextBlocks.map((b) => ({ id: b.id, position: b.position }));
        const { error } = await supabase.rpc("reorder_lesson_blocks_rpc", {
          p_lesson_id: lessonId,
          p_blocks: payload,
        });

        if (error) throw error;
        setSaveStatus("saved");
        setTimeout(() => {
          if (isMountedRef.current) setSaveStatus("idle");
        }, 1500);
      } catch {
        if (isMountedRef.current) {
          setSaveStatus("error");
          toast.error("Error al reordenar los bloques");
        }
      }
    },
    [blocks, lessonId, pushHistory],
  );

  const toggleCollapse = useCallback((id: string) => {
    setExpandedBlockIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedBlockIds(new Set(blocks.map((b) => b.id)));
  }, [blocks]);

  const collapseAll = useCallback(() => {
    setExpandedBlockIds(new Set());
  }, []);

  // Undo / Redo
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = useCallback(() => {
    if (!canUndo) return;
    const prevIndex = historyIndex - 1;
    const targetState = history[prevIndex];
    if (targetState) {
      setHistoryIndex(prevIndex);
      setBlocks(targetState);
      scheduleAutosave(targetState);
    }
  }, [canUndo, history, historyIndex, scheduleAutosave]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    const nextIndex = historyIndex + 1;
    const targetState = history[nextIndex];
    if (targetState) {
      setHistoryIndex(nextIndex);
      setBlocks(targetState);
      scheduleAutosave(targetState);
    }
  }, [canRedo, history, historyIndex, scheduleAutosave]);

  return {
    blocks,
    isLoading,
    isError,
    saveStatus,
    expandedBlockIds,
    canUndo,
    canRedo,
    addBlock,
    updateBlockContent,
    duplicateBlock,
    deleteBlock,
    reorderBlocks,
    toggleCollapse,
    expandAll,
    collapseAll,
    undo,
    redo,
    refetch,
    flushPendingSave,
  };
}
