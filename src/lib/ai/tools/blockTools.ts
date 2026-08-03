import type { AuthoringBlock, BlockType } from "@/lib/authoring/types";

export function CreateHeading(text: string, level: 1 | 2 | 3 = 1, position = 0): AuthoringBlock {
  return {
    id: `blk-heading-${Math.random().toString(36).substring(2, 9)}`,
    type: "heading" as BlockType,
    position,
    visibility: "visible",
    content_json: {
      text: text || "Título de sección",
      level,
    },
    settings_json: {},
  };
}

export function CreateParagraph(text: string, position = 0): AuthoringBlock {
  return {
    id: `blk-para-${Math.random().toString(36).substring(2, 9)}`,
    type: "paragraph" as BlockType,
    position,
    visibility: "visible",
    content_json: {
      text: text || "Contenido explicativo de la lección.",
    },
    settings_json: {},
  };
}

export function CreateCallout(
  text: string,
  type: "info" | "warning" | "success" | "danger" = "info",
  title = "Nota del Instructor",
  position = 0,
): AuthoringBlock {
  return {
    id: `blk-callout-${Math.random().toString(36).substring(2, 9)}`,
    type: "callout" as BlockType,
    position,
    visibility: "visible",
    content_json: {
      title,
      text: text || "Punto clave a recordar.",
      type,
    },
    settings_json: {},
  };
}

export function CreateCode(
  code: string,
  language = "typescript",
  filename = "snippet.ts",
  position = 0,
): AuthoringBlock {
  return {
    id: `blk-code-${Math.random().toString(36).substring(2, 9)}`,
    type: "code" as BlockType,
    position,
    visibility: "visible",
    content_json: {
      code: code || "// Código de ejemplo",
      language,
      filename,
    },
    settings_json: {},
  };
}

export function CreateImage(
  url: string,
  alt = "Imagen explicativa de la lección",
  caption = "",
  position = 0,
): AuthoringBlock {
  return {
    id: `blk-img-${Math.random().toString(36).substring(2, 9)}`,
    type: "image" as BlockType,
    position,
    visibility: "visible",
    content_json: {
      url:
        url ||
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60",
      alt: alt || "Ilustración educativa",
      caption,
    },
    settings_json: {},
  };
}

export function CreateVideo(
  url: string,
  caption = "Video explicativo",
  provider = "youtube",
  position = 0,
): AuthoringBlock {
  return {
    id: `blk-video-${Math.random().toString(36).substring(2, 9)}`,
    type: "video" as BlockType,
    position,
    visibility: "visible",
    content_json: {
      url: url || "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      caption,
      provider,
    },
    settings_json: {},
  };
}

export function CreateChecklist(
  items: Array<{ id?: string; text: string; checked?: boolean }>,
  position = 0,
): AuthoringBlock {
  const formattedItems = items.map((item, idx) => ({
    id: item.id || `chk-${idx}-${Math.random().toString(36).substring(2, 6)}`,
    text: item.text || `Item ${idx + 1}`,
    checked: Boolean(item.checked),
  }));

  return {
    id: `blk-checklist-${Math.random().toString(36).substring(2, 9)}`,
    type: "checklist" as BlockType,
    position,
    visibility: "visible",
    content_json: {
      items:
        formattedItems.length > 0
          ? formattedItems
          : [{ id: "chk-1", text: "Verificar concepto", checked: false }],
    },
    settings_json: {},
  };
}

export function CreateAccordion(
  items: Array<{ id?: string; title: string; content: string }>,
  position = 0,
): AuthoringBlock {
  const formattedItems = items.map((item, idx) => ({
    id: item.id || `acc-${idx}-${Math.random().toString(36).substring(2, 6)}`,
    title: item.title || `Pregunta o Sección ${idx + 1}`,
    content: item.content || "Detalle explicativo.",
  }));

  return {
    id: `blk-accordion-${Math.random().toString(36).substring(2, 9)}`,
    type: "accordion" as BlockType,
    position,
    visibility: "visible",
    content_json: {
      items:
        formattedItems.length > 0
          ? formattedItems
          : [{ id: "acc-1", title: "¿Pregunta frecuente?", content: "Respuesta clara y precisa." }],
    },
    settings_json: {},
  };
}

export function CreateQuote(
  quote: string,
  author = "AI Lab Academy",
  position = 0,
): AuthoringBlock {
  return {
    id: `blk-quote-${Math.random().toString(36).substring(2, 9)}`,
    type: "quote" as BlockType,
    position,
    visibility: "visible",
    content_json: {
      quote: quote || "El aprendizaje continuo es la clave del progreso.",
      author,
    },
    settings_json: {},
  };
}

export function CreateDivider(position = 0): AuthoringBlock {
  return {
    id: `blk-divider-${Math.random().toString(36).substring(2, 9)}`,
    type: "divider" as BlockType,
    position,
    visibility: "visible",
    content_json: {},
    settings_json: {},
  };
}
