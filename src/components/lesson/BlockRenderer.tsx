import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LessonBlockItem, BlockType } from "@/lib/blocks";
import {
  Copy,
  Check,
  Download,
  ExternalLink,
  FileText,
  Lightbulb,
  AlertTriangle,
  BookOpen,
  Target,
  Dumbbell,
  Trophy,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

function str(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function BlockRenderer({
  blocks,
  className,
}: {
  blocks: LessonBlockItem[];
  className?: string;
}) {
  if (!blocks.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
        Esta lección todavía no tiene contenido.
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {blocks.map((block) => (
        <BlockView key={block.id} block={block} />
      ))}
    </div>
  );
}

function BlockView({ block }: { block: LessonBlockItem }) {
  const c = (block.content_json || {}) as Record<string, unknown>;
  const s = (block.settings_json || {}) as Record<string, unknown>;
  const type: BlockType = block.type;

  switch (type) {
    case "h1":
      return (
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          {str(c["text"])}
        </h1>
      );

    case "h2":
    case "heading":
      return (
        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground mt-2">
          {str(c["text"])}
        </h2>
      );

    case "h3":
      return (
        <h3 className="font-display text-xl font-semibold tracking-tight text-foreground mt-1">
          {str(c["text"])}
        </h3>
      );

    case "paragraph":
    case "text":
      return (
        <p className="text-base leading-relaxed text-foreground/90 whitespace-pre-line">
          {str(c["text"])}
        </p>
      );

    case "bullet_list":
    case "list": {
      const items = Array.isArray(c["items"]) ? (c["items"] as string[]) : [];
      return (
        <ul className="list-disc space-y-2 pl-6 text-foreground/90">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    }

    case "numbered_list": {
      const items = Array.isArray(c["items"]) ? (c["items"] as string[]) : [];
      return (
        <ol className="list-decimal space-y-2 pl-6 text-foreground/90">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
    }

    case "quote":
      return (
        <blockquote className="border-l-4 border-primary pl-5 py-1 text-lg italic text-muted-foreground bg-muted/20 rounded-r-xl">
          <p>&ldquo;{str(c["text"])}&rdquo;</p>
          {str(c["author"]) && (
            <footer className="mt-2 text-xs font-medium not-italic text-foreground/80">
              — {str(c["author"])}
            </footer>
          )}
        </blockquote>
      );

    case "divider":
      return <hr className="border-border my-2" />;

    case "image":
      return str(c["url"]) ? (
        <figure className="space-y-2">
          <img
            src={str(c["url"])}
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
      ) : null;

    case "youtube": {
      const url = str(c["url"]);
      let embedUrl = url;

      if (url.includes("youtube.com/watch?v=")) {
        const id = url.split("v=")[1]?.split("&")[0];
        embedUrl = `https://www.youtube.com/embed/${id}`;
      } else if (url.includes("youtu.be/")) {
        const id = url.split("youtu.be/")[1]?.split("?")[0];
        embedUrl = `https://www.youtube.com/embed/${id}`;
      }

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
      const url = str(c["url"]);
      let embedUrl = url;
      if (!url.includes("player.vimeo.com")) {
        const id = url.split("vimeo.com/")[1]?.split("?")[0];
        embedUrl = `https://player.vimeo.com/video/${id}`;
      }
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
    case "video":
      return str(c["url"]) ? (
        <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-black shadow-md">
          <video controls src={str(c["url"])} className="size-full">
            Tu navegador no soporta la reproducción de vídeo.
          </video>
        </div>
      ) : null;

    case "audio":
      return str(c["url"]) ? (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2 shadow-xs">
          {str(c["title"]) && (
            <p className="text-sm font-medium text-foreground">{str(c["title"])}</p>
          )}
          <audio controls src={str(c["url"])} className="w-full" />
        </div>
      ) : null;

    case "gallery": {
      const images = Array.isArray(c["images"])
        ? (c["images"] as Array<{ url: string; caption?: string }>)
        : [];
      const cols = Number(s["columns"]) || 2;
      return (
        <div
          className={cn(
            "grid gap-4",
            cols === 1 && "grid-cols-1",
            cols === 2 && "grid-cols-1 sm:grid-cols-2",
            cols === 3 && "grid-cols-1 sm:grid-cols-3",
            cols === 4 && "grid-cols-2 sm:grid-cols-4",
          )}
        >
          {images.map(
            (img, i) =>
              img.url && (
                <figure key={i} className="space-y-1">
                  <img
                    src={img.url}
                    alt=""
                    loading="lazy"
                    className="w-full h-48 rounded-xl border border-border object-cover"
                  />
                  {img.caption && (
                    <figcaption className="text-center text-xs text-muted-foreground">
                      {img.caption}
                    </figcaption>
                  )}
                </figure>
              ),
          )}
        </div>
      );
    }

    case "code":
      return (
        <CodeBlockView
          code={str(c["code"])}
          language={str(c["language"], "typescript")}
          title={str(c["title"])}
          showLineNumbers={s["showLineNumbers"] !== false}
        />
      );

    case "download_button":
      return (
        <div className="rounded-2xl border border-border bg-muted/20 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-foreground">
              {str(c["label"], "Descargar recurso")}
            </p>
            {str(c["filename"]) && (
              <p className="text-xs text-muted-foreground">
                {str(c["filename"])} {str(c["size"]) && `(${str(c["size"])})`}
              </p>
            )}
          </div>
          <Button asChild className="gap-2">
            <a href={str(c["url"], "#")} download target="_blank" rel="noreferrer">
              <Download className="size-4" />
              <span>Descargar</span>
            </a>
          </Button>
        </div>
      );

    case "external_link":
      return (
        <a
          href={str(c["url"], "#")}
          target="_blank"
          rel="noreferrer"
          className="group block rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                {str(c["label"], "Enlace externo")}
              </span>
              {str(c["description"]) && (
                <p className="text-xs text-muted-foreground">{str(c["description"])}</p>
              )}
            </div>
            <ExternalLink className="size-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </div>
        </a>
      );

    case "pdf_embed":
    case "pdf":
      return (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <span className="text-sm font-medium">{str(c["title"], "Documento PDF")}</span>
            </div>
            {str(c["url"]) && (
              <Button size="sm" variant="outline" asChild className="h-8 gap-1.5 text-xs">
                <a href={str(c["url"])} target="_blank" rel="noreferrer">
                  <Download className="size-3.5" />
                  <span>Abrir PDF</span>
                </a>
              </Button>
            )}
          </div>
          {str(c["url"]) ? (
            <iframe
              src={str(c["url"])}
              title={str(c["title"], "Visor PDF")}
              className="w-full h-[500px]"
            />
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">
              URL de PDF no especificada.
            </div>
          )}
        </div>
      );

    case "objectives": {
      const items = Array.isArray(c["items"]) ? (c["items"] as string[]) : [];
      return (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-primary font-display font-semibold text-base">
            <Target className="size-5" />
            <span>Objetivos de aprendizaje</span>
          </div>
          <ul className="space-y-2 pl-1">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/90">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold mt-0.5">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    case "summary":
      return (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-display font-semibold text-base">
            <BookOpen className="size-5" />
            <span>{str(c["title"], "Resumen")}</span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{str(c["text"])}</p>
        </div>
      );

    case "tip":
      return (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-display font-semibold text-base">
            <Lightbulb className="size-5" />
            <span>{str(c["title"], "Consejo práctico")}</span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{str(c["text"])}</p>
        </div>
      );

    case "warning":
    case "callout":
      return (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertTriangle className="size-4" />
          <AlertTitle>{str(c["title"], "Atención")}</AlertTitle>
          <AlertDescription>{str(c["text"])}</AlertDescription>
        </Alert>
      );

    case "exercise":
      return (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-foreground font-display font-semibold text-base">
            <Dumbbell className="size-5 text-primary" />
            <span>{str(c["title"], "Ejercicio práctico")}</span>
          </div>
          <p className="text-sm text-foreground/90">{str(c["instructions"])}</p>
        </div>
      );

    case "challenge":
      return (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-5 space-y-3">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-display font-semibold text-base">
            <Trophy className="size-5" />
            <span>{str(c["title"], "Reto de aprendizaje")}</span>
          </div>
          <p className="text-sm text-foreground/90 font-medium">{str(c["goal"])}</p>
          {str(c["hint"]) && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="hint" className="border-none">
                <AccordionTrigger className="py-1 text-xs text-muted-foreground hover:no-underline">
                  💡 Ver pista
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground pt-1">
                  {str(c["hint"])}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      );

    case "open_question":
    case "question":
      return (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs">
          <div className="flex items-start gap-3">
            <HelpCircle className="size-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {str(c["question"] || c["prompt"])}
              </p>
            </div>
          </div>
          {(str(c["sampleAnswer"]) || str(c["answer"])) && (
            <Accordion type="single" collapsible className="w-full border-t border-border pt-2">
              <AccordionItem value="answer" className="border-none">
                <AccordionTrigger className="py-1 text-xs text-primary font-medium hover:no-underline">
                  Mostrar respuesta sugerida
                </AccordionTrigger>
                <AccordionContent className="text-sm text-foreground/90 pt-2 bg-muted/30 p-3 rounded-xl mt-1">
                  {str(c["sampleAnswer"] || c["answer"])}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      );

    default:
      return null;
  }
}

function CodeBlockView({
  code,
  language,
  title,
  showLineNumbers,
}: {
  code: string;
  language: string;
  title?: string;
  showLineNumbers?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split("\n");

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-md">
      {/* Code Header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-slate-700 bg-slate-800 text-slate-300 text-[10px] font-mono uppercase"
          >
            {language}
          </Badge>
          {title && <span className="text-xs font-mono text-slate-400">{title}</span>}
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={copyToClipboard}
          className="h-7 gap-1.5 px-2.5 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Copiar</span>
            </>
          )}
        </Button>
      </div>

      {/* Code Area */}
      <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-200 leading-relaxed">
        <code>
          {showLineNumbers
            ? lines.map((line, idx) => (
                <div key={idx} className="table-row">
                  <span className="table-cell select-none pr-4 text-right text-slate-600 font-mono text-[11px]">
                    {idx + 1}
                  </span>
                  <span className="table-cell">{line}</span>
                </div>
              ))
            : code}
        </code>
      </pre>
    </div>
  );
}
