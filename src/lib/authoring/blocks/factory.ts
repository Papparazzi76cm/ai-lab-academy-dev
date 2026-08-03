import type { AuthoringBlock, BlockType, AuthoringBlockSettings } from "../types";

export const DEFAULT_BLOCK_CONTENTS: Record<BlockType, Record<string, unknown>> = {
  heading: { text: "Nuevo Título", level: 2, alignment: "left" },
  paragraph: { text: "Escribe aquí el contenido del párrafo...", alignment: "left" },
  image: {
    url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800",
    caption: "Descripción de la imagen",
    alt: "Imagen de ejemplo del curso",
    size: "medium",
    alignment: "center",
  },
  video: {
    provider: "youtube",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    autoplay: false,
    controls: true,
    startTime: 0,
  },
  code: {
    code: "// Escribe tu código aquí\nconsole.log('Hola AI Lab Academy');",
    language: "typescript",
    showLineNumbers: true,
    filename: "example.ts",
  },
  quote: {
    text: "La inteligencia artificial no reemplazará a los humanos, sino a quienes no la usen.",
    author: "Experto en IA",
    citation: "AI Lab Academy",
  },
  callout: {
    variant: "info",
    title: "Nota importante",
    text: "Revisa los conceptos anteriores antes de continuar con la práctica.",
    icon: "info",
  },
  divider: { style: "solid" },
  button: {
    label: "Acceder al recurso",
    url: "https://ailabacademy.com",
    variant: "primary",
    openInNewTab: true,
  },
  checklist: {
    items: [
      { id: "chk_1", text: "Completar la lectura inicial", checked: false },
      { id: "chk_2", text: "Ejecutar el ejercicio de código", checked: false },
    ],
  },
  accordion: {
    items: [
      {
        id: "acc_1",
        title: "¿Qué requisitos necesito?",
        content: "Solo ganas de aprender y un navegador web.",
      },
      { id: "acc_2", title: "¿Cuánto dura esta lección?", content: "Aproximadamente 15 minutos." },
    ],
  },
  tabs: {
    items: [
      { id: "tab_1", label: "Teoría", content: "Explicación conceptual de la lección." },
      { id: "tab_2", label: "Ejemplo", content: "Demostración paso a paso." },
    ],
  },
  gallery: {
    images: [
      {
        url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600",
        caption: "Captura 1",
        alt: "Captura de pantalla 1",
      },
      {
        url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600",
        caption: "Captura 2",
        alt: "Captura de pantalla 2",
      },
    ],
    layout: "grid",
  },
  file_download: {
    filename: "guia-de-estudio.pdf",
    fileUrl: "#",
    fileSize: "2.4 MB",
    fileType: "pdf",
    description: "Documentación complementaria en PDF",
  },
  embed: {
    provider: "youtube",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    aspectRatio: "16:9",
    title: "Vídeo explicativo",
  },
  quiz_block: {
    quizId: "",
    showTitle: true,
    showPassingScore: true,
  },
  certificate_block: {
    templateId: "",
    title: "Certificado Oficial",
    description: "Acredita tus conocimientos al aprobar el curso.",
  },
  spacer: { height: 32 },
};

export const DEFAULT_BLOCK_SETTINGS: AuthoringBlockSettings = {
  visibility: "visible",
  className: "",
  paddingY: "medium",
};

export function createBlock(
  type: BlockType,
  initialContent?: Record<string, unknown>,
  initialSettings?: Partial<AuthoringBlockSettings>,
  position = 0,
): AuthoringBlock {
  const id = `blk_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  return {
    id,
    type,
    position,
    visibility: initialSettings?.visibility || "visible",
    settings_json: {
      ...DEFAULT_BLOCK_SETTINGS,
      ...initialSettings,
    },
    content_json: {
      ...DEFAULT_BLOCK_CONTENTS[type],
      ...initialContent,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function cloneBlock(block: AuthoringBlock): AuthoringBlock {
  return {
    ...block,
    id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    content_json: JSON.parse(JSON.stringify(block.content_json)),
    settings_json: JSON.parse(JSON.stringify(block.settings_json)),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function duplicateBlock(block: AuthoringBlock): AuthoringBlock {
  const cloned = cloneBlock(block);
  cloned.position = block.position + 1;
  return cloned;
}

export function deleteBlock(blocks: AuthoringBlock[], id: string): AuthoringBlock[] {
  return blocks.filter((b) => b.id !== id).map((b, idx) => ({ ...b, position: idx }));
}

export function moveBlock(
  blocks: AuthoringBlock[],
  fromIndex: number,
  toIndex: number,
): AuthoringBlock[] {
  if (fromIndex < 0 || fromIndex >= blocks.length || toIndex < 0 || toIndex >= blocks.length) {
    return blocks;
  }
  const result = [...blocks];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);

  return result.map((b, idx) => ({ ...b, position: idx }));
}
