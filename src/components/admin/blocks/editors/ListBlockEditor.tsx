import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import type { BlockType } from "@/lib/blocks";
import { arrVal } from "./editor-utils";

export function ListBlockEditor({
  type,
  content,
  onChange,
}: {
  type: BlockType;
  content: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const items = arrVal<string>(content, "items").length ? arrVal<string>(content, "items") : [""];

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-5 text-right font-mono">
            {type === "numbered_list" ? `${idx + 1}.` : "•"}
          </span>
          <Input
            placeholder={`Elemento ${idx + 1}...`}
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[idx] = e.target.value;
              onChange({ ...content, items: next });
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => {
              const next = items.filter((_, i) => i !== idx);
              onChange({ ...content, items: next });
            }}
            className="size-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onChange({ ...content, items: [...items, ""] })}
        className="h-7 text-xs gap-1 mt-1"
      >
        <Plus className="size-3" />
        <span>Añadir elemento</span>
      </Button>
    </div>
  );
}
