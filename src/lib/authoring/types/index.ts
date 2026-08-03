import type { z } from "zod";
import type { ComponentType } from "react";

export type BlockType =
  | "heading"
  | "paragraph"
  | "image"
  | "video"
  | "code"
  | "quote"
  | "callout"
  | "divider"
  | "button"
  | "checklist"
  | "accordion"
  | "tabs"
  | "gallery"
  | "file_download"
  | "embed"
  | "quiz_block"
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
  name: string;
  description: string;
  category: BlockCategory;
  iconName: string;
  editor: ComponentType<BlockEditorProps<never>>;
  renderer: ComponentType<BlockRendererProps<never>>;
  validator: z.ZodSchema;
  defaultContent: Record<string, unknown>;
  defaultSettings: AuthoringBlockSettings;
}

export interface LessonVersion {
  id: string;
  lesson_id: string;
  version_number: number;
  blocks_snapshot: AuthoringBlock[];
  commit_message?: string | null;
  published_by?: string | null;
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

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";
