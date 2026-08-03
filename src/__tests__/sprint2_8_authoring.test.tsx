import { describe, it, expect, vi } from "vitest";
import { BlockRegistry } from "@/lib/authoring/blocks/registry";
import {
  createBlock,
  duplicateBlock,
  moveBlock,
  deleteBlock,
} from "@/lib/authoring/blocks/factory";
import { validateLesson } from "@/lib/authoring/validation/lessonValidation";
import { compareLessonVersions } from "@/lib/authoring/publishing/publishingService";
import { adaptRawBlock, adaptRawBlocks, normalizeBlockType } from "@/lib/authoring/blocks/adapter";
import type { AuthoringBlock } from "@/lib/authoring/types";

describe("Sprint 2.8 — Authoring Studio Core Engine Tests", () => {
  it("BlockRegistry registers all default block types with full metadata", () => {
    const all = BlockRegistry.getAll();
    expect(all.length).toBeGreaterThanOrEqual(18);

    const headingDef = BlockRegistry.get("heading");
    expect(headingDef).toBeDefined();
    expect(headingDef?.label).toContain("Título");
    expect(headingDef?.editor).toBeDefined();
    expect(headingDef?.renderer).toBeDefined();
    expect(headingDef?.normalize).toBeDefined();
    expect(headingDef?.migrate).toBeDefined();

    const embedDef = BlockRegistry.get("embed");
    expect(embedDef).toBeDefined();

    const imageDef = BlockRegistry.get("image");
    expect(imageDef).toBeDefined();
  });

  it("BlockFactory creates, duplicates, moves, and deletes blocks correctly with UUIDs", () => {
    const block1 = createBlock("heading", { text: "Título 1" }, { visibility: "visible" }, 0);
    const block2 = createBlock("paragraph", { text: "Párrafo 1" }, { visibility: "visible" }, 1);

    expect(block1.type).toBe("heading");
    expect(block1.position).toBe(0);
    // UUID format check
    expect(block1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    // Duplicate
    const dup = duplicateBlock(block1);
    expect(dup.type).toBe("heading");
    expect(dup.id).not.toBe(block1.id);
    expect(dup.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(dup.position).toBe(1);

    // Move
    const list = [block1, block2];
    const moved = moveBlock(list, 0, 1);
    expect(moved[0].id).toBe(block2.id);
    expect(moved[0].position).toBe(0);
    expect(moved[1].id).toBe(block1.id);
    expect(moved[1].position).toBe(1);

    // Delete
    const afterDelete = deleteBlock(moved, block1.id);
    expect(afterDelete.length).toBe(1);
    expect(afterDelete[0].id).toBe(block2.id);
  });

  it("Legacy block migration adapter converts legacy block structures seamlessly", () => {
    const legacyRaw = [
      { id: "blk_legacy_1", type: "h1", content_json: { text: "Título Antiguo" } },
      { id: "blk_legacy_2", type: "text", content: { text: "Texto Antiguo" } },
      { id: "invalid-id", type: "callout", content_json: { text: "Alerta" } },
    ];

    const adapted = adaptRawBlocks(legacyRaw);
    expect(adapted).toHaveLength(3);

    // Type normalization
    expect(adapted[0].type).toBe("heading");
    expect(adapted[0].position).toBe(0);
    expect(adapted[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    expect(adapted[1].type).toBe("paragraph");
    expect(adapted[1].position).toBe(1);

    expect(adapted[2].type).toBe("warning");
    expect(adapted[2].position).toBe(2);
  });

  it("validateLesson validates schemas, mandatory alt text, and embed provider whitelist", () => {
    // Valid block list
    const validBlock = createBlock("image", {
      url: "https://example.com/img.png",
      alt: "Imagen explicativa de arquitectura",
      size: "medium",
    });

    const resValid = validateLesson([validBlock]);
    expect(resValid.isValid).toBe(true);
    expect(resValid.errors).toHaveLength(0);

    // Invalid block (image missing alt text)
    const invalidImage = createBlock("image", {
      url: "https://example.com/img.png",
      alt: "", // Invalid empty alt
    });

    const resInvalidImg = validateLesson([invalidImage]);
    expect(resInvalidImg.isValid).toBe(false);
    expect(resInvalidImg.errors.some((e) => e.message.includes("ALT"))).toBe(true);

    // Invalid embed provider (not in whitelist)
    const invalidEmbed = createBlock("embed", {
      provider: "untrusted_domain",
      embedUrl: "https://untrusted.com",
    });

    const resInvalidEmbed = validateLesson([invalidEmbed]);
    expect(resInvalidEmbed.isValid).toBe(false);
  });

  it("compareLessonVersions correctly identifies added, removed, and modified blocks", () => {
    const b1 = createBlock("heading", { text: "Versión 1 Título" }, {}, 0);
    const b2 = createBlock("paragraph", { text: "Texto V1" }, {}, 1);

    const oldBlocks: AuthoringBlock[] = [b1, b2];

    // Modified b1, removed b2, added b3
    const b1Mod = { ...b1, content_json: { ...b1.content_json, text: "Versión 2 Título Editado" } };
    const b3New = createBlock("code", { code: "console.log('v2');" }, {}, 1);

    const newBlocks: AuthoringBlock[] = [b1Mod, b3New];

    const diff = compareLessonVersions(oldBlocks, newBlocks);
    expect(diff.addedBlocks).toHaveLength(1);
    expect(diff.addedBlocks[0].id).toBe(b3New.id);

    expect(diff.removedBlocks).toHaveLength(1);
    expect(diff.removedBlocks[0].id).toBe(b2.id);

    expect(diff.modifiedBlocks).toHaveLength(1);
    expect(diff.modifiedBlocks[0].oldBlock.id).toBe(b1.id);
    expect(diff.modifiedBlocks[0].changes).toContain("Contenido modificado");
  });
});
