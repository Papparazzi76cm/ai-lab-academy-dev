// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHistory } from "../lib/authoring/history/useHistory";
import { useAutosave, type SaveBlocksRpcResponse } from "../lib/authoring/autosave/useAutosave";
import {
  createBlock,
  duplicateBlock,
  moveBlock,
  deleteBlock,
} from "../lib/authoring/blocks/factory";
import { adaptRawBlocks } from "../lib/authoring/blocks/adapter";
import { validateLesson } from "../lib/authoring/validation/lessonValidation";
import { BlockRegistry } from "../lib/authoring/blocks/registry";
import {
  compareLessonVersions,
  publishLesson,
  restoreLessonVersion,
} from "../lib/authoring/publishing/publishingService";
import { supabase } from "@/integrations/supabase/client";
import type { AuthoringBlock, BlockDefinition } from "../lib/authoring/types";

// Type-safe Supabase RPC mock
interface RpcMockResponse<T = unknown> {
  data: T | null;
  error: { code?: string; message?: string } | null;
}

const mockRpc =
  vi.fn<
    (
      fn: string,
      args?: Record<string, unknown>,
    ) => Promise<RpcMockResponse<SaveBlocksRpcResponse | unknown>>
  >();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (fn: string, args?: Record<string, unknown>) => mockRpc(fn, args),
  },
}));

