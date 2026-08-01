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

export function useLessonBlocks(lessonId: string) {
  const queryClient = useQueryClient();
  const [blocks, setBlocks] = useState<LessonBlockItem[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [expandedBlockIds, setExpandedBlockIds] = useState<Set<string>>(new Set());

  // History stack for future undo / redo architecture
  const [history, setHistory] = useState<LessonBlockItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const pendingSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);

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

  // Sync query data to local state & initial history stack
  useEffect(() => {
    if (fetchedBlocks) {
      setBlocks(fetchedBlocks);
      const allIds = new Set(fetchedBlocks.map((b) => b.id));
      setExpandedBlockIds(allIds);
      if (isInitialLoadRef.current) {
        setHistory([fetchedBlocks]);
        setHistoryIndex(0);
        isInitialLoadRef.current = false;
      }
    }
  }, [fetchedBlocks]);

  // Helper to push state snapshot into history stack
  const pushHistory = useCallback(
    (newBlocks: LessonBlockItem[]) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, newBlocks];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex],
  );

  // 2. Autosave mutation (debounced)
  const saveMutation = useMutation({
    mutationFn: async (blocksToSave: LessonBlockItem[]) => {
      // Validate all blocks before saving
      for (const b of blocksToSave) {
        const check = validateBlockContent(b.type, b.content_json);
        if (!check.valid) {
          throw new Error(`Bloque "${b.type}": ${check.error}`);
        }
      }

      // Upsert blocks in batch
      const payload = blocksToSave.map((b, idx) => ({
        id: b.id,
        lesson_id: lessonId,
        position: idx,
        type: b.type,
        content_json: b.content_json as unknown as import("@/integrations/supabase/types").Json,
        settings_json: b.settings_json as unknown as import("@/integrations/supabase/types").Json,
      }));

      const { error } = await supabase.from("lesson_blocks").upsert(payload, { onConflict: "id" });
      if (error) throw error;

      return true;
    },
    onMutate: () => {
      setSaveStatus("saving");
    },
    onSuccess: () => {
      setSaveStatus("saved");
      void queryClient.invalidateQueries({ queryKey });
      setTimeout(() => {
        setSaveStatus((current) => (current === "saved" ? "idle" : current));
      }, 2000);
    },
    onError: (err: Error) => {
      setSaveStatus("error");
      toast.error(`Error al autoguardar: ${err.message}`);
    },
  });

  // Debounced save trigger
  const scheduleAutosave = useCallback(
    (newBlocks: LessonBlockItem[]) => {
      if (pendingSaveTimeoutRef.current) {
        clearTimeout(pendingSaveTimeoutRef.current);
      }
      setSaveStatus("saving");
      pendingSaveTimeoutRef.current = setTimeout(() => {
        saveMutation.mutate(newBlocks);
      }, 1000); // ~1 second debounce
    },
    [saveMutation],
  );

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (pendingSaveTimeoutRef.current) {
        clearTimeout(pendingSaveTimeoutRef.current);
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

      // Re-index positions
      const reindexed = updated.map((b, idx) => ({ ...b, position: idx }));

      setBlocks(reindexed);
      setExpandedBlockIds((prev) => new Set([...prev, newId]));
      pushHistory(reindexed);

      // Save directly
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
          return {
            ...b,
            content_json: { ...b.content_json, ...content_json },
            settings_json: settings_json
              ? { ...b.settings_json, ...settings_json }
              : b.settings_json,
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

      // Delete from DB immediately and schedule autosave for remaining
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

      // Persist via atomic RPC
      setSaveStatus("saving");
      try {
        const payload = nextBlocks.map((b) => ({ id: b.id, position: b.position }));
        const { error } = await supabase.rpc("reorder_lesson_blocks_rpc", {
          p_lesson_id: lessonId,
          p_blocks: payload,
        });

        if (error) throw error;
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 1500);
      } catch (err) {
        setSaveStatus("error");
        toast.error("Error al reordenar los bloques");
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

  // Future Undo / Redo helpers
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
  };
}
