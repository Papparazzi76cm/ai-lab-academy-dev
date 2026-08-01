import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BlockDragHandle } from "./BlockDragHandle";
import { BlockContextMenu } from "./BlockContextMenu";
import { BlockSettings } from "./BlockSettings";
import type { BlockType, LessonBlockItem } from "@/lib/blocks";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  List,
  ListOrdered,
  Quote,
  Minus,
  Image as ImageIcon,
  Youtube,
  Video,
  FileVideo,
  AudioLines,
  Images,
  Code,
  Download,
  ExternalLink,
  FileText,
  Target,
  BookOpen,
  Lightbulb,
  AlertTriangle,
  Dumbbell,
  Trophy,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

function strVal(obj: Record<string, unknown>, key: string, fallback = ""): string {
  const v = obj[key];
  return typeof v === "string" ? v : fallback;
}

function arrVal<T>(obj: Record<string, unknown>, key: string): T[] {
  const v = obj[key];
  return Array.isArray(v) ? (v as T[]) : [];
}

const typeIconMap: Record<string, LucideIcon> = {
  h1: Heading1,
  h2: Heading2,
  h3: Heading3,
  paragraph: AlignLeft,
  text: AlignLeft,
  bullet_list: List,
  list: List,
  numbered_list: ListOrdered,
  quote: Quote,
  divider: Minus,
  image: ImageIcon,
  youtube: Youtube,
  vimeo: Video,
  video_file: FileVideo,
  audio: AudioLines,
  gallery: Images,
  code: Code,
  download_button: Download,
  external_link: ExternalLink,
  pdf_embed: FileText,
  objectives: Target,
  summary: BookOpen,
  tip: Lightbulb,
  warning: AlertTriangle,
  exercise: Dumbbell,
  challenge: Trophy,
  open_question: HelpCircle,
};

const typeLabelMap: Record<string, string> = {
  h1: "Título H1",
  h2: "Título H2",
  h3: "Título H3",
  paragraph: "Párrafo",
  bullet_list: "Lista con viñetas",
  numbered_list: "Lista numerada",
  quote: "Cita",
  divider: "Separador",
  image: "Imagen",
  youtube: "Vídeo YouTube",
  vimeo: "Vídeo Vimeo",
  video_file: "Archivo de vídeo",
  audio: "Audio",
  gallery: "Galería",
  code: "Bloque de código",
  download_button: "Botón descarga",
  external_link: "Enlace externo",
  pdf_embed: "PDF incrustado",
  objectives: "Objetivos de aprendizaje",
  summary: "Resumen",
  tip: "Consejo",
  warning: "Advertencia",
  exercise: "Ejercicio",
  challenge: "Reto",
  open_question: "Pregunta abierta",
};

