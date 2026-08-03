import { describe, it, expect } from "vitest";
import { BlockRegistry } from "@/lib/authoring/blocks/registry";
import {
  createBlock,
  duplicateBlock,
  moveBlock,
  deleteBlock,
} from "@/lib/authoring/blocks/factory";
import { validateLesson } from "@/lib/authoring/validation/lessonValidation";
import { compareLessonVersions } from "@/lib/authoring/publishing/publishingService";
import type { AuthoringBlock } from "@/lib/authoring/types";

describe("Sprint 2.8 — Authoring Studio Core Engine Tests", () => {
  it("BlockRegistry registers all 18 default block types", () => {
    const all = BlockRegistry.getAll();
    expect(all.length).toBeGreaterThanOrEqual(18);

    const headingDef = BlockRegistry.get("heading");
    expect(headingDef).toBeDefined();
    expect(headingDef?.name).toContain("Título");

    const embedDef = BlockRegistry.get("embed");
    expect(embedDef).toBeDefined();

    const imageDef = BlockRegistry.get("image");
    expect(imageDef).toBeDefined();
  });

  it("BlockFactory creates, duplicates, moves, and deletes blocks correctly", () => {
    const block1 = createBlock("heading", { text: "Título 1" }, { visibility: "visible" }, 0);
    const block2 = createBlock("paragraph", { text: "Párrafo 1" }, { visibility: "visible" }, 1);

    expect(block1.type).toBe("heading");
    expect(block1.position).toBe(0);

    // Duplicate
    const dup = duplicateBlock(block1);
    expect(dup.type).toBe("heading");
    expect(dup.id).not.toBe(block1.id);
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
