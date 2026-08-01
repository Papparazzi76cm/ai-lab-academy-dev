/**
 * Centralized URL validation and sanitization module for AI Lab Academy.
 * Ensures protection against XSS (javascript:, data:, file: URIs) and restricts iframe embeds to trusted domains.
 */

const DANGEROUS_PROTOCOLS = ["javascript:", "data:", "file:", "vbscript:", "blob:"];
const ALLOWED_PROTOCOLS = ["http:", "https:"];

/**
 * Sanitizes and normalizes a generic URL string.
 * Returns empty string if the URL is dangerous, malformed, or uses unpermitted protocols.
 */
export function sanitizeUrl(
  rawUrl: unknown,
  options: { allowRelative?: boolean } = { allowRelative: true },
): string {
  if (typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";

  // Reject dangerous protocols inline (case-insensitive)
  const lower = trimmed.toLowerCase();
  for (const dangerous of DANGEROUS_PROTOCOLS) {
    if (lower.startsWith(dangerous)) {
      return "";
    }
  }

  // Allow safe relative paths
  if (options.allowRelative && (trimmed.startsWith("/") || trimmed.startsWith("#"))) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return "";
    }
    return parsed.href;
  } catch {
    // If URL parsing fails, check if adding https:// makes it valid or if it's invalid
    if (options.allowRelative && !trimmed.includes(":")) {
      return trimmed;
    }
    return "";
  }
}

/**
 * Validates and extracts safe YouTube embed URL (youtube-nocookie.com).
 * Returns null if the URL is not a valid YouTube link.
 */
export function getSafeYouTubeEmbedUrl(rawUrl: unknown): string | null {
  const sanitized = sanitizeUrl(rawUrl, { allowRelative: false });
  if (!sanitized) return null;

  try {
    const url = new URL(sanitized);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    let videoId: string | null = null;

    if (host === "youtu.be") {
      videoId = url.pathname.slice(1).split("/")[0] || null;
    } else if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      if (url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/embed/")[1]?.split("/")[0] || null;
      } else if (url.pathname.startsWith("/watch")) {
        videoId = url.searchParams.get("v");
      } else if (url.pathname.startsWith("/v/")) {
        videoId = url.pathname.split("/v/")[1]?.split("/")[0] || null;
      } else if (url.pathname.startsWith("/shorts/")) {
        videoId = url.pathname.split("/shorts/")[1]?.split("/")[0] || null;
      }
    }

    if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return `https://www.youtube-nocookie.com/embed/${videoId}`;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Validates and extracts safe Vimeo embed URL.
 * Returns null if the URL is not a valid Vimeo link.
 */
export function getSafeVimeoEmbedUrl(rawUrl: unknown): string | null {
  const sanitized = sanitizeUrl(rawUrl, { allowRelative: false });
  if (!sanitized) return null;

  try {
    const url = new URL(sanitized);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    let videoId: string | null = null;

    if (host === "vimeo.com") {
      const match = url.pathname.match(/\/(\d+)/);
      if (match && match[1]) {
        videoId = match[1];
      }
    } else if (host === "player.vimeo.com") {
      const match = url.pathname.match(/\/video\/(\d+)/);
      if (match && match[1]) {
        videoId = match[1];
      }
    }

    if (videoId && /^\d+$/.test(videoId)) {
      return `https://player.vimeo.com/video/${videoId}`;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Validates if an iframe URL belongs to an allowed domain (YouTube, Vimeo, Google Drive, or HTTPS).
 */
export function isAllowedIframeUrl(rawUrl: unknown): boolean {
  const sanitized = sanitizeUrl(rawUrl, { allowRelative: false });
  if (!sanitized) return false;

  try {
    const url = new URL(sanitized);
    if (url.protocol !== "https:") return false;

    const host = url.hostname.toLowerCase();
    const allowedDomains = [
      "youtube.com",
      "www.youtube.com",
      "youtube-nocookie.com",
      "www.youtube-nocookie.com",
      "youtu.be",
      "vimeo.com",
      "www.vimeo.com",
      "player.vimeo.com",
      "drive.google.com",
      "docs.google.com",
    ];

    return allowedDomains.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
}
