import type { z } from "zod";
import type { ComponentType } from "react";

export type BlockType =
  // Texto
  | "heading"
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "text"
  | "bullet_list"
  | "numbered_list"
  | "list"
  | "quote"
  | "divider"
  // Multimedia
  | "image"
  | "youtube"
  | "vimeo"
  | "video_file"
  | "video"
  | "audio"
  | "gallery"
  // Código
  | "code"
  // Recursos & Interactivos
  | "download_button"
  | "button"
  | "external_link"
  | "pdf_embed"
  | "pdf"
  | "checklist"
  | "accordion"
  | "tabs"
  | "file_download"
  | "embed"
  // Educación
  | "objectives"
  | "summary"
  | "tip"
  | "warning"
  | "callout"
  | "exercise"
  | "challenge"
  | "open_question"
  | "question"
  | "quiz_block"
  | "quiz"
  | "certificate_block"
  | "spacer";

export type BlockCategory = "text" | "media" | "interactive" | "education" | "advanced";

export type Visibility = "visible" | "hidden" | "instructor_only";

export interface AuthoringBlockSettings {
  visibility?: Visibility;
  className?: string;
  paddingY?: "none" | "small" | "medium" | "large";
  backgroundColor?: string;
  [key: string]: unknown;
}

export interface AuthoringBlock {
  id: string;
  lesson_id?: string;
  type: BlockType;
  position: number;
  visibility: Visibility;
  settings_json: AuthoringBlockSettings;
  content_json: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface BlockEditorProps<T = Record<string, unknown>> {
  block: AuthoringBlock;
  content: T;
  settings: AuthoringBlockSettings;
  onChangeContent: (newContent: Partial<T>) => void;
  onChangeSettings: (newSettings: Partial<AuthoringBlockSettings>) => void;
  readOnly?: boolean;
}

export interface BlockRendererProps<T = Record<string, unknown>> {
  block: AuthoringBlock;
  content: T;
  settings: AuthoringBlockSettings;
  isPreview?: boolean;
}

export interface BlockDefinition {
  type: BlockType;
  label: string;
  name: string; // Compatibility alias for label
  description: string;
  category: BlockCategory;
  iconName: string;
  editor: ComponentType<BlockEditorProps<never>>;
  renderer: ComponentType<BlockRendererProps<never>>;
  contentSchema: z.ZodSchema;
  settingsSchema: z.ZodSchema;
  validator: z.ZodSchema; // Compatibility alias for contentSchema
  defaultContent: Record<string, unknown>;
  defaultSettings: AuthoringBlockSettings;
  normalize: (
    content: Record<string, unknown>,
    settings?: AuthoringBlockSettings,
  ) => { content_json: Record<string, unknown>; settings_json: AuthoringBlockSettings };
  migrate: (raw: Record<string, unknown>) => Record<string, unknown>;
}

export interface LessonVersion {
  id: string;
  lesson_id: string;
  version_number: number;
  schema_version?: number;
  revision?: number;
  blocks_snapshot: AuthoringBlock[];
  commit_message?: string | null;
  reason?: string | null;
  source?: string | null;
  published_by?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface LessonSnapshot {
  version_number: number;
  lesson_id: string;
  blocks_snapshot: AuthoringBlock[];
  published_by?: string;
  commit_message?: string;
  created_at: string;
}

export interface ModifiedBlockDiff {
  oldBlock: AuthoringBlock;
  newBlock: AuthoringBlock;
  changes: string[];
}

export interface VersionDiff {
  addedBlocks: AuthoringBlock[];
  removedBlocks: AuthoringBlock[];
  modifiedBlocks: ModifiedBlockDiff[];
}

export type AutosaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";
