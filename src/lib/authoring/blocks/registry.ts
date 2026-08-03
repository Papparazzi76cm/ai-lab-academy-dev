import type {
  BlockDefinition,
  BlockType,
  BlockCategory,
  AuthoringBlockSettings,
  BlockEditorProps,
  BlockRendererProps,
} from "../types";
import { blockSchemas } from "./schemas";
import { DEFAULT_BLOCK_CONTENTS, DEFAULT_BLOCK_SETTINGS } from "./factory";
import { z } from "zod";

import {
  HeadingEditor,
  ParagraphEditor,
  ImageEditor,
  VideoEditor,
  CodeEditor,
  QuoteEditor,
  CalloutEditor,
  DividerEditor,
} from "./editors/BlockEditors";

import {
  ButtonBlockEditor,
  ChecklistEditor,
  AccordionEditor,
  TabsEditor,
  GalleryEditor,
  FileDownloadEditor,
  EmbedEditor,
  QuizBlockEditor,
  CertificateBlockEditor,
  SpacerEditor,
} from "./editors/BlockEditors2";

import {
  HeadingRenderer,
  ParagraphRenderer,
  ImageRenderer,
  VideoRenderer,
  CodeRenderer,
  QuoteRenderer,
  CalloutRenderer,
  DividerRenderer,
} from "./renderers/BlockRenderers";

import {
  ButtonBlockRenderer,
  ChecklistRenderer,
  AccordionRenderer,
  TabsRenderer,
  GalleryRenderer,
  FileDownloadRenderer,
  EmbedRenderer,
  QuizBlockRenderer,
  CertificateBlockRenderer,
  SpacerRenderer,
} from "./renderers/BlockRenderers2";

const defaultSettingsSchema = z
  .object({
    visibility: z.enum(["visible", "hidden", "instructor_only"]).default("visible"),
    className: z.string().optional(),
    paddingY: z.enum(["none", "small", "medium", "large"]).optional(),
    backgroundColor: z.string().optional(),
  })
  .passthrough();

function createStandardNormalize(defaultContent: Record<string, unknown>) {
  return (content: Record<string, unknown>, settings?: AuthoringBlockSettings) => {
    return {
      content_json: { ...defaultContent, ...(content || {}) },
      settings_json: {
        visibility: settings?.visibility || "visible",
        ...(settings || {}),
      },
    };
  };
}

function createIdentityMigrate() {
  return (raw: Record<string, unknown>) => raw || {};
}

class BlockRegistryImpl {
  private registry = new Map<BlockType, BlockDefinition>();

  constructor() {
    this.registerDefaults();
  }

  public register(definition: BlockDefinition): void {
    this.registry.set(definition.type, definition);
  }

  public get(type: BlockType): BlockDefinition | undefined {
    return this.registry.get(type);
  }

  public getAll(): BlockDefinition[] {
    return Array.from(this.registry.values());
  }

  public getByCategory(category: BlockCategory): BlockDefinition[] {
    return this.getAll().filter((def) => def.category === category);
  }

