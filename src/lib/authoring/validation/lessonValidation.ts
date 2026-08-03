import type { AuthoringBlock } from "../types";
import { BlockRegistry } from "../blocks/registry";
import { EMBED_PROVIDER_WHITELIST } from "../blocks/schemas";

export interface ValidationError {
  blockId?: string;
  blockType?: string;
  message: string;
}

export interface LessonValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export function validateLesson(blocks: AuthoringBlock[]): LessonValidationResult {
  const errors: ValidationError[] = [];

  if (blocks.length === 0) {
    errors.push({ message: "La lección debe contener al menos un bloque de contenido." });
  }

  blocks.forEach((block) => {
    const def = BlockRegistry.get(block.type);
    if (!def) {
      errors.push({
        blockId: block.id,
        blockType: block.type,
        message: `El tipo de bloque '${block.type}' no está registrado en el BlockRegistry.`,
      });
      return;
    }

    // Zod validation
    const result = def.validator.safeParse(block.content_json);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        errors.push({
          blockId: block.id,
          blockType: block.type,
          message: `[Bloque ${block.type}] ${issue.path.join(".")}: ${issue.message}`,
        });
      });
    }

    // Special validation checks
    if (block.type === "image") {
      const alt = String(block.content_json["alt"] || "").trim();
      if (!alt) {
        errors.push({
          blockId: block.id,
          blockType: block.type,
          message:
            "Las imágenes deben incluir un texto alternativo (ALT) descriptivo por accesibilidad.",
        });
      }
    }

    if (block.type === "embed") {
      const provider = String(block.content_json["provider"] || "");
      if (
        !EMBED_PROVIDER_WHITELIST.includes(provider as (typeof EMBED_PROVIDER_WHITELIST)[number])
      ) {
        errors.push({
          blockId: block.id,
          blockType: block.type,
          message: `El proveedor '${provider}' no está en la lista blanca de incrustados seguros.`,
        });
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}
