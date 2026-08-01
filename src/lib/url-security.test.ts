import { describe, it, expect } from "vitest";
import {
  sanitizeUrl,
  getSafeYouTubeEmbedUrl,
  getSafeVimeoEmbedUrl,
  isAllowedIframeUrl,
} from "./url-security";

describe("URL Security Utilities", () => {
  it("sanitizes safe http and https URLs", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com/");
    expect(sanitizeUrl("http://example.com/path?query=1")).toBe("http://example.com/path?query=1");
  });

  it("blocks dangerous protocols like javascript: and data:", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe("");
    expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBe("");
  });

  it("converts YouTube watch URLs to safe embed URLs", () => {
    const embed = getSafeYouTubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(embed).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("converts YouTube short URLs to safe embed URLs", () => {
    const embed = getSafeYouTubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ");
    expect(embed).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("converts Vimeo URLs to safe embed URLs", () => {
    const embed = getSafeVimeoEmbedUrl("https://vimeo.com/123456789");
    expect(embed).toBe("https://player.vimeo.com/video/123456789");
  });

  it("checks allowed iframe domains", () => {
    expect(isAllowedIframeUrl("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")).toBe(true);
    expect(isAllowedIframeUrl("https://player.vimeo.com/video/123456789")).toBe(true);
    expect(isAllowedIframeUrl("https://malicious-domain.com/embed")).toBe(false);
  });
});
