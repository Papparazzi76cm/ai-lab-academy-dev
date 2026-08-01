import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BlockType } from "@/lib/blocks";
import { strVal } from "./editor-utils";

export function ResourceBlockEditor({
  type,
  content,
  onChange,
}: {
  type: BlockType;
  content: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  switch (type) {
    case "download_button":
    case "button":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Etiqueta del botón</label>
            <Input
              placeholder="Descargar archivo..."
              value={strVal(content, "label")}
              onChange={(e) => onChange({ ...content, label: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">URL de descarga</label>
            <Input
              placeholder="https://..."
              value={strVal(content, "url")}
              onChange={(e) => onChange({ ...content, url: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Nombre de archivo (opcional)
            </label>
            <Input
              placeholder="plantilla.zip"
              value={strVal(content, "filename")}
              onChange={(e) => onChange({ ...content, filename: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Tamaño estimado (opcional)
            </label>
            <Input
              placeholder="1.5 MB"
              value={strVal(content, "size")}
              onChange={(e) => onChange({ ...content, size: e.target.value })}
            />
          </div>
        </div>
      );

    case "external_link":
      return (
        <div className="space-y-2">
          <Input
            placeholder="Título del enlace..."
            value={strVal(content, "label")}
            onChange={(e) => onChange({ ...content, label: e.target.value })}
          />
          <Input
            placeholder="URL (https://...)"
            value={strVal(content, "url")}
            onChange={(e) => onChange({ ...content, url: e.target.value })}
          />
          <Textarea
            placeholder="Descripción corta del enlace..."
            rows={2}
            value={strVal(content, "description")}
            onChange={(e) => onChange({ ...content, description: e.target.value })}
          />
        </div>
      );

    case "pdf_embed":
    case "pdf":
      return (
        <div className="space-y-2">
          <Input
            placeholder="Título del documento PDF..."
            value={strVal(content, "title")}
            onChange={(e) => onChange({ ...content, title: e.target.value })}
          />
          <Input
            placeholder="URL del PDF (https://...)"
            value={strVal(content, "url")}
            onChange={(e) => onChange({ ...content, url: e.target.value })}
          />
        </div>
      );

    default:
      return null;
  }
}