  private registerDefaults(): void {
    const rawDefinitions: Array<{
      type: BlockType;
      label: string;
      description: string;
      category: BlockCategory;
      iconName: string;
      editor: React.ComponentType<BlockEditorProps<never>>;
      renderer: React.ComponentType<BlockRendererProps<never>>;
      schema: z.ZodSchema;
      defaultContent: Record<string, unknown>;
      migrate?: (raw: Record<string, unknown>) => Record<string, unknown>;
    }> = [
      {
        type: "heading",
        label: "Título / Encabezado",
        description: "Título H1, H2 o H3 con alineación configurable",
        category: "text",
        iconName: "Heading",
        editor: HeadingEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: HeadingRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        schema: blockSchemas.heading,
        defaultContent: DEFAULT_BLOCK_CONTENTS.heading,
        migrate: (raw) => {
          if (raw.text || raw.content) {
            return {
              text: String(raw.text || raw.content || ""),
              level: Number(raw.level || 2),
              alignment: String(raw.alignment || "left"),
            };
          }
          return raw;
        },
      },
      {
        type: "paragraph",
        label: "Párrafo de Texto",
        description: "Bloque de texto explicativo con formato",
        category: "text",
        iconName: "Pilcrow",
        editor: ParagraphEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: ParagraphRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        schema: blockSchemas.paragraph,
        defaultContent: DEFAULT_BLOCK_CONTENTS.paragraph,
        migrate: (raw) => {
          if (typeof raw === "string") return { text: raw };
          return { text: String(raw.text || raw.content || "") };
        },
      },
      {
        type: "image",
        label: "Imagen Ilustrativa",
        description: "Imagen con pie de foto y texto ALT obligatorio",
        category: "media",
        iconName: "Image",
        editor: ImageEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: ImageRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        schema: blockSchemas.image,
        defaultContent: DEFAULT_BLOCK_CONTENTS.image,
      },
      {
        type: "video",
        label: "Reproductor de Vídeo",
        description: "YouTube, Vimeo, HLS o almacenamiento Supabase",
        category: "media",
        iconName: "Video",
        editor: VideoEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: VideoRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        schema: blockSchemas.video,
        defaultContent: DEFAULT_BLOCK_CONTENTS.video,
      },
      {
        type: "code",
        label: "Código Fuente",
        description: "Bloque de código con resaltado y sintaxis",
        category: "text",
        iconName: "Code",
        editor: CodeEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: CodeRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        schema: blockSchemas.code,
        defaultContent: DEFAULT_BLOCK_CONTENTS.code,
      },
      {
        type: "quote",
        label: "Cita / Destacado",
        description: "Frase célebre o testimonio con autoría",
        category: "text",
        iconName: "Quote",
        editor: QuoteEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: QuoteRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        schema: blockSchemas.quote,
        defaultContent: DEFAULT_BLOCK_CONTENTS.quote,
      },
      {
        type: "callout",
        label: "Caja de Destacado / Alerta",
        description: "Mensaje resaltado de información, advertencia o éxito",
        category: "education",
        iconName: "Info",
        editor: CalloutEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: CalloutRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        schema: blockSchemas.callout,
        defaultContent: DEFAULT_BLOCK_CONTENTS.callout,
      },
      {
        type: "divider",
        label: "Separador",
        description: "Línea horizontal divisoria entre secciones",
        category: "text",
        iconName: "Minus",
        editor: DividerEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: DividerRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        schema: blockSchemas.divider,
        defaultContent: DEFAULT_BLOCK_CONTENTS.divider,
      },
      {
        type: "button",
        label: "Botón de Acción",
        description: "Enlace o llamada a la acción resaltada",
        category: "interactive",
        iconName: "MousePointerClick",
        editor: ButtonBlockEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: ButtonBlockRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        schema: blockSchemas.button,
        defaultContent: DEFAULT_BLOCK_CONTENTS.button,
      },
      {
        type: "checklist",
        label: "Lista de Verificación",
        description: "Casillas interactivas para marcar avances",
        category: "interactive",
        iconName: "CheckSquare",
        editor: ChecklistEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: ChecklistRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        schema: blockSchemas.checklist,
        defaultContent: DEFAULT_BLOCK_CONTENTS.checklist,
      },
      {
        type: "accordion",
        label: "Acordeón Desplegable",
        description: "Secciones colapsables para preguntas o detalles",
        category: "interactive",
        iconName: "ListCollapse",
        editor: AccordionEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: AccordionRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        schema: blockSchemas.accordion,
        defaultContent: DEFAULT_BLOCK_CONTENTS.accordion,
      },
      {
        type: "tabs",
        label: "Pestañas Contenido",
        description: "Organización de información por pestañas",
        category: "interactive",
        iconName: "FolderKanban",
        editor: TabsEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: TabsRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        schema: blockSchemas.tabs,
        defaultContent: DEFAULT_BLOCK_CONTENTS.tabs,
      },
      {
        type: "gallery",
        label: "Galería de Imágenes",
        description: "Cuadrícula o carrusel de varias imágenes",
        category: "media",
        iconName: "Images",
        editor: GalleryEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: GalleryRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        schema: blockSchemas.gallery,
        defaultContent: DEFAULT_BLOCK_CONTENTS.gallery,
      },
      {
        type: "file_download",
        label: "Archivo Descargable",
        description: "Enlace a PDF, ZIP, DOCX o recursos del curso",
        category: "media",
        iconName: "FileDown",
        editor: FileDownloadEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: FileDownloadRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        schema: blockSchemas.file_download,
        defaultContent: DEFAULT_BLOCK_CONTENTS.file_download,
      },
      {
        type: "embed",
        label: "Incrustado (Embed)",
        description: "YouTube, Figma, Canva, Vimeo o Loom whitelist",
        category: "media",
        iconName: "Globe",
        editor: EmbedEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: EmbedRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        schema: blockSchemas.embed,
        defaultContent: DEFAULT_BLOCK_CONTENTS.embed,
      },
      {
        type: "quiz_block",
        label: "Evaluación Quiz",
        description: "Incrustar un cuestionario evaluativo",
        category: "education",
        iconName: "HelpCircle",
        editor: QuizBlockEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: QuizBlockRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        schema: blockSchemas.quiz_block,
        defaultContent: DEFAULT_BLOCK_CONTENTS.quiz_block,
      },
      {
        type: "certificate_block",
        label: "Bloque de Certificado",
        description: "Aviso de acreditación oficial del curso",
        category: "education",
        iconName: "Award",
        editor: CertificateBlockEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: CertificateBlockRenderer as unknown as React.ComponentType<
          BlockRendererProps<never>
        >,
        schema: blockSchemas.certificate_block,
        defaultContent: DEFAULT_BLOCK_CONTENTS.certificate_block,
      },
      {
        type: "spacer",
        label: "Espaciador Vertical",
        description: "Margen transparente para ajustar ritmo visual",
        category: "advanced",
        iconName: "Maximize2",
        editor: SpacerEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: SpacerRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        schema: blockSchemas.spacer,
        defaultContent: DEFAULT_BLOCK_CONTENTS.spacer,
      },
    ];

    rawDefinitions.forEach((def) => {
      const fullDefinition: BlockDefinition = {
        type: def.type,
        label: def.label,
        name: def.label,
        description: def.description,
        category: def.category,
        iconName: def.iconName,
        editor: def.editor,
        renderer: def.renderer,
        contentSchema: def.schema,
        settingsSchema: defaultSettingsSchema,
        validator: def.schema,
        defaultContent: def.defaultContent,
        defaultSettings: DEFAULT_BLOCK_SETTINGS,
        normalize: createStandardNormalize(def.defaultContent),
        migrate: def.migrate || createIdentityMigrate(),
      };
      this.register(fullDefinition);
    });
  }
}

export const BlockRegistry = new BlockRegistryImpl();
