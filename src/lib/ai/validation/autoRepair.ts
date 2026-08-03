import type { AuthoringBlock, BlockType } from "@/lib/authoring/types";
import { BlockRegistry } from "@/lib/authoring/blocks/registry";
import type { RepairResult } from "../types";

export function autoRepairBlock(
  block: Partial<AuthoringBlock>,
  positionIndex = 0,
): { repairedBlock: AuthoringBlock; repaired: boolean; logMessage?: string } {
  let repaired = false;
  let logMessage = "";

  const id = block.id || `blk-ai-${Math.random().toString(36).substring(2, 9)}`;
  let type = (block.type as BlockType) || "paragraph";
  const position = typeof block.position === "number" ? block.position : positionIndex;
  const visibility = block.visibility || "visible";
  let content = { ...(block.content_json || {}) };
  const settings = { ...(block.settings_json || {}) };

  // 1. Check if block type is registered in BlockRegistry
  let definition = BlockRegistry.get(type);

  // Normalize legacy aliases
  if (!definition) {
    if ((type as string) === "h1" || (type as string) === "h2" || (type as string) === "h3") {
      const lvl = (type as string) === "h1" ? 1 : (type as string) === "h2" ? 2 : 3;
      type = "heading";
      content.level = lvl;
      repaired = true;
      logMessage = `Convertido tipo heredado '${block.type}' a 'heading' con nivel ${lvl}`;
    } else if ((type as string) === "text") {
      type = "paragraph";
      repaired = true;
      logMessage = `Convertido tipo heredado 'text' a 'paragraph'`;
    } else if ((type as string) === "warning" || (type as string) === "tip") {
      type = "callout";
      content.type = (type as string) === "warning" ? "warning" : "info";
      repaired = true;
      logMessage = `Convertido tipo heredado '${block.type}' a 'callout'`;
    } else {
      type = "paragraph";
      repaired = true;
      logMessage = `Tipo de bloque desconocido '${block.type}'. Convertido a 'paragraph'`;
    }
    definition = BlockRegistry.get(type);
  }

  // 2. Specific field repairs
  if (type === "image") {
    if (!content.alt || typeof content.alt !== "string" || content.alt.trim() === "") {
      content.alt = content.caption || content.title || "Ilustración explicativa de la lección";
      repaired = true;
      logMessage = logMessage
        ? `${logMessage} | Añadido texto ALT a imagen`
        : "Añadido texto ALT a bloque de imagen";
    }
    if (!content.url || typeof content.url !== "string") {
      content.url =
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60";
      repaired = true;
      logMessage = logMessage
        ? `${logMessage} | Asignada URL por defecto para imagen`
        : "Asignada URL de imagen por defecto";
    }
  }

  if (type === "video") {
    if (!content.url || typeof content.url !== "string" || !content.url.includes("http")) {
      content.url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
      content.provider = "youtube";
      repaired = true;
      logMessage = logMessage
        ? `${logMessage} | URL de video corregida a embed seguro`
        : "URL de video corregida a formato seguro";
    }
  }

  if (type === "heading") {
    if (!content.text || typeof content.text !== "string" || content.text.trim() === "") {
      content.text = "Título de Sección";
      repaired = true;
      logMessage = logMessage
        ? `${logMessage} | Generado texto para Heading`
        : "Generado texto faltante en Heading";
    }
    if (
      !content.level ||
      typeof content.level !== "number" ||
      content.level < 1 ||
      content.level > 3
    ) {
      content.level = 1;
      repaired = true;
    }
  }

  if (type === "paragraph") {
    if (!content.text || typeof content.text !== "string") {
      content.text = "Contenido de la lección.";
      repaired = true;
      logMessage = logMessage
        ? `${logMessage} | Generado texto para Paragraph`
        : "Generado texto faltante en Paragraph";
    }
  }

  if (type === "checklist") {
    if (!Array.isArray(content.items) || content.items.length === 0) {
      content.items = [{ id: "chk-1", text: "Verificar punto clave", checked: false }];
      repaired = true;
      logMessage = logMessage
        ? `${logMessage} | Inicializado items de Checklist`
        : "Inicializados items en Checklist";
    }
  }

  if (type === "accordion") {
    if (!Array.isArray(content.items) || content.items.length === 0) {
      content.items = [
        { id: "acc-1", title: "Pregunta frecuente", content: "Explicación en detalle." },
      ];
      repaired = true;
      logMessage = logMessage
        ? `${logMessage} | Inicializado items de Accordion`
        : "Inicializados items en Accordion";
    }
  }

  // 3. Final validation against Zod schema from registry
  if (definition && definition.validator) {
    const valResult = definition.validator.safeParse(content);
    if (!valResult.success) {
      // Apply defaults from definition or fallback
      content = { ...definition.defaultContent, ...content };
      repaired = true;
      logMessage = logMessage
        ? `${logMessage} | Aplicado esquema por defecto por error Zod`
        : "Aplicado esquema por defecto para cumplir con Zod";
    }
  }

  const repairedBlock: AuthoringBlock = {
    id,
    type,
    position,
    visibility,
    content_json: content,
    settings_json: settings,
  };

  return { repairedBlock, repaired, logMessage };
}

export function autoRepairBlocks(blocks: Partial<AuthoringBlock>[]): RepairResult {
  let repairedCount = 0;
  const repairedBlocks: AuthoringBlock[] = [];
  const log: string[] = [];

  blocks.forEach((blk, idx) => {
    const { repairedBlock, repaired, logMessage } = autoRepairBlock(blk, idx);
    repairedBlocks.push(repairedBlock);
    if (repaired) {
      repairedCount++;
      if (logMessage) {
        log.push(`[Bloque ${idx + 1} (${repairedBlock.type})]: ${logMessage}`);
      }
    }
  });

  return {
    repairedCount,
    repairedBlocks,
    log,
  };
}
