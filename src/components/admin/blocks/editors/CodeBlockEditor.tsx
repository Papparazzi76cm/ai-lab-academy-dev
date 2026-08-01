import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { strVal } from "./editor-utils";

export function CodeBlockEditor({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Lenguaje</label>
          <Select
            value={strVal(content, "language", "typescript")}
            onValueChange={(val) => onChange({ ...content, language: val })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="typescript">TypeScript</SelectItem>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="sql">SQL</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
              <SelectItem value="css">CSS</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="bash">Bash / Shell</SelectItem>
              <SelectItem value="markdown">Markdown</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Título del archivo (opcional)
          </label>
          <Input
            placeholder="p. ej. index.ts"
            value={strVal(content, "title")}
            onChange={(e) => onChange({ ...content, title: e.target.value })}
            className="h-9"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Código</label>
        <Textarea
          placeholder="Escribe el código aquí..."
          rows={6}
          value={strVal(content, "code")}
          onChange={(e) => onChange({ ...content, code: e.target.value })}
          className="font-mono text-xs leading-relaxed bg-slate-950 text-slate-100 dark:bg-slate-900"
        />
      </div>
    </div>
  );
}
