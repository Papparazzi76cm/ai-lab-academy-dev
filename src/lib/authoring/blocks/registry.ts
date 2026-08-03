import type { BlockDefinition, BlockType, BlockCategory } from "../types";
import { blockSchemas } from "./schemas";
import { DEFAULT_BLOCK_CONTENTS, DEFAULT_BLOCK_SETTINGS } from "./factory";

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
    const defaultDefinitions: BlockDefinition[] = [
      {
        type: "heading",
        name: "Título / Encabezado",
        description: "Título H1, H2 o H3 con alineación configurable",
        category: "text",
        iconName: "Heading",
        editor: HeadingEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: HeadingRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        validator: blockSchemas.heading,
        defaultContent: DEFAULT_BLOCK_CONTENTS.heading,
        defaultSettings: DEFAULT_BLOCK_SETTINGS,
      },
      {
        type: "paragraph",
        name: "Párrafo de Texto",
        description: "Bloque de texto explicativo con formato",
        category: "text",
        iconName: "Pilcrow",
        editor: ParagraphEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: ParagraphRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        validator: blockSchemas.paragraph,
        defaultContent: DEFAULT_BLOCK_CONTENTS.paragraph,
        defaultSettings: DEFAULT_BLOCK_SETTINGS,
      },
      {
        type: "image",
        name: "Imagen Ilustrativa",
        description: "Imagen con pie de foto y texto ALT obligatorio",
        category: "media",
        iconName: "Image",
        editor: ImageEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: ImageRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        validator: blockSchemas.image,
        defaultContent: DEFAULT_BLOCK_CONTENTS.image,
        defaultSettings: DEFAULT_BLOCK_SETTINGS,
      },
      {
        type: "video",
        name: "Reproductor de Vídeo",
        description: "YouTube, Vimeo, HLS o almacenamiento Supabase",
        category: "media",
        iconName: "Video",
        editor: VideoEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: VideoRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        validator: blockSchemas.video,
        defaultContent: DEFAULT_BLOCK_CONTENTS.video,
        defaultSettings: DEFAULT_BLOCK_SETTINGS,
      },
      {
        type: "code",
        name: "Código Fuente",
        description: "Bloque de código con resaltado y sintaxis",
        category: "text",
        iconName: "Code",
        editor: CodeEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: CodeRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        validator: blockSchemas.code,
        defaultContent: DEFAULT_BLOCK_CONTENTS.code,
        defaultSettings: DEFAULT_BLOCK_SETTINGS,
      },
      {
        type: "quote",
        name: "Cita / Destacado",
        description: "Frase célebre o testimonio con autoría",
        category: "text",
        iconName: "Quote",
        editor: QuoteEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: QuoteRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        validator: blockSchemas.quote,
        defaultContent: DEFAULT_BLOCK_CONTENTS.quote,
        defaultSettings: DEFAULT_BLOCK_SETTINGS,
      },
      {
        type: "callout",
        name: "Caja de Destacado / Alerta",
        description: "Mensaje resaltado de información, advertencia o éxito",
        category: "education",
        iconName: "Info",
        editor: CalloutEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: CalloutRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        validator: blockSchemas.callout,
        defaultContent: DEFAULT_BLOCK_CONTENTS.callout,
        defaultSettings: DEFAULT_BLOCK_SETTINGS,
      },
      {
        type: "divider",
        name: "Separador",
        description: "Línea horizontal divisoria entre secciones",
        category: "text",
        iconName: "Minus",
        editor: DividerEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: DividerRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        validator: blockSchemas.divider,
        defaultContent: DEFAULT_BLOCK_CONTENTS.divider,
        defaultSettings: DEFAULT_BLOCK_SETTINGS,
      },
      {
        type: "button",
        name: "Botón de Acción",
        description: "Enlace o llamada a la acción resaltada",
        category: "interactive",
        iconName: "MousePointerClick",
        editor: ButtonBlockEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: ButtonBlockRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        validator: blockSchemas.button,
        defaultContent: DEFAULT_BLOCK_CONTENTS.button,
        defaultSettings: DEFAULT_BLOCK_SETTINGS,
      },
      {
        type: "checklist",
        name: "Lista de Verificación",
        description: "Casillas interactivas para marcar avances",
        category: "interactive",
        iconName: "CheckSquare",
        editor: ChecklistEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: ChecklistRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        validator: blockSchemas.checklist,
        defaultContent: DEFAULT_BLOCK_CONTENTS.checklist,
        defaultSettings: DEFAULT_BLOCK_SETTINGS,
      },
      {
        type: "accordion",
        name: "Acordeón Desplegable",
        description: "Secciones colapsables para preguntas o detalles",
        category: "interactive",
        iconName: "ListCollapse",
        editor: AccordionEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: AccordionRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        validator: blockSchemas.accordion,
        defaultContent: DEFAULT_BLOCK_CONTENTS.accordion,
        defaultSettings: DEFAULT_BLOCK_SETTINGS,
      },
      {
        type: "tabs",
        name: "Pestañas Contenido",
        description: "Organización de información por pestañas",
        category: "interactive",
        iconName: "FolderKanban",
        editor: TabsEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: TabsRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        validator: blockSchemas.tabs,
        defaultContent: DEFAULT_BLOCK_CONTENTS.tabs,
        defaultSettings: DEFAULT_BLOCK_SETTINGS,
      },
      {
        type: "gallery",
        name: "Galería de Imágenes",
        description: "Cuadrícula o carrusel de varias imágenes",
        category: "media",
        iconName: "Images",
        editor: GalleryEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: GalleryRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        validator: blockSchemas.gallery,
        defaultContent: DEFAULT_BLOCK_CONTENTS.gallery,
        defaultSettings: DEFAULT_BLOCK_SETTINGS,
      },
      {
        type: "file_download",
        name: "Archivo Descargable",
        description: "Enlace a PDF, ZIP, DOCX o recursos del curso",
        category: "media",
        iconName: "FileDown",
        editor: FileDownloadEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: FileDownloadRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        validator: blockSchemas.file_download,
        defaultContent: DEFAULT_BLOCK_CONTENTS.file_download,
        defaultSettings: DEFAULT_BLOCK_SETTINGS,
      },
      {
        type: "embed",
        name: "Incrustado (Embed)",
        description: "YouTube, Figma, Canva, Vimeo o Loom whitelist",
        category: "media",
        iconName: "Globe",
        editor: EmbedEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: EmbedRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        validator: blockSchemas.embed,
        defaultContent: DEFAULT_BLOCK_CONTENTS.embed,
        defaultSettings: DEFAULT_BLOCK_SETTINGS,
      },
      {
        type: "quiz_block",
        name: "Evaluación Quiz",
        description: "Incrustar un cuestionario evaluativo",
        category: "education",
        iconName: "HelpCircle",
        editor: QuizBlockEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: QuizBlockRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        validator: blockSchemas.quiz_block,
        defaultContent: DEFAULT_BLOCK_CONTENTS.quiz_block,
        defaultSettings: DEFAULT_BLOCK_SETTINGS,
      },
      {
        type: "certificate_block",
        name: "Bloque de Certificado",
        description: "Aviso de acreditación oficial del curso",
        category: "education",
        iconName: "Award",
        editor: CertificateBlockEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: CertificateBlockRenderer as unknown as React.ComponentType<
          BlockRendererProps<never>
        >,
        validator: blockSchemas.certificate_block,
        defaultContent: DEFAULT_BLOCK_CONTENTS.certificate_block,
        defaultSettings: DEFAULT_BLOCK_SETTINGS,
      },
      {
        type: "spacer",
        name: "Espaciador Vertical",
        description: "Margen transparente para ajustar ritmo visual",
        category: "advanced",
        iconName: "Maximize2",
        editor: SpacerEditor as unknown as React.ComponentType<BlockEditorProps<never>>,
        renderer: SpacerRenderer as unknown as React.ComponentType<BlockRendererProps<never>>,
        validator: blockSchemas.spacer,
        defaultContent: DEFAULT_BLOCK_CONTENTS.spacer,
        defaultSettings: DEFAULT_BLOCK_SETTINGS,
      },
    ];

    defaultDefinitions.forEach((def) => this.register(def));
  }
}

export const BlockRegistry = new BlockRegistryImpl();
