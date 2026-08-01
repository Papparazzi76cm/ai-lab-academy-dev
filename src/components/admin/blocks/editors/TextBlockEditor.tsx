import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BlockType } from "@/lib/blocks";
import { strVal } from "./editor-utils";

export function TextBlockEditor({
  type,
  content,
  onChange,
}: {
  type: BlockType;
  content: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  switch (type) {
    case "h1":
    case "h2":
    case "h3":
    case "heading":
      return (
        <Input
          placeholder={`Texto del ${type.toUpperCase()}...`}
          value={strVal(content, "text")}
          onChange={(e) => onChange({ ...content, text: e.target.value })}
          className="font-semibold text-lg"
        />
      );

    case "paragraph":
    case "text":
      return (
        <Textarea
          placeholder="Escribe el párrafo explicativo..."
          rows={3}
          value={strVal(content, "text")}
          onChange={(e) => onChange({ ...content, text: e.target.value })}
          className="text-sm leading-relaxed"
        />
      );

    case "quote":
      return (
        <div className="space-y-2">
          <Textarea
            placeholder="Texto de la cita..."
            rows={2}
            value={strVal(content, "text")}
            onChange={(e) => onChange({ ...content, text: e.target.value })}
            className="italic text-sm"
          />
          <Input
            placeholder="Autor o fuente (opcional)..."
            value={strVal(content, "author")}
            onChange={(e) => onChange({ ...content, author: e.target.value })}
            className="text-xs"
          />
        </div>
      );

    case "divider":
      return (
        <div className="py-2 text-center text-xs text-muted-foreground italic border-t border-border">
          Línea divisoria horizontal
        </div>
      );

    default:
      return (
        <Textarea
          placeholder="Contenido del texto..."
          rows={3}
          value={strVal(content, "text")}
          onChange={(e) => onChange({ ...content, text: e.target.value })}
        />
      );
  }
}
