import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import type { BlockType } from "@/lib/blocks";
import { strVal, arrVal } from "./editor-utils";

export function MediaBlockEditor({
  type,
  content,
  onChange,
}: {
  type: BlockType;
  content: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  switch (type) {
    case "image":
      return (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">URL de la imagen</label>
            <Input
              placeholder="https://ejemplo.com/imagen.jpg"
              value={strVal(content, "url")}
              onChange={(e) => onChange({ ...content, url: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Texto alternativo (Alt)
              </label>
              <Input
                placeholder="Descripción para accesibilidad..."
                value={strVal(content, "alt")}
                onChange={(e) => onChange({ ...content, alt: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Pie de foto (Caption)
              </label>
              <Input
                placeholder="Leyenda o pie de imagen..."
                value={strVal(content, "caption")}
                onChange={(e) => onChange({ ...content, caption: e.target.value })}
              />
            </div>
          </div>
        </div>
      );

    case "youtube":
    case "vimeo":
    case "video_file":
    case "video":
      return (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">URL del vídeo</label>
          <Input
            placeholder="https://www.youtube.com/watch?v=..."
            value={strVal(content, "url")}
            onChange={(e) => onChange({ ...content, url: e.target.value })}
          />
          <Input
            placeholder="Título del vídeo (opcional)..."
            value={strVal(content, "title")}
            onChange={(e) => onChange({ ...content, title: e.target.value })}
          />
        </div>
      );

    case "audio":
      return (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            URL del archivo de audio
          </label>
          <Input
            placeholder="https://ejemplo.com/audio.mp3"
            value={strVal(content, "url")}
            onChange={(e) => onChange({ ...content, url: e.target.value })}
          />
          <Input
            placeholder="Título del podcast u audio..."
            value={strVal(content, "title")}
            onChange={(e) => onChange({ ...content, title: e.target.value })}
          />
        </div>
      );

    case "gallery": {
      const images = arrVal<{ url: string; caption?: string }>(content, "images");
      return (
        <div className="space-y-3">
          {images.map((img, idx) => (
            <div
              key={idx}
              className="flex gap-2 items-center rounded-lg border border-border p-2 bg-muted/20"
            >
              <div className="flex-1 space-y-1">
                <Input
                  placeholder="URL de imagen..."
                  value={img.url}
                  onChange={(e) => {
                    const next = [...images];
                    const current = next[idx] || { url: "", caption: "" };
                    next[idx] = { url: e.target.value, caption: current.caption || "" };
                    onChange({ ...content, images: next });
                  }}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="Pie de foto..."
                  value={img.caption || ""}
                  onChange={(e) => {
                    const next = [...images];
                    const current = next[idx] || { url: "", caption: "" };
                    next[idx] = { url: current.url || "", caption: e.target.value };
                    onChange({ ...content, images: next });
                  }}
                  className="h-8 text-xs"
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => {
                  const next = images.filter((_, i) => i !== idx);
                  onChange({ ...content, images: next });
                }}
                className="size-8 text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onChange({ ...content, images: [...images, { url: "", caption: "" }] })}
            className="h-8 text-xs gap-1"
          >
            <Plus className="size-3.5" />
            <span>Añadir imagen a galería</span>
          </Button>
        </div>
      );
    }

    default:
      return null;
  }
}
