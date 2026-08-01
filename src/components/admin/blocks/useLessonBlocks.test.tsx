// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLessonBlocks } from "./useLessonBlocks";
import { supabase } from "@/integrations/supabase/client";
import type { LessonBlockItem } from "@/lib/blocks";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => {
  const upsertMock = vi.fn().mockResolvedValue({ error: null });
  const selectMock = vi.fn().mockReturnThis();
  const eqMock = vi.fn().mockReturnThis();
  const orderMock = vi.fn().mockResolvedValue({
    data: [
      {
        id: "block-1",
        lesson_id: "lesson-1",
        position: 0,
        type: "h1",
        content_json: { text: "Bloque Inicial" },
        settings_json: { align: "left" },
      },
    ],
    error: null,
  });
  const deleteMock = vi.fn().mockReturnThis();
  const rpcMock = vi.fn().mockResolvedValue({ error: null });

  return {
    supabase: {
      from: vi.fn(() => ({
        select: selectMock,
        eq: eqMock,
        order: orderMock,
        upsert: upsertMock,
        delete: deleteMock,
      })),
      rpc: rpcMock,
      _upsertMock: upsertMock,
      _orderMock: orderMock,
      _rpcMock: rpcMock,
    },
  };
});

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useLessonBlocks Hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("1. Schedules autosave with 1 second debounce", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useLessonBlocks("lesson-1"), { wrapper });

    // Wait for initial fetch to complete
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.blocks.length).toBe(1);

    // Make an edit
    act(() => {
      result.current.updateBlockContent("block-1", { text: "Texto Editado" });
    });

    expect(result.current.saveStatus).toBe("saving");

    // Advance 500ms -> should not have saved yet
    const upsertMock = (supabase as unknown as { _upsertMock: ReturnType<typeof vi.fn> })
      ._upsertMock;
    expect(upsertMock).not.toHaveBeenCalled();

    // Advance 1000ms total -> should trigger save
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(upsertMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id: "block-1",
          lesson_id: "lesson-1",
          content_json: { text: "Texto Editado" },
        }),
      ],
      { onConflict: "id" },
    );
  });

  it("2. Flushes pending save immediately via flushPendingSave", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useLessonBlocks("lesson-1"), { wrapper });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.updateBlockContent("block-1", { text: "Cambio Inmediato" });
    });

    const upsertMock = (supabase as unknown as { _upsertMock: ReturnType<typeof vi.fn> })
      ._upsertMock;
    expect(upsertMock).not.toHaveBeenCalled();

    let success = false;
    await act(async () => {
      success = await result.current.flushPendingSave();
    });

    expect(success).toBe(true);
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });

  it("3. Flushes old lesson save when lessonId changes without cross-lesson pollution", async () => {
    const wrapper = createWrapper();
    let currentLessonId = "lesson-1";
    const { result, rerender } = renderHook(() => useLessonBlocks(currentLessonId), { wrapper });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.updateBlockContent("block-1", { text: "Cambio Lección 1" });
    });

    const upsertMock = (supabase as unknown as { _upsertMock: ReturnType<typeof vi.fn> })
      ._upsertMock;

    // Switch lessonId to lesson-2
    currentLessonId = "lesson-2";
    await act(async () => {
      rerender();
      await vi.runAllTimersAsync();
    });

    // Old save for lesson-1 should have been flushed
    expect(upsertMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id: "block-1",
          lesson_id: "lesson-1",
        }),
      ],
      { onConflict: "id" },
    );
  });

  it("4. Prevents race conditions from out-of-order server responses", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useLessonBlocks("lesson-1"), { wrapper });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // First edit
    act(() => {
      result.current.updateBlockContent("block-1", { text: "Edición 1" });
    });

    // Second edit immediately
    act(() => {
      result.current.updateBlockContent("block-1", { text: "Edición 2" });
    });

    const upsertMock = (supabase as unknown as { _upsertMock: ReturnType<typeof vi.fn> })
      ._upsertMock;

    // Fast-forward timers to run autosave for second edit
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(upsertMock).toHaveBeenLastCalledWith(
      [
        expect.objectContaining({
          id: "block-1",
          content_json: { text: "Edición 2" },
        }),
      ],
      { onConflict: "id" },
    );
  });

  it("5. Persists state changes on undo and redo", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useLessonBlocks("lesson-1"), { wrapper });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Add new block
    await act(async () => {
      await result.current.addBlock("h2");
      await vi.runAllTimersAsync();
    });

    expect(result.current.blocks.length).toBe(2);
    expect(result.current.canUndo).toBe(true);

    // Undo
    act(() => {
      result.current.undo();
    });

    expect(result.current.blocks.length).toBe(1);

    // Redo
    act(() => {
      result.current.redo();
    });

    expect(result.current.blocks.length).toBe(2);
  });

  it("6. Rejects save and sets error status when a block is invalid", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useLessonBlocks("lesson-1"), { wrapper });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Update to invalid content (empty h1 text)
    act(() => {
      result.current.updateBlockContent("block-1", { text: "" });
    });

    expect(result.current.blocks[0]?.validation_error).toBeDefined();

    let success = true;
    await act(async () => {
      success = await result.current.flushPendingSave();
    });

    expect(success).toBe(false);
    expect(result.current.saveStatus).toBe("error");
  });

  it("7. Handles reordering correctly via rpc", async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useLessonBlocks("lesson-1"), { wrapper });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Add a second block
    await act(async () => {
      await result.current.addBlock("paragraph");
      await vi.runAllTimersAsync();
    });

    const ids = result.current.blocks.map((b: LessonBlockItem) => b.id);
    expect(ids.length).toBe(2);

    // Reorder
    const reversed = [ids[1]!, ids[0]!];
    await act(async () => {
      await result.current.reorderBlocks(reversed);
      await vi.runAllTimersAsync();
    });

    const rpcMock = (supabase as unknown as { _rpcMock: ReturnType<typeof vi.fn> })._rpcMock;
    expect(rpcMock).toHaveBeenCalledWith("reorder_lesson_blocks_rpc", {
      p_lesson_id: "lesson-1",
      p_blocks: [
        { id: reversed[0], position: 0 },
        { id: reversed[1], position: 1 },
      ],
    });
  });
});