export const BlockItemEditor = memo(function BlockItemEditor({
  block,
  isExpanded,
  onToggleExpand,
  onChangeContent,
  onChangeSettings,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  block: LessonBlockItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onChangeContent: (content: Record<string, unknown>) => void;
  onChangeSettings: (settings: Record<string, unknown>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const Icon = typeIconMap[block.type] || AlignLeft;
  const label = typeLabelMap[block.type] || block.type;
  const c = block.content_json || {};

  return (
    <div className="group/block relative rounded-xl border border-border bg-card shadow-2xs transition-all hover:border-primary/40 focus-within:border-primary/60">
      {/* Block Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-3 py-2 rounded-t-xl">
        <div className="flex items-center gap-2">
          <BlockDragHandle />

          <button
            type="button"
            onClick={onToggleExpand}
            className="flex items-center gap-2 text-xs font-medium text-foreground hover:text-primary focus:outline-none"
          >
            {isExpanded ? (
              <ChevronDown className="size-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            )}
            <div className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="size-3" />
            </div>
            <span>{label}</span>
          </button>
        </div>

        {/* Collapsed summary text */}
        {!isExpanded && (
          <span className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[300px] hidden sm:inline">
            {strVal(c, "text") ||
              strVal(c, "title") ||
              strVal(c, "question") ||
              strVal(c, "code").slice(0, 30)}
          </span>
        )}

        {/* Block Actions Dropdown */}
        <div className="flex items-center gap-1">
          <BlockContextMenu
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onOpenSettings={() => setSettingsOpen(true)}
            isFirst={isFirst}
            isLast={isLast}
          />
        </div>
      </div>

      {/* Block Body Inputs */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {renderBlockSpecificInputs(block.type, c, onChangeContent)}
        </div>
      )}

      {/* Settings Dialog */}
      <BlockSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        type={block.type}
        settings={block.settings_json}
        onSaveSettings={onChangeSettings}
      />
    </div>
  );
});

function renderBlockSpecificInputs(
  type: BlockType,
  c: Record<string, unknown>,
  onChange: (data: Record<string, unknown>) => void,
) {
  switch (type) {
    case "h1":
    case "h2":
    case "h3":
      return (
        <Input
          placeholder={`Texto del ${type.toUpperCase()}...`}
          value={strVal(c, "text")}
          onChange={(e) => onChange({ text: e.target.value })}
          className="font-semibold text-lg"
        />
      );

    case "paragraph":
    case "text":
      return (
        <Textarea
          placeholder="Escribe el párrafo explicativo..."
          rows={3}
          value={strVal(c, "text")}
          onChange={(e) => onChange({ text: e.target.value })}
          className="text-sm leading-relaxed"
        />
      );

    case "bullet_list":
    case "numbered_list":
    case "objectives": {
      const items = arrVal<string>(c, "items").length ? arrVal<string>(c, "items") : [""];
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
                  onChange({ items: next });
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => {
                  const next = items.filter((_, i) => i !== idx);
                  onChange({ items: next });
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
            onClick={() => onChange({ items: [...items, ""] })}
            className="h-7 text-xs gap-1 mt-1"
          >
            <Plus className="size-3" />
            <span>Añadir elemento</span>
          </Button>
        </div>
      );
    }

    case "quote":
      return (
        <div className="space-y-2">
          <Textarea
            placeholder="Texto de la cita..."
            rows={2}
            value={strVal(c, "text")}
            onChange={(e) => onChange({ ...c, text: e.target.value })}
            className="italic text-sm"
          />
          <Input
            placeholder="Autor o fuente (opcional)..."
            value={strVal(c, "author")}
            onChange={(e) => onChange({ ...c, author: e.target.value })}
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

    case "image":
      return (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">URL de la imagen</label>
            <Input
              placeholder="https://ejemplo.com/imagen.jpg"
              value={strVal(c, "url")}
              onChange={(e) => onChange({ ...c, url: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Texto alternativo (Alt)
              </label>
              <Input
                placeholder="Descripción para accesibilidad..."
                value={strVal(c, "alt")}
                onChange={(e) => onChange({ ...c, alt: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Pie de foto (Caption)
              </label>
              <Input
                placeholder="Leyenda o pie de imagen..."
                value={strVal(c, "caption")}
                onChange={(e) => onChange({ ...c, caption: e.target.value })}
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
            value={strVal(c, "url")}
            onChange={(e) => onChange({ ...c, url: e.target.value })}
          />
          <Input
            placeholder="Título del vídeo (opcional)..."
            value={strVal(c, "title")}
            onChange={(e) => onChange({ ...c, title: e.target.value })}
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
            value={strVal(c, "url")}
            onChange={(e) => onChange({ ...c, url: e.target.value })}
          />
          <Input
            placeholder="Título del podcast u audio..."
            value={strVal(c, "title")}
            onChange={(e) => onChange({ ...c, title: e.target.value })}
          />
        </div>
      );

    case "gallery": {
      const images = arrVal<{ url: string; caption?: string }>(c, "images");
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
                    onChange({ images: next });
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
                    onChange({ images: next });
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
                  onChange({ images: next });
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
            onClick={() => onChange({ images: [...images, { url: "", caption: "" }] })}
            className="h-8 text-xs gap-1"
          >
            <Plus className="size-3.5" />
            <span>Añadir imagen a galería</span>
          </Button>
        </div>
      );
    }

    case "code":
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Lenguaje</label>
              <Select
                value={strVal(c, "language", "typescript")}
                onValueChange={(val) => onChange({ ...c, language: val })}
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
                value={strVal(c, "title")}
                onChange={(e) => onChange({ ...c, title: e.target.value })}
                className="h-9"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Código</label>
            <Textarea
              placeholder="Escribe el código aquí..."
              rows={6}
              value={strVal(c, "code")}
              onChange={(e) => onChange({ ...c, code: e.target.value })}
              className="font-mono text-xs leading-relaxed bg-slate-950 text-slate-100 dark:bg-slate-900"
            />
          </div>
        </div>
      );

    case "download_button":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Etiqueta del botón</label>
            <Input
              placeholder="Descargar archivo..."
              value={strVal(c, "label")}
              onChange={(e) => onChange({ ...c, label: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">URL de descarga</label>
            <Input
              placeholder="https://..."
              value={strVal(c, "url")}
              onChange={(e) => onChange({ ...c, url: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Nombre de archivo (opcional)
            </label>
            <Input
              placeholder="plantilla.zip"
              value={strVal(c, "filename")}
              onChange={(e) => onChange({ ...c, filename: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Tamaño estimado (opcional)
            </label>
            <Input
              placeholder="1.5 MB"
              value={strVal(c, "size")}
              onChange={(e) => onChange({ ...c, size: e.target.value })}
            />
          </div>
        </div>
      );

    case "external_link":
      return (
        <div className="space-y-2">
          <Input
            placeholder="Título del enlace..."
            value={strVal(c, "label")}
            onChange={(e) => onChange({ ...c, label: e.target.value })}
          />
          <Input
            placeholder="URL (https://...)"
            value={strVal(c, "url")}
            onChange={(e) => onChange({ ...c, url: e.target.value })}
          />
          <Textarea
            placeholder="Descripción corta del enlace..."
            rows={2}
            value={strVal(c, "description")}
            onChange={(e) => onChange({ ...c, description: e.target.value })}
          />
        </div>
      );

    case "pdf_embed":
    case "pdf":
      return (
        <div className="space-y-2">
          <Input
            placeholder="Título del documento PDF..."
            value={strVal(c, "title")}
            onChange={(e) => onChange({ ...c, title: e.target.value })}
          />
          <Input
            placeholder="URL del PDF (https://...)"
            value={strVal(c, "url")}
            onChange={(e) => onChange({ ...c, url: e.target.value })}
          />
        </div>
      );

    case "summary":
    case "tip":
    case "warning":
    case "callout":
      return (
        <div className="space-y-2">
          <Input
            placeholder="Título del mensaje..."
            value={strVal(c, "title")}
            onChange={(e) => onChange({ ...c, title: e.target.value })}
          />
          <Textarea
            placeholder="Contenido explicativo..."
            rows={3}
            value={strVal(c, "text")}
            onChange={(e) => onChange({ ...c, text: e.target.value })}
          />
        </div>
      );

    case "exercise":
      return (
        <div className="space-y-3">
          <Input
            placeholder="Título del ejercicio..."
            value={strVal(c, "title")}
            onChange={(e) => onChange({ ...c, title: e.target.value })}
            className="font-medium"
          />
          <Textarea
            placeholder="Instrucciones generales del ejercicio..."
            rows={2}
            value={strVal(c, "instructions")}
            onChange={(e) => onChange({ ...c, instructions: e.target.value })}
          />
        </div>
      );

    case "challenge":
      return (
        <div className="space-y-3">
          <Input
            placeholder="Título del reto..."
            value={strVal(c, "title")}
            onChange={(e) => onChange({ ...c, title: e.target.value })}
            className="font-medium"
          />
          <Textarea
            placeholder="Objetivo del reto..."
            rows={2}
            value={strVal(c, "goal")}
            onChange={(e) => onChange({ ...c, goal: e.target.value })}
          />
          <Input
            placeholder="Pista u orientación (opcional)..."
            value={strVal(c, "hint")}
            onChange={(e) => onChange({ ...c, hint: e.target.value })}
            className="text-xs"
          />
        </div>
      );

    case "open_question":
    case "question":
      return (
        <div className="space-y-3">
          <Textarea
            placeholder="Pregunta de reflexión..."
            rows={2}
            value={strVal(c, "question") || strVal(c, "prompt")}
            onChange={(e) => onChange({ ...c, question: e.target.value, prompt: e.target.value })}
          />
          <Textarea
            placeholder="Respuesta sugerida o pista (se revelará en la lección)..."
            rows={2}
            value={strVal(c, "sampleAnswer") || strVal(c, "answer")}
            onChange={(e) =>
              onChange({ ...c, sampleAnswer: e.target.value, answer: e.target.value })
            }
          />
        </div>
      );

    default:
      return (
        <Textarea
          placeholder="Contenido del bloque..."
          rows={3}
          value={strVal(c, "text")}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      );
  }
}
