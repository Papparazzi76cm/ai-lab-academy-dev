import type { LessonBlockItem } from "@/lib/blocks";
import {
  sanitizeUrl,
  getSafeYouTubeEmbedUrl,
  getSafeVimeoEmbedUrl,
  isAllowedIframeUrl,
} from "@/lib/url-security";
import { cn } from "@/lib/utils";
import { str } from "./renderer-utils";

export function MediaBlockRenderer({ block }: { block: LessonBlockItem }) {
  const c = (block.content_json || {}) as Record<string, unknown>;
  const s = (block.settings_json || {}) as Record<string, unknown>;
  const type = block.type;

  switch (type) {
    case "image": {
      const imageUrl = sanitizeUrl(c["url"]);
      if (!imageUrl) return null;
      return (
        <figure className="space-y-2">
          <img
            src={imageUrl}
            alt={str(c["alt"], "Imagen de la lección")}
            loading="lazy"
            className="w-full rounded-2xl border border-border object-cover shadow-xs"
          />
          {str(c["caption"]) && (
            <figcaption className="text-center text-xs text-muted-foreground">
              {str(c["caption"])}
            </figcaption>
          )}
        </figure>
      );
    }

    case "youtube": {
      const embedUrl = getSafeYouTubeEmbedUrl(c["url"]);
      if (!embedUrl || !isAllowedIframeUrl(embedUrl)) return null;
      return (
        <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-black shadow-md">
          <iframe
            src={embedUrl}
            title={str(c["title"], "Vídeo de YouTube")}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="size-full"
          />
        </div>
      );
    }

    case "vimeo": {
      const embedUrl = getSafeVimeoEmbedUrl(c["url"]);
      if (!embedUrl || !isAllowedIframeUrl(embedUrl)) return null;
      return (
        <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-black shadow-md">
          <iframe
            src={embedUrl}
            title={str(c["title"], "Vídeo de Vimeo")}
            allowFullScreen
            className="size-full"
          />
        </div>
      );
    }

    case "video_file":
    case "video": {
      const videoUrl = sanitizeUrl(c["url"]);
      if (!videoUrl) return null;
      return (
        <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-black shadow-md">
          <video controls src={videoUrl} className="size-full">
            Tu navegador no soporta la reproducción de vídeo.
          </video>
        </div>
      );
    }

    case "audio": {
      const audioUrl = sanitizeUrl(c["url"]);
      if (!audioUrl) return null;
      return (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2 shadow-xs">
          {str(c["title"]) && (
            <p className="text-sm font-medium text-foreground">{str(c["title"])}</p>
          )}
          <audio controls src={audioUrl} className="w-full" />
        </div>
      );
    }

    case "gallery": {
      const rawImages = Array.isArray(c["images"])
        ? (c["images"] as Array<{ url: string; caption?: string }>)
        : [];
      const images = rawImages.filter((img) => Boolean(sanitizeUrl(img.url)));
      const cols = Number(s["columns"]) || 2;
      if (images.length === 0) return null;

      return (
        <div
          className={cn(
            "grid gap-4",
            cols === 1 && "grid-cols-1",
            cols === 2 && "grid-cols-1 sm:grid-cols-2",
            cols >= 3 && "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
          )}
        >
          {images.map((img, idx) => (
            <figure key={idx} className="space-y-1.5">
              <img
                src={sanitizeUrl(img.url)}
                alt={img.caption || `Imagen ${idx + 1}`}
                loading="lazy"
                className="w-full h-48 object-cover rounded-xl border border-border shadow-2xs"
              />
              {img.caption && (
                <figcaption className="text-center text-xs text-muted-foreground">
                  {img.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      );
    }

    default:
      return null;
  }
}