describe("Sprint 2.8 Authoring Studio - Comprehensive Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==========================================================================
  // 1. BlockRegistry Complete Coverage
  // ==========================================================================
  describe("BlockRegistry", () => {
    it("retrieves standard registered block definitions", () => {
      const headingDef = BlockRegistry.get("heading");
      expect(headingDef).toBeDefined();
      expect(headingDef?.type).toBe("heading");
      expect(headingDef?.category).toBe("text");

      const paragraphDef = BlockRegistry.get("paragraph");
      expect(paragraphDef).toBeDefined();
      expect(paragraphDef?.type).toBe("paragraph");

      const imageDef = BlockRegistry.get("image");
      expect(imageDef).toBeDefined();
      expect(imageDef?.type).toBe("image");
    });

    it("allows registering and fetching a custom block definition", () => {
      const customDef: BlockDefinition = {
        type: "spacer",
        name: "Custom Spacer",
        label: "Custom Spacer",
        description: "Custom spacer element",
        category: "advanced",
        iconName: "Maximize2",
        editor: () => null,
        renderer: () => null,
        contentSchema: null as unknown as BlockDefinition["contentSchema"],
        settingsSchema: null as unknown as BlockDefinition["settingsSchema"],
        validator: null as unknown as BlockDefinition["validator"],
        defaultContent: { height: 40 },
        defaultSettings: { visibility: "visible" },
        normalize: (content) => ({
          content_json: content,
          settings_json: { visibility: "visible" },
        }),
        migrate: (raw) => raw,
      };

      BlockRegistry.register(customDef);
      const fetched = BlockRegistry.get("spacer");
      expect(fetched).toBeDefined();
      expect(fetched?.name).toBe("Custom Spacer");
    });

    it("filters block definitions by category", () => {
      const textBlocks = BlockRegistry.getByCategory("text");
      expect(textBlocks.length).toBeGreaterThan(0);
      expect(textBlocks.every((b) => b.category === "text")).toBe(true);

      const mediaBlocks = BlockRegistry.getByCategory("media");
      expect(mediaBlocks.length).toBeGreaterThan(0);
      expect(mediaBlocks.every((b) => b.category === "media")).toBe(true);
    });

    it("executes definition normalize and migrate correctly", () => {
      const headingDef = BlockRegistry.get("heading");
      expect(headingDef).toBeDefined();

      const normalized = headingDef!.normalize(
        { text: "Normalized Title" },
        { visibility: "instructor_only" },
      );
      expect(normalized.content_json["text"]).toBe("Normalized Title");
      expect(normalized.settings_json.visibility).toBe("instructor_only");

      const migrated = headingDef!.migrate({ content: "Legacy Header", level: 1 });
      expect(migrated["text"]).toBe("Legacy Header");
      expect(migrated["level"]).toBe(1);
    });
  });

  // ==========================================================================
  // 2. BlockFactory & Helper Operations
  // ==========================================================================
  describe("BlockFactory", () => {
    it("creates blocks with valid UUIDs and default settings", () => {
      const b1 = createBlock("heading", { text: "Title" }, undefined, 0);
      expect(b1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(b1.type).toBe("heading");
      expect(b1.position).toBe(0);
      expect(b1.visibility).toBe("visible");
    });

    it("duplicates blocks with new UUIDs and preserves contents", () => {
      const b1 = createBlock("paragraph", { text: "Paragraph text" });
      const dup = duplicateBlock(b1);

      expect(dup.id).not.toBe(b1.id);
      expect(dup.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(dup.type).toBe("paragraph");
      expect(dup.content_json["text"]).toBe("Paragraph text");
    });

    it("re-indexes positions when moving blocks", () => {
      const b1 = createBlock("heading", { text: "H1" }, undefined, 0);
      const b2 = createBlock("paragraph", { text: "P1" }, undefined, 1);
      const list = [b1, b2];

      const reordered = moveBlock(list, 0, 1);
      expect(reordered[0]!.id).toBe(b2.id);
      expect(reordered[0]!.position).toBe(0);
      expect(reordered[1]!.id).toBe(b1.id);
      expect(reordered[1]!.position).toBe(1);
    });

    it("deletes blocks and updates positions", () => {
      const b1 = createBlock("heading", { text: "H1" }, undefined, 0);
      const b2 = createBlock("paragraph", { text: "P1" }, undefined, 1);
      const list = [b1, b2];

      const remaining = deleteBlock(list, b1.id);
      expect(remaining.length).toBe(1);
      expect(remaining[0]!.id).toBe(b2.id);
      expect(remaining[0]!.position).toBe(0);
    });
  });

  // ==========================================================================
  // 3. Adapter & Validation
  // ==========================================================================
  describe("Adapter & Validation", () => {
    it("migrates legacy blocks with stable ID hashing", () => {
      const raw = [
        { id: "legacy_1", type: "h1", content_json: { text: "Old Title" } },
        { type: "text", content: { text: "Old Paragraph" } },
      ];

      const pass1 = adaptRawBlocks(raw);
      const pass2 = adaptRawBlocks(raw);

      expect(pass1.length).toBe(2);
      expect(pass1[0]!.id).toBe(pass2[0]!.id);
      expect(pass1[1]!.id).toBe(pass2[1]!.id);
      expect(pass1[0]!.type).toBe("heading");
      expect(pass1[1]!.type).toBe("paragraph");
    });

    it("validates lesson schema, alt text, and embed provider whitelist", () => {
      const validBlock = createBlock("image", {
        url: "https://example.com/photo.jpg",
        alt: "A descriptive alt text",
      });

      const invalidAltBlock = createBlock("image", {
        url: "https://example.com/photo.jpg",
        alt: "",
      });

      const invalidEmbedBlock = createBlock("embed", {
        provider: "malicious_site" as unknown as "youtube",
        embedUrl: "https://malicious.com/embed",
      });

      expect(validateLesson([validBlock]).isValid).toBe(true);
      expect(validateLesson([invalidAltBlock]).isValid).toBe(false);
      expect(validateLesson([invalidEmbedBlock]).isValid).toBe(false);
    });
  });

  // ==========================================================================
  // 4. Version Diff & Comparison
  // ==========================================================================
  describe("compareLessonVersions", () => {
    it("identifies added, removed, and modified blocks accurately", () => {
      const b1 = createBlock("heading", { text: "Original Title" });
      const b2 = createBlock("paragraph", { text: "Original Content" });
      const b3 = createBlock("divider", {});

      const oldBlocks: AuthoringBlock[] = [b1, b2];

      const modifiedB1 = { ...b1, content_json: { text: "Modified Title" } };
      const newBlocks: AuthoringBlock[] = [modifiedB1, b3];

      const diff = compareLessonVersions(oldBlocks, newBlocks);

      expect(diff.removedBlocks.map((b) => b.id)).toContain(b2.id);
      expect(diff.addedBlocks.map((b) => b.id)).toContain(b3.id);
      expect(diff.modifiedBlocks.length).toBe(1);
      expect(diff.modifiedBlocks[0]!.oldBlock.id).toBe(b1.id);
      expect(diff.modifiedBlocks[0]!.changes).toContain("Contenido modificado");
    });
  });

  // ==========================================================================
  // 5. Autosave, Flush, and Controlled Retry Tests
  // ==========================================================================
  describe("useAutosave - Flush & Retry Mechanics", () => {
    it("executes flushPendingSave and updates revision on success", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: true, revision: 2 },
        error: null,
      });

      let currentRev = 1;
      const initialBlocks = [createBlock("heading", { text: "V1" })];
      const dirtyBlocks = [createBlock("heading", { text: "V2" })];

      const { result, rerender } = renderHook(
        ({ blocks }) =>
          useAutosave("lesson-1", blocks, currentRev, (newRev) => {
            currentRev = newRev;
          }),
        { initialProps: { blocks: initialBlocks } },
      );

      rerender({ blocks: dirtyBlocks });

      let success = false;
      await act(async () => {
        success = await result.current.flushPendingSave();
      });

      expect(success).toBe(true);
      expect(currentRev).toBe(2);
      expect(result.current.status).toBe("saved");
      expect(mockRpc).toHaveBeenCalledWith("save_lesson_blocks_rpc", {
        p_lesson_id: "lesson-1",
        p_blocks: dirtyBlocks,
        p_expected_revision: 1,
      });
    });

    it("throws error on flush failure so caller operations stop", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: false, message: "DB Error" },
        error: null,
      });

      const initialBlocks = [createBlock("heading", { text: "V1" })];
      const dirtyBlocks = [createBlock("heading", { text: "V2" })];

      const { result, rerender } = renderHook(
        ({ blocks }) => useAutosave("lesson-1", blocks, 1, () => {}),
        { initialProps: { blocks: initialBlocks } },
      );

      rerender({ blocks: dirtyBlocks });

      await expect(
        act(async () => {
          await result.current.flushPendingSave();
        }),
      ).rejects.toThrow();
    });

    it("schedules a retry on network error and succeeds on subsequent try", async () => {
      vi.useFakeTimers();

      mockRpc.mockRejectedValueOnce(new Error("Network Failure")).mockResolvedValueOnce({
        data: { success: true, revision: 2 },
        error: null,
      });

      let rev = 1;
      const initialBlocks = [createBlock("heading", { text: "V1" })];
      const dirtyBlocks = [createBlock("heading", { text: "V2" })];

      const { result, rerender } = renderHook(
        ({ blocks }) =>
          useAutosave(
            "lesson-1",
            blocks,
            rev,
            (r) => {
              rev = r;
            },
            10000,
            3,
            100,
          ),
        { initialProps: { blocks: initialBlocks } },
      );

      rerender({ blocks: dirtyBlocks });

      // First save attempt fails
      await act(async () => {
        try {
          await result.current.flushPendingSave();
        } catch {
          // Expected failure
        }
      });

      expect(result.current.status).toBe("error");

      // Advance timers to trigger retry
      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      expect(mockRpc).toHaveBeenCalledTimes(2);
      expect(result.current.status).toBe("saved");
      expect(rev).toBe(2);
    });

    it("cancels pending retry timers when component unmounts", async () => {
      vi.useFakeTimers();

      mockRpc.mockRejectedValueOnce(new Error("Network Error"));

      const initialBlocks = [createBlock("heading", { text: "V1" })];
      const dirtyBlocks = [createBlock("heading", { text: "V2" })];

      const { result, rerender, unmount } = renderHook(
        ({ blocks }) => useAutosave("lesson-1", blocks, 1, () => {}, 10000, 3, 500),
        { initialProps: { blocks: initialBlocks } },
      );

      rerender({ blocks: dirtyBlocks });

      await act(async () => {
        try {
          await result.current.flushPendingSave();
        } catch {
          // Expected
        }
      });

      expect(result.current.status).toBe("error");

      // Unmount component before timer fires
      unmount();

      // Advance timers past retry delay
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      // No second call should have occurred
      expect(mockRpc).toHaveBeenCalledTimes(1);
    });

    it("does NOT schedule retry when REVISION_CONFLICT occurs", async () => {
      vi.useFakeTimers();

      mockRpc.mockResolvedValueOnce({
        data: {
          success: false,
          error_code: "REVISION_CONFLICT",
          message: "Conflict detected",
        },
        error: null,
      });

      const initialBlocks = [createBlock("heading", { text: "V1" })];
      const dirtyBlocks = [createBlock("heading", { text: "V2" })];

      const { result, rerender } = renderHook(
        ({ blocks }) => useAutosave("lesson-1", blocks, 1, () => {}, 10000, 3, 100),
        { initialProps: { blocks: initialBlocks } },
      );

      rerender({ blocks: dirtyBlocks });

      await act(async () => {
        try {
          await result.current.flushPendingSave();
        } catch {
          // Expected
        }
      });

      expect(result.current.status).toBe("conflict");

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      // RPC should NOT be called again after conflict
      expect(mockRpc).toHaveBeenCalledTimes(1);
    });

    it("discards stale responses and does not overwrite newer revisions", async () => {
      let resolveFirst: (val: RpcMockResponse<SaveBlocksRpcResponse>) => void = () => {};
      const firstPromise = new Promise<RpcMockResponse<SaveBlocksRpcResponse>>((res) => {
        resolveFirst = res;
      });

      mockRpc.mockReturnValueOnce(firstPromise).mockResolvedValueOnce({
        data: { success: true, revision: 3 },
        error: null,
      });

      let rev = 1;
      const initialBlocks = [createBlock("heading", { text: "V0" })];
      const dirty1 = [createBlock("heading", { text: "V1" })];
      const dirty2 = [createBlock("heading", { text: "V2" })];

      const { result, rerender } = renderHook(
        ({ blocks }) =>
          useAutosave("lesson-1", blocks, rev, (r) => {
            rev = r;
          }),
        { initialProps: { blocks: initialBlocks } },
      );

      rerender({ blocks: dirty1 });
      act(() => {
        result.current.flushPendingSave().catch(() => {});
      });

      rerender({ blocks: dirty2 });
      await act(async () => {
        await result.current.flushPendingSave();
      });

      // Now resolve the late first RPC
      await act(async () => {
        resolveFirst({ data: { success: true, revision: 2 }, error: null });
      });

      expect(rev).toBe(3);
      expect(result.current.status).toBe("saved");
    });
  });

  // ==========================================================================
  // 6. Publishing Service Functions
  // ==========================================================================
  describe("publishingService", () => {
    it("publishLesson executes publish_lesson_rpc and returns result", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: true, version_number: 1, published_at: "2026-08-03T00:00:00Z" },
        error: null,
      });

      const res = await publishLesson("lesson-100", "Initial publish");
      expect(res.success).toBe(true);
      expect(res.version_number).toBe(1);
      expect(mockRpc).toHaveBeenCalledWith("publish_lesson_rpc", {
        p_lesson_id: "lesson-100",
        p_commit_message: "Initial publish",
      });
    });

    it("restoreLessonVersion executes restore_lesson_version_rpc", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: true },
        error: null,
      });

      const res = await restoreLessonVersion("lesson-100", 2);
      expect(res).toEqual({ success: true });
      expect(mockRpc).toHaveBeenCalledWith("restore_lesson_version_rpc", {
        p_lesson_id: "lesson-100",
        p_version_number: 2,
      });
    });
  });
});
