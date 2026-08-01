/**
 * Block types and schema definitions for AI Lab Academy's Notion/Gutenberg-style
 * block editor and renderer.
 */

export type BlockCategory = "texto" | "multimedia" | "codigo" | "recursos" | "educacion";

export type BlockType =
  // Texto
  | "h1"
  | "h2"
  | "h3"
  | "paragraph"
  | "bullet_list"
  | "numbered_list"
  | "quote"
  | "divider"
  // Multimedia
  | "image"
  | "youtube"
  | "vimeo"
  | "video_file"
  | "audio"
  | "gallery"
  // Código
  | "code"
  // Recursos
  | "download_button"
  | "external_link"
  | "pdf_embed"
  // Educación
  | "objectives"
  | "summary"
  | "tip"
  | "warning"
  | "exercise"
  | "challenge"
  | "open_question"
  // Legacy fallbacks
  | "heading"
  | "text"
  | "callout"
  | "list"
  | "checklist"
  | "video"
  | "button"
  | "pdf"
  | "question"
  | "quiz";

export interface LessonBlockItem {
  id: string;
  lesson_id: string;
  position: number;
  type: BlockType;
  content_json: Record<string, unknown>;
  settings_json: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface CatalogItem {
  type: BlockType;
  label: string;
  description: string;
  category: BlockCategory;
  iconName: string;
}

export const blockCategories: { id: BlockCategory; label: string }[] = [
  { id: "texto", label: "Texto" },
  { id: "multimedia", label: "Multimedia" },
  { id: "codigo", label: "Código" },
  { id: "recursos", label: "Recursos" },
  { id: "educacion", label: "Educación" },
];

export const blockCatalog: CatalogItem[] = [
  // Texto
  {
    type: "h1",
    label: "Título H1",
    description: "Encabezado principal de la lección",
    category: "texto",
    iconName: "Heading1",
  },
  {
    type: "h2",
    label: "Título H2",
    description: "Subencabezado de sección",
    category: "texto",
    iconName: "Heading2",
  },
  {
    type: "h3",
    label: "Título H3",
    description: "Subencabezado de menor jerarquía",
    category: "texto",
    iconName: "Heading3",
  },
  {
    type: "paragraph",
    label: "Párrafo",
    description: "Bloque de texto explicativo o narrativa",
    category: "texto",
    iconName: "AlignLeft",
  },
  {
    type: "bullet_list",
    label: "Lista con viñetas",
    description: "Lista de elementos sin orden específico",
    category: "texto",
    iconName: "List",
  },
  {
    type: "numbered_list",
    label: "Lista numerada",
    description: "Lista secuencial paso a paso",
    category: "texto",
    iconName: "ListOrdered",
  },
  {
    type: "quote",
    label: "Cita",
    description: "Cita destacada con autor opcional",
    category: "texto",
    iconName: "Quote",
  },
  {
    type: "divider",
    label: "Separador",
    description: "Línea horizontal divisoria",
    category: "texto",
    iconName: "Minus",
  },

  // Multimedia
  {
    type: "image",
    label: "Imagen",
    description: "Imagen con título y descripción accesibles",
    category: "multimedia",
    iconName: "Image",
  },
  {
    type: "youtube",
    label: "Vídeo YouTube",
    description: "Vídeo incrustado de YouTube via URL",
    category: "multimedia",
    iconName: "Youtube",
  },
  {
    type: "vimeo",
    label: "Vídeo Vimeo",
    description: "Vídeo incrustado de Vimeo via URL",
    category: "multimedia",
    iconName: "Video",
  },
  {
    type: "video_file",
    label: "Archivo de vídeo",
    description: "Reproductor de vídeo nativo (MP4/WebM)",
    category: "multimedia",
    iconName: "FileVideo",
  },
  {
    type: "audio",
    label: "Audio",
    description: "Reproductor de podcast o audio explicativo",
    category: "multimedia",
    iconName: "AudioLines",
  },
  {
    type: "gallery",
    label: "Galería",
    description: "Cuadrícula interactiva de múltiples imágenes",
    category: "multimedia",
    iconName: "Images",
  },

  // Código
  {
    type: "code",
    label: "Bloque de código",
    description: "Snippet de código con resaltado y botón copiar",
    category: "codigo",
    iconName: "Code",
  },

  // Recursos
  {
    type: "download_button",
    label: "Botón descarga",
    description: "Enlace directo para descargar recursos o plantillas",
    category: "recursos",
    iconName: "Download",
  },
  {
    type: "external_link",
    label: "Enlace externo",
    description: "Tarjeta de enlace a documentación o repositorio",
    category: "recursos",
    iconName: "ExternalLink",
  },
  {
    type: "pdf_embed",
    label: "PDF incrustado",
    description: "Visor interactivo de documentos PDF",
    category: "recursos",
    iconName: "FileText",
  },

  // Educación
  {
    type: "objectives",
    label: "Objetivos",
    description: "Lista de metas clave de la lección",
    category: "educacion",
    iconName: "Target",
  },
  {
    type: "summary",
    label: "Resumen",
    description: "Recapitulación de puntos clave",
    category: "educacion",
    iconName: "BookOpen",
  },
  {
    type: "tip",
    label: "Consejo",
    description: "Tip o recomendación práctica para el alumno",
    category: "educacion",
    iconName: "Lightbulb",
  },
  {
    type: "warning",
    label: "Advertencia",
    description: "Alerta sobre errores comunes o precauciones",
    category: "educacion",
    iconName: "AlertTriangle",
  },
  {
    type: "exercise",
    label: "Ejercicio",
    description: "Instrucciones de práctica guiada",
    category: "educacion",
    iconName: "Dumbbell",
  },
  {
    type: "challenge",
    label: "Reto",
    description: "Desafío autónomo para evaluar aprendizaje",
    category: "educacion",
    iconName: "Trophy",
  },
  {
    type: "open_question",
    label: "Pregunta abierta",
    description: "Pregunta de reflexión con respuesta oculta opcional",
    category: "educacion",
    iconName: "HelpCircle",
  },
];

export function getDefaultBlockPayload(type: BlockType): {
  content_json: Record<string, unknown>;
  settings_json: Record<string, unknown>;
} {
  const defaultSettings = { collapsed: false };

  switch (type) {
    case "h1":
      return {
        content_json: { text: "Nuevo Título Principal" },
        settings_json: { ...defaultSettings, align: "left" },
      };
    case "h2":
      return {
        content_json: { text: "Nuevo Subtítulo de Sección" },
        settings_json: { ...defaultSettings, align: "left" },
      };
    case "h3":
      return {
        content_json: { text: "Nuevo Encabezado Secundario" },
        settings_json: { ...defaultSettings, align: "left" },
      };
    case "paragraph":
    case "text":
      return {
        content_json: { text: "Escribe aquí el contenido explicativo de la lección..." },
        settings_json: { ...defaultSettings },
      };
    case "bullet_list":
    case "list":
      return {
        content_json: { items: ["Primer punto clave", "Segundo punto clave"] },
        settings_json: { ...defaultSettings, ordered: false },
      };
    case "numbered_list":
      return {
        content_json: { items: ["Paso 1: Configurar entorno", "Paso 2: Ejecutar código"] },
        settings_json: { ...defaultSettings, ordered: true },
      };
    case "quote":
      return {
        content_json: {
          text: "La inteligencia artificial no reemplaza la creatividad, la potencia.",
          author: "AI Lab Academy",
        },
        settings_json: { ...defaultSettings },
      };
    case "divider":
      return {
        content_json: {},
        settings_json: { ...defaultSettings },
      };
    case "image":
      return {
        content_json: { url: "", alt: "", caption: "" },
        settings_json: { ...defaultSettings, aspectRatio: "16:9" },
      };
    case "youtube":
      return {
        content_json: {
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          title: "Vídeo explicativo",
        },
        settings_json: { ...defaultSettings, autoPlay: false },
      };
    case "vimeo":
      return {
        content_json: { url: "", title: "Vídeo de Vimeo" },
        settings_json: { ...defaultSettings },
      };
    case "video_file":
    case "video":
      return {
        content_json: { url: "", filename: "video.mp4" },
        settings_json: { ...defaultSettings },
      };
    case "audio":
      return {
        content_json: { url: "", title: "Podcast de la lección" },
        settings_json: { ...defaultSettings },
      };
    case "gallery":
      return {
        content_json: { images: [{ url: "", caption: "" }] },
        settings_json: { ...defaultSettings, columns: 2 },
      };
    case "code":
      return {
        content_json: {
          code: "// Escribe tu código aquí\nconsole.log('¡Hola desde AI Lab Academy!');",
          language: "typescript",
          title: "script.ts",
        },
        settings_json: { ...defaultSettings, showLineNumbers: true },
      };
    case "download_button":
      return {
        content_json: {
          label: "Descargar material práctico",
          url: "#",
          filename: "recurso.zip",
          size: "2.4 MB",
        },
        settings_json: { ...defaultSettings },
      };
    case "external_link":
      return {
        content_json: {
          label: "Documentación oficial",
          url: "https://example.com",
          description: "Consulta la guía completa de referencia.",
        },
        settings_json: { ...defaultSettings },
      };
    case "pdf_embed":
    case "pdf":
      return {
        content_json: { url: "", title: "Documento guía (PDF)" },
        settings_json: { ...defaultSettings, height: "500px" },
      };
    case "objectives":
      return {
        content_json: {
          items: ["Comprender la arquitectura de bloques", "Aplicar buenas prácticas en el editor"],
        },
        settings_json: { ...defaultSettings },
      };
    case "summary":
      return {
        content_json: {
          title: "Resumen de la lección",
          text: "Recapitulación rápida de los conceptos abordados.",
        },
        settings_json: { ...defaultSettings },
      };
    case "tip":
      return {
        content_json: {
          title: "Consejo pro",
          text: "Aprovecha los atajos de teclado para editar con mayor rapidez.",
        },
        settings_json: { ...defaultSettings },
      };
    case "warning":
    case "callout":
      return {
        content_json: {
          title: "Atención",
          text: "Verifica tus credenciales antes de ejecutar el comando.",
        },
        settings_json: { ...defaultSettings },
      };
    case "exercise":
      return {
        content_json: {
          title: "Ejercicio práctico",
          instructions: "Sigue los pasos a continuación para completar la práctica.",
          steps: ["Crear una función", "Validar las entradas", "Lanzar las pruebas unitarias"],
        },
        settings_json: { ...defaultSettings },
      };
    case "challenge":
      return {
        content_json: {
          title: "Reto autónomo",
          goal: "Implementar la solución sin consultar la plantilla.",
          hint: "Revisa la sección de documentación de la lección.",
        },
        settings_json: { ...defaultSettings },
      };
    case "open_question":
    case "question":
      return {
        content_json: {
          question: "¿Cómo aplicarías este patrón en un entorno de producción?",
          sampleAnswer:
            "Se debe abstraer la capa de persistencia y asegurar un manejo transaccional.",
        },
        settings_json: { ...defaultSettings },
      };
    default:
      return {
        content_json: { text: "" },
        settings_json: { ...defaultSettings },
      };
  }
}

/**
 * Validates block content before persisting to database.
 */
export function validateBlockContent(
  type: BlockType,
  content: Record<string, unknown>,
): { valid: boolean; error?: string } {
  if (!content || typeof content !== "object") {
    return { valid: false, error: "El contenido del bloque debe ser un objeto JSON válido." };
  }

  // Heading and Paragraph validation
  if (["h1", "h2", "h3", "paragraph", "text"].includes(type)) {
    if (typeof content["text"] === "string" && (content["text"] as string).trim().length === 0) {
      return { valid: false, error: "El texto del encabezado o párrafo no puede estar vacío." };
    }
  }

  // Code validation
  if (type === "code") {
    if (typeof content["code"] !== "string" || (content["code"] as string).trim().length === 0) {
      return { valid: false, error: "El bloque de código debe contener código." };
    }
  }

  // Lists validation
  if (["bullet_list", "numbered_list", "list", "objectives"].includes(type)) {
    if (!Array.isArray(content["items"])) {
      return { valid: false, error: "La lista debe contener elementos." };
    }
  }

  return { valid: true };
}

/**
 * Parses raw JSON or legacy contents into LessonBlockItem array.
 */
export function parseBlocks(raw: unknown): LessonBlockItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item, idx) => {
      if (item && typeof item === "object") {
        const type = ((item.type as string) || "paragraph") as BlockType;
        return {
          id: (item.id as string) || `legacy-${idx}`,
          lesson_id: (item.lesson_id as string) || "",
          position: typeof item.position === "number" ? item.position : idx,
          type,
          content_json: (item.content_json || item.content || { text: item.text || "" }) as Record<
            string,
            unknown
          >,
          settings_json: (item.settings_json || item.settings || {}) as Record<string, unknown>,
        };
      }
      return {
        id: `legacy-${idx}`,
        lesson_id: "",
        position: idx,
        type: "paragraph",
        content_json: { text: String(item) },
        settings_json: {},
      };
    });
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parseBlocks(parsed);
    } catch {
      return [
        {
          id: "legacy-text",
          lesson_id: "",
          position: 0,
          type: "paragraph",
          content_json: { text: raw },
          settings_json: {},
        },
      ];
    }
  }
  return [];
}
