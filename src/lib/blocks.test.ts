import { describe, it, expect } from "vitest";
import { validateBlockContent, getDefaultBlockPayload } from "./blocks";

describe("Block Zod Validation", () => {
  it("validates h1 block correctly", () => {
    const valid = validateBlockContent("h1", { text: "Título principal" });
    expect(valid.valid).toBe(true);

    const invalid = validateBlockContent("h1", { text: "" });
    expect(invalid.valid).toBe(false);
    expect(invalid.error).toBeDefined();
  });

  it("validates list block correctly", () => {
    const valid = validateBlockContent("bullet_list", { items: ["Item 1", "Item 2"] });
    expect(valid.valid).toBe(true);

    const invalid = validateBlockContent("bullet_list", { items: [] });
    expect(invalid.valid).toBe(false);
  });

  it("validates image block URL", () => {
    const valid = validateBlockContent("image", { url: "https://example.com/photo.jpg" });
    expect(valid.valid).toBe(true);

    const invalid = validateBlockContent("image", { url: "javascript:alert(1)" });
    expect(invalid.valid).toBe(false);
  });

  it("validates code block", () => {
    const valid = validateBlockContent("code", {
      code: "console.log('hi');",
      language: "typescript",
    });
    expect(valid.valid).toBe(true);

    const invalid = validateBlockContent("code", { code: "" });
    expect(invalid.valid).toBe(false);
  });

  it("provides valid default block payload", () => {
    const payload = getDefaultBlockPayload("h2");
    expect(payload.content_json["text"]).toBe("Nuevo Subtítulo de Sección");
    const check = validateBlockContent("h2", payload.content_json);
    expect(check.valid).toBe(true);
  });
});
