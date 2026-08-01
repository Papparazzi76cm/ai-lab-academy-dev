/**
 * Block model shared by the Notion-style lesson editor and the lesson renderer.
 * Lesson content is stored as a JSON array of blocks in `lessons.content`.
 */
export type BlockType =
  | "heading"
  | "text"
  | "image"
  | "video"
  | "code"
  | "table"
  | "button"
  | "quote"
  | "list"
  | "checklist"
  | "divider"
  | "pdf"
  | "audio"
  | "question"
  | "quiz"
  | "gallery"
  | "callout";

export type Block = {
  id: string;
  type: BlockType;
  /** Free-form payload per block type (text, url, items, language, level...). */
  data: Record<string, unknown>;
};

export const blockCatalog: { type: BlockType; label: string; icon: string }[] = [
  { type: "heading", label: "Título", icon: "Heading" },
  { type: "text", label: "Texto", icon: "Type" },
  { type: "image", label: "Imagen", icon: "Image" },
  { type: "video", label: "Vídeo", icon: "Video" },
  { type: "code", label: "Código", icon: "Code" },
  { type: "table", label: "Tabla", icon: "Table" },
  { type: "button", label: "Botón", icon: "MousePointerClick" },
  { type: "quote", label: "Cita", icon: "Quote" },
  { type: "list", label: "Lista", icon: "List" },
  { type: "checklist", label: "Checklist", icon: "ListChecks" },
  { type: "divider", label: "Separador", icon: "Minus" },
  { type: "pdf", label: "PDF", icon: "FileText" },
  { type: "audio", label: "Audio", icon: "AudioLines" },
  { type: "question", label: "Pregunta", icon: "HelpCircle" },
  { type: "quiz", label: "Quiz", icon: "ClipboardCheck" },
  { type: "gallery", label: "Galería", icon: "Images" },
  { type: "callout", label: "Callout", icon: "Lightbulb" },
];

export function createBlock(type: BlockType): Block {
  const defaults: Partial<Record<BlockType, Record<string, unknown>>> = {
    heading: { text: "Nuevo título", level: 2 },
    text: { text: "Escribe aquí el contenido de la lección…" },
    code: { code: "console.log('Hola IA')", language: "ts" },
    list: { items: ["Primer punto"], ordered: false },
    checklist: { items: [{ text: "Tarea", done: false }] },
    callout: { text: "Nota importante", tone: "info" },
    quote: { text: "Cita inspiradora", author: "" },
    table: { headers: ["Columna A", "Columna B"], rows: [["", ""]] },
    button: { label: "Abrir recurso", url: "#" },
    image: { url: "", alt: "" },
    video: { url: "" },
    pdf: { url: "", title: "Documento" },
    audio: { url: "" },
    gallery: { urls: [] },
    question: { prompt: "¿Qué has aprendido?", answer: "" },
    quiz: { quizId: null },
  };

  return {
    id: crypto.randomUUID(),
    type,
    data: defaults[type] ?? {},
  };
}

export function parseBlocks(value: unknown): Block[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Block =>
      typeof item === "object" && item !== null && "type" in item && "id" in item,
  );
}
