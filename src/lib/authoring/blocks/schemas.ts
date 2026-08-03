import { z } from "zod";

export const headingBlockSchema = z.object({
  text: z.string().min(1, "El título no puede estar vacío"),
  level: z.number().int().min(1).max(6).default(2),
  alignment: z.enum(["left", "center", "right"]).default("left"),
});

export const paragraphBlockSchema = z.object({
  text: z.string().default(""),
  alignment: z.enum(["left", "center", "right", "justify"]).default("left"),
});

export const imageBlockSchema = z.object({
  url: z.string().url("Debe ser una URL válida").or(z.string().min(1, "URL de imagen requerida")),
  caption: z.string().optional().default(""),
  alt: z.string().min(1, "El texto alternativo (ALT) es obligatorio por accesibilidad"),
  size: z.enum(["small", "medium", "full"]).default("medium"),
  alignment: z.enum(["left", "center", "right"]).default("center"),
});

export const videoBlockSchema = z.object({
  provider: z.enum(["youtube", "vimeo", "storage", "hls"]).default("youtube"),
  url: z.string().min(1, "URL de vídeo requerida"),
  autoplay: z.boolean().default(false),
  controls: z.boolean().default(true),
  startTime: z.number().nonnegative().default(0),
});

export const codeBlockSchema = z.object({
  code: z.string().default(""),
  language: z.string().default("typescript"),
  showLineNumbers: z.boolean().default(true),
  filename: z.string().optional().default(""),
});

export const quoteBlockSchema = z.object({
  text: z.string().min(1, "El texto de la cita es obligatorio"),
  author: z.string().optional().default(""),
  citation: z.string().optional().default(""),
});

export const calloutBlockSchema = z.object({
  variant: z.enum(["info", "warning", "success", "danger"]).default("info"),
  title: z.string().optional().default(""),
  text: z.string().min(1, "El mensaje es obligatorio"),
  icon: z.string().optional().default(""),
});

export const dividerBlockSchema = z.object({
  style: z.enum(["solid", "dashed", "dotted"]).default("solid"),
});

export const buttonBlockSchema = z.object({
  label: z.string().min(1, "El texto del botón es obligatorio"),
  url: z.string().min(1, "La URL del enlace es obligatoria"),
  variant: z.enum(["primary", "secondary", "outline"]).default("primary"),
  openInNewTab: z.boolean().default(true),
});

export const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  checked: z.boolean().default(false),
});

export const checklistBlockSchema = z.object({
  items: z.array(checklistItemSchema).default([]),
});

export const accordionItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "El título del acordeón es obligatorio"),
  content: z.string().default(""),
});

export const accordionBlockSchema = z.object({
  items: z.array(accordionItemSchema).default([]),
});

export const tabItemSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "La etiqueta de la pestaña es obligatoria"),
  content: z.string().default(""),
});

export const tabsBlockSchema = z.object({
  items: z.array(tabItemSchema).default([]),
});

export const galleryImageSchema = z.object({
  url: z.string().min(1, "URL de imagen requerida"),
  caption: z.string().optional().default(""),
  alt: z.string().min(1, "Texto alt requerido"),
});

export const galleryBlockSchema = z.object({
  images: z.array(galleryImageSchema).default([]),
  layout: z.enum(["grid", "carousel", "masonry"]).default("grid"),
});

export const fileDownloadBlockSchema = z.object({
  filename: z.string().min(1, "Nombre del archivo requerido"),
  fileUrl: z.string().min(1, "URL del archivo requerida"),
  fileSize: z.string().optional().default(""),
  fileType: z.string().optional().default("pdf"),
  description: z.string().optional().default(""),
});

export const EMBED_PROVIDER_WHITELIST = ["youtube", "vimeo", "figma", "canva", "loom"] as const;

export const embedBlockSchema = z.object({
  provider: z.enum(EMBED_PROVIDER_WHITELIST),
  embedUrl: z.string().min(1, "URL de inserción requerida"),
  aspectRatio: z.enum(["16:9", "4:3", "1:1"]).default("16:9"),
  title: z.string().optional().default("Contenido integrado"),
});

export const quizBlockSchema = z.object({
  quizId: z.string().min(1, "Debes seleccionar un Quiz"),
  showTitle: z.boolean().default(true),
  showPassingScore: z.boolean().default(true),
});

export const certificateBlockSchema = z.object({
  templateId: z.string().optional().default(""),
  title: z.string().default("Certificado Oficial"),
  description: z.string().default("Obtén tu acreditación al finalizar el curso."),
});

export const spacerBlockSchema = z.object({
  height: z.number().int().min(8).max(200).default(32),
});

export const blockSchemas = {
  heading: headingBlockSchema,
  paragraph: paragraphBlockSchema,
  image: imageBlockSchema,
  video: videoBlockSchema,
  code: codeBlockSchema,
  quote: quoteBlockSchema,
  callout: calloutBlockSchema,
  divider: dividerBlockSchema,
  button: buttonBlockSchema,
  checklist: checklistBlockSchema,
  accordion: accordionBlockSchema,
  tabs: tabsBlockSchema,
  gallery: galleryBlockSchema,
  file_download: fileDownloadBlockSchema,
  embed: embedBlockSchema,
  quiz_block: quizBlockSchema,
  certificate_block: certificateBlockSchema,
  spacer: spacerBlockSchema,
};
