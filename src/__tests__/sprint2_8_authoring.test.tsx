// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHistory } from "../lib/authoring/history/useHistory";
import { useAutosave } from "../lib/authoring/autosave/useAutosave";
import { createBlock, duplicateBlock, moveBlock, deleteBlock } from "../lib/authoring/blocks/factory";
import { adaptRawBlocks } from "../lib/authoring/blocks/adapter";
import { validateLesson } from "../lib/authoring/validation/lessonValidation";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase RPC
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe("Sprint 2.8 Authoring Studio Architecture & Autosave Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. useHistory handles push, undo, redo and reset correctly", () => {
    const initialBlock = createBlock("heading", { text: "Header" });
    const { result } = renderHook(() => useHistory([initialBlock]));

    expect(result.current.blocks).toHaveLength(1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    // Push new block
    const paragraphBlock = createBlock("paragraph", { text: "Paragraph text" });
    act(() => {
      result.current.pushState([...result.current.blocks, paragraphBlock]);
    });

    expect(result.current.blocks).toHaveLength(2);
    expect(result.current.canUndo).toBe(true);

    // Undo
    act(() => {
      result.current.undo();
    });

    expect(result.current.blocks).toHaveLength(1);
    expect(result.current.canRedo).toBe(true);

    // Redo
    act(() => {
      result.current.redo();
    });

    expect(result.current.blocks).toHaveLength(2);

    // Reset
    act(() => {
      result.current.resetHistory([initialBlock]);
    });

    expect(result.current.blocks).toHaveLength(1);
    expect(result.current.canUndo).toBe(false);
  });

  it("2. Factory creates, duplicates, moves and deletes blocks correctly with UUIDs", () => {
    const block1 = createBlock("heading", { text: "Heading 1" }, undefined, 0);
    const block2 = createBlock("paragraph", { text: "Paragraph 1" }, undefined, 1);

    expect(block1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    // Duplicate
    const dup = duplicateBlock(block1);
    expect(dup.type).toBe("heading");
    expect(dup.id).not.toBe(block1.id);
    expect(dup.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    // Move
    const list = [block1, block2];
    const moved = moveBlock(list, 0, 1);
    expect(moved[0]!.id).toBe(block2.id);
    expect(moved[0]!.position).toBe(0);
    expect(moved[1]!.id).toBe(block1.id);
    expect(moved[1]!.position).toBe(1);

    // Delete
    const afterDelete = deleteBlock(moved, block1.id);
    expect(afterDelete.length).toBe(1);
    expect(afterDelete[0]!.id).toBe(block2.id);
  });

  it("3. Legacy block migration adapter is stable and produces identical UUIDs on multiple loads", () => {
    const legacyRaw = [
      { id: "blk_legacy_1", type: "h1", content_json: { text: "Título Antiguo" } },
      { id: "blk_legacy_2", type: "text", content: { text: "Texto Antiguo" } },
      { type: "callout", content_json: { text: "Alerta importante", variant: "warning" } },
    ];

    const adaptedLoad1 = adaptRawBlocks(legacyRaw);
    const adaptedLoad2 = adaptRawBlocks(legacyRaw);

    expect(adaptedLoad1).toHaveLength(3);
    expect(adaptedLoad2).toHaveLength(3);

    // Stable ID preservation check across loads before persistence
    expect(adaptedLoad1[0]!.id).toBe(adaptedLoad2[0]!.id);
    expect(adaptedLoad1[1]!.id).toBe(adaptedLoad2[1]!.id);
    expect(adaptedLoad1[2]!.id).toBe(adaptedLoad2[2]!.id);

    // Callout semantics preservation check
    expect(adaptedLoad1[2]!.type).toBe("callout");
    expect((adaptedLoad1[2]!.content_json as Record<string, unknown>)["variant"]).toBe("warning");

    // Schema version check
    expect(adaptedLoad1[0]!.schema_version).toBe(1);
  });

  it("4. validateLesson validates schemas, mandatory alt text, and embed provider whitelist", () => {
    const validBlock = createBlock("image", {
      url: "https://example.com/img.png",
      alt: "Imagen explicativa de arquitectura",
      size: "medium",
    });

    const invalidImageBlock = createBlock("image", {
      url: "https://example.com/img.png",
      alt: " ", // Empty ALT text
    });

    const invalidEmbedBlock = createBlock("embed", {
      provider: "unauthorized" as any,
      embedUrl: "https://unauthorized-domain.com/iframe",
    });

    expect(validateLesson([validBlock]).isValid).toBe(true);
    expect(validateLesson([invalidImageBlock]).isValid).toBe(false);
    expect(validateLesson([invalidEmbedBlock]).isValid).toBe(false);
  });

  it("5. useAutosave executes save_lesson_blocks_rpc exclusively", async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      data: { success: true, revision: 2 },
      error: null,
    });
    (supabase.rpc as any) = rpcMock;

    let revision = 1;
    const initialBlocks = [createBlock("heading", { text: "Title" })];
    const dirtyBlocks = [createBlock("heading", { text: "Title Modified" })];

    const { result, rerender } = renderHook(
      ({ currentBlocks }) =>
        useAutosave("lesson-123", currentBlocks, revision, (newRev) => {
          revision = newRev;
        }),
      { initialProps: { currentBlocks: initialBlocks } },
    );

    rerender({ currentBlocks: dirtyBlocks });

    await act(async () => {
      await result.current.flushPendingSave();
    });

    expect(rpcMock).toHaveBeenCalledWith("save_lesson_blocks_rpc", {
      p_lesson_id: "lesson-123",
      p_blocks: dirtyBlocks,
      p_expected_revision: 1,
    });
    expect(revision).toBe(2);
    expect(result.current.status).toBe("saved");
  });

  it("6. useAutosave handles REVISION_CONFLICT without auto-retrying or overwriting", async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      data: {
        success: false,
        error_code: "REVISION_CONFLICT",
        message: "Revision mismatch",
      },
      error: null,
    });
    (supabase.rpc as any) = rpcMock;

    let revision = 1;
    const initialBlocks = [createBlock("heading", { text: "Title" })];
    const dirtyBlocks = [createBlock("heading", { text: "Title Modified" })];

    const { result, rerender } = renderHook(
      ({ currentBlocks }) =>
        useAutosave("lesson-123", currentBlocks, revision, (newRev) => {
          revision = newRev;
        }),
      { initialProps: { currentBlocks: initialBlocks } },
    );

    rerender({ currentBlocks: dirtyBlocks });

    await act(async () => {
      await result.current.flushPendingSave();
    });

    expect(result.current.status).toBe("conflict");
    expect(result.current.conflictMessage).toBe("Revision mismatch");
    expect(revision).toBe(1);
  });

  it("7. useAutosave discards stale responses when sequence changes", async () => {
    let resolveFirstRpc: (val: any) => void = () => {};
    const firstRpcPromise = new Promise((resolve) => {
      resolveFirstRpc = resolve;
    });

    const rpcMock = vi
      .fn()
      .mockReturnValueOnce(firstRpcPromise)
      .mockResolvedValueOnce({
        data: { success: true, revision: 3 },
        error: null,
      });

    (supabase.rpc as any) = rpcMock;

    let revision = 1;
    const initialBlocks = [createBlock("heading", { text: "Version 0" })];
    const dirtyBlocks1 = [createBlock("heading", { text: "Version 1" })];
    const dirtyBlocks2 = [createBlock("heading", { text: "Version 2" })];

    const { result, rerender } = renderHook(
      ({ currentBlocks }) =>
        useAutosave("lesson-123", currentBlocks, revision, (newRev) => {
          revision = newRev;
        }),
      { initialProps: { currentBlocks: initialBlocks } },
    );

    // Make dirty 1
    rerender({ currentBlocks: dirtyBlocks1 });

    // Trigger request #1
    act(() => {
      result.current.flushPendingSave();
    });

    // Make dirty 2 & trigger request #2
    rerender({ currentBlocks: dirtyBlocks2 });

    await act(async () => {
      await result.current.flushPendingSave();
    });

    // Now resolve first RPC (stale)
    await act(async () => {
      resolveFirstRpc({
        data: { success: true, revision: 2 },
        error: null,
      });
    });

    // Late first RPC should NOT override revision to 2
    expect(revision).toBe(3);
    expect(result.current.status).toBe("saved");
  });

  it("8. flushPendingSave returns immediately if state is clean", async () => {
    const rpcMock = vi.fn();
    (supabase.rpc as any) = rpcMock;

    const blocks = [createBlock("heading", { text: "Title" })];

    const { result } = renderHook(() => useAutosave("lesson-123", blocks, 1, () => {}));

    await act(async () => {
      await result.current.flushPendingSave();
    });

    // Clean snapshot should not invoke RPC
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("9. flushPendingSave triggers save if state is dirty", async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      data: { success: true, revision: 2 },
      error: null,
    });
    (supabase.rpc as any) = rpcMock;

    const initialBlocks = [createBlock("heading", { text: "Title 1" })];
    const dirtyBlocks = [createBlock("heading", { text: "Title Modified" })];

    const { result, rerender } = renderHook(
      ({ currentBlocks }) => useAutosave("lesson-123", currentBlocks, 1, () => {}),
      { initialProps: { currentBlocks: initialBlocks } },
    );

    rerender({ currentBlocks: dirtyBlocks });

    await act(async () => {
      await result.current.flushPendingSave();
    });

    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it("10. Undo/Redo maintains block IDs across history stack", () => {
    const b1 = createBlock("heading", { text: "Initial" });
    const { result } = renderHook(() => useHistory([b1]));

    const initialId = result.current.blocks[0]!.id;

    // Add block
    const b2 = createBlock("paragraph", { text: "Second" });
    act(() => {
      result.current.pushState([...result.current.blocks, b2]);
    });

    expect(result.current.blocks.length).toBe(2);
    expect(result.current.blocks[0]!.id).toBe(initialId);

    // Undo
    act(() => {
      result.current.undo();
    });

    expect(result.current.blocks.length).toBe(1);
    expect(result.current.blocks[0]!.id).toBe(initialId);

    // Redo
    act(() => {
      result.current.redo();
    });

    expect(result.current.blocks.length).toBe(2);
    expect(result.current.blocks[0]!.id).toBe(initialId);
  });
});
