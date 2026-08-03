import type { AuthoringBlock, BlockType, Visibility } from "../types";
import { BlockRegistry } from "./registry";

/**
 * Validates whether a string is a standard UUID.
 */
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Maps legacy/alias block types to their canonical BlockType.
 */
export function normalizeBlockType(type: string): BlockType {
  const lowercase = (type || "").toLowerCase().trim();
  switch (lowercase) {
    case "h1":
    case "h2":
    case "h3":
      return "heading";
    case "text":
      return "paragraph";
    case "list":
      return "bullet_list";
    case "callout":
      return "warning";
    case "video_file":
      return "video";
    case "file_download":
      return "download_button";
    case "question":
      return "open_question";
    case "quiz":
      return "quiz_block";
    case "pdf":
      return "pdf_embed";
    default:
      return (lowercase || "paragraph") as BlockType;
  }
}

/**
 * Adapts raw data from database or legacy stores into a strictly typed AuthoringBlock.
 */
export function adaptRawBlock(raw: unknown, positionIndex: number): AuthoringBlock {
  if (!raw || typeof raw !== "object") {
    return {
      id: crypto.randomUUID(),
      type: "paragraph",
      position: positionIndex,
      visibility: "visible",
      content_json: { text: String(raw || "") },
      settings_json: { visibility: "visible" },
    };
  }

  const record = raw as Record<string, unknown>;

  // Ensure stable UUID identifier
  const rawId = String(record.id || "").trim();
  const id = isValidUUID(rawId) ? rawId : crypto.randomUUID();

  // Normalize block type
  const rawType = String(record.type || "paragraph");
  const canonicalType = normalizeBlockType(rawType);

  // Extract raw content and settings
  let contentJson = (record.content_json || record.content || {}) as Record<string, unknown>;
  let settingsJson = (record.settings_json || record.settings || {}) as Record<string, unknown>;

  // Check if registry definition provides migration/normalization logic
  const definition = BlockRegistry.get(canonicalType) || BlockRegistry.get(rawType as BlockType);

  if (definition) {
    contentJson = definition.migrate(contentJson);
    const normalized = definition.normalize(contentJson, settingsJson);
    contentJson = normalized.content_json;
    settingsJson = normalized.settings_json;
  }

  // Ensure valid visibility property
  const rawVisibility = String(settingsJson.visibility || record.visibility || "visible");
  const visibility: Visibility =
    rawVisibility === "hidden" || rawVisibility === "instructor_only" ? rawVisibility : "visible";

  return {
    id,
    lesson_id: typeof record.lesson_id === "string" ? record.lesson_id : undefined,
    type: canonicalType,
    position: typeof record.position === "number" ? record.position : positionIndex,
    visibility,
    content_json: contentJson,
    settings_json: { ...settingsJson, visibility },
    created_at: typeof record.created_at === "string" ? record.created_at : undefined,
    updated_at: typeof record.updated_at === "string" ? record.updated_at : undefined,
  };
}

/**
 * Adapts an array of raw blocks into normalized AuthoringBlock items with sequential positions.
 */
export function adaptRawBlocks(rawList: unknown): AuthoringBlock[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((item, index) => adaptRawBlock(item, index));
}
