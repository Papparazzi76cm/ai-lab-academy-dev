import type { AuthoringBlock, BlockType, Visibility } from "../types";
import { BlockRegistry } from "./registry";

/**
 * Validates whether a string is a standard UUID.
 */
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Generates a deterministic UUID v4/v5 format string from an arbitrary text seed.
 */
export function generateDeterministicUUID(seed: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x097c1fda;
  for (let i = 0; i < seed.length; i++) {
    const code = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ code, 0x050c5f1d);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const hex2 = (h2 >>> 0).toString(16).padStart(8, "0");
  const hex3 = Math.abs(h1 ^ h2)
    .toString(16)
    .padStart(8, "0");
  const hex4 = Math.abs(h1 + h2)
    .toString(16)
    .padStart(8, "0");

  return `${hex1}-${hex2.slice(0, 4)}-4${hex2.slice(4, 7)}-a${hex3.slice(0, 3)}-${hex3.slice(3, 7)}${hex4.slice(0, 8)}`;
}

/**
 * Maps legacy/alias block types to their canonical BlockType without breaking callout semantics.
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
      return "callout"; // Preserves callout semantics explicitly
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
    const fallbackSeed = `raw_fallback_${positionIndex}_${String(raw || "")}`;
    return {
      id: generateDeterministicUUID(fallbackSeed),
      type: "paragraph",
      position: positionIndex,
      visibility: "visible",
      schema_version: 1,
      content_json: { text: String(raw || "") },
      settings_json: { visibility: "visible" },
    };
  }

  const record = raw as Record<string, unknown>;

  // Ensure deterministic, stable UUID identifier for legacy blocks
  const rawId = String(record["id"] || "").trim();
  let id: string;
  if (isValidUUID(rawId)) {
    id = rawId;
  } else if (rawId !== "") {
    id = generateDeterministicUUID(`legacy_id:${rawId}`);
  } else {
    const seed = `legacy_pos:${String(record["lesson_id"] || "")}:${positionIndex}:${JSON.stringify(record["content_json"] || record["content"] || {})}`;
    id = generateDeterministicUUID(seed);
  }

  // Normalize block type
  const rawType = String(record["type"] || "paragraph");
  const canonicalType = normalizeBlockType(rawType);

  // Extract raw content and settings
  let contentJson = (record["content_json"] || record["content"] || {}) as Record<string, unknown>;
  let settingsJson = (record["settings_json"] || record["settings"] || {}) as Record<
    string,
    unknown
  >;

  // Normalize variant explicitly for callouts / alerts
  if (canonicalType === "callout" || canonicalType === "warning") {
    const rawVariant = String(
      contentJson["variant"] || contentJson["type"] || "info",
    ).toLowerCase();
    const validVariant = ["info", "warning", "success", "danger"].includes(rawVariant)
      ? rawVariant
      : "info";
    contentJson = { ...contentJson, variant: validVariant };
  }

  // Check if registry definition provides migration/normalization logic
  const definition = BlockRegistry.get(canonicalType) || BlockRegistry.get(rawType as BlockType);

  if (definition) {
    contentJson = definition.migrate(contentJson);
    const normalized = definition.normalize(contentJson, settingsJson);
    contentJson = normalized.content_json;
    settingsJson = normalized.settings_json;
  }

  // Ensure valid visibility property
  const rawVisibility = String(settingsJson["visibility"] || record["visibility"] || "visible");
  const visibility: Visibility =
    rawVisibility === "hidden" || rawVisibility === "instructor_only" ? rawVisibility : "visible";

  const block: AuthoringBlock = {
    id,
    type: canonicalType,
    position:
      typeof record["position"] === "number" ? (record["position"] as number) : positionIndex,
    visibility,
    schema_version: 1,
    content_json: contentJson,
    settings_json: { ...settingsJson, visibility },
  };

  if (typeof record["lesson_id"] === "string") {
    block.lesson_id = record["lesson_id"] as string;
  }
  if (typeof record["created_at"] === "string") {
    block.created_at = record["created_at"] as string;
  }
  if (typeof record["updated_at"] === "string") {
    block.updated_at = record["updated_at"] as string;
  }

  return block;
}

/**
 * Adapts an array of raw blocks into normalized AuthoringBlock items with sequential positions.
 */
export function adaptRawBlocks(rawList: unknown): AuthoringBlock[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((item, index) => adaptRawBlock(item, index));
}
