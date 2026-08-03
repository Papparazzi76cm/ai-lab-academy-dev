import React from "react";
import type { BlockRendererProps } from "../../types";
import {
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Quote as QuoteIcon,
  Download,
  FileText,
  ExternalLink,
} from "lucide-react";

export function HeadingRenderer({
  content,
}: BlockRendererProps<{ text: string; level: number; alignment: string }>) {
  const level = content.level || 2;
  const alignment = content.alignment || "left";
  const alignClass =
    alignment === "center" ? "text-center" : alignment === "right" ? "text-right" : "text-left";
  const Tag = (
    level === 1
      ? "h1"
      : level === 3
        ? "h3"
        : level === 4
          ? "h4"
          : level === 5
            ? "h5"
            : level === 6
              ? "h6"
              : "h2"
  ) as React.ElementType;

  const sizeClasses: Record<number, string> = {
    1: "text-3xl sm:text-4xl font-extrabold tracking-tight mb-4",
    2: "text-2xl sm:text-3xl font-bold tracking-tight mt-6 mb-3",
    3: "text-xl sm:text-2xl font-semibold mt-4 mb-2",
    4: "text-lg font-semibold mt-3 mb-2",
    5: "text-base font-semibold mt-2 mb-1",
    6: "text-sm font-semibold uppercase tracking-wider text-muted-foreground mt-2 mb-1",
  };

  return (
    <Tag
      className={`font-display text-foreground ${sizeClasses[level] || sizeClasses[2]} ${alignClass}`}
    >
      {content.text}
    </Tag>
  );
}

export function ParagraphRenderer({
  content,
}: BlockRendererProps<{ text: string; alignment: string }>) {
  const alignment = content.alignment || "left";
  const alignClass =
    alignment === "center"
      ? "text-center"
      : alignment === "right"
        ? "text-right"
        : alignment === "justify"
          ? "text-justify"
          : "text-left";

  return (
    <p className={`text-base leading-relaxed text-foreground/90 my-2 ${alignClass}`}>
      {content.text}
    </p>
  );
}

export function ImageRenderer({
  content,
}: BlockRendererProps<{
  url: string;
  caption?: string;
  alt: string;
  size: string;
  alignment: string;
}>) {
  const size = content.size || "medium";
  const sizeClass = size === "small" ? "max-w-md" : size === "full" ? "w-full" : "max-w-2xl";

  return (
    <figure className={`my-6 flex flex-col items-center`}>
      <img
        src={content.url}
        alt={content.alt || "Imagen del curso"}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={`rounded-xl border border-border object-cover shadow-sm ${sizeClass}`}
      />
      {content.caption && (
        <figcaption className="mt-2 text-center text-xs text-muted-foreground">
          {content.caption}
        </figcaption>
      )}
    </figure>
  );
}

export function VideoRenderer({
  content,
}: BlockRendererProps<{ provider: string; url: string; controls: boolean; autoplay: boolean }>) {
  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border bg-black aspect-video flex items-center justify-center">
      {content.provider === "youtube" || content.provider === "vimeo" ? (
        <iframe
          src={content.url}
          title="Vídeo de la lección"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="w-full h-full border-0"
        />
      ) : (
        <video
          src={content.url}
          controls={content.controls !== false}
          autoPlay={Boolean(content.autoplay)}
          className="w-full h-full"
        />
      )}
    </div>
  );
}

export function CodeRenderer({
  content,
}: BlockRendererProps<{
  code: string;
  language: string;
  filename?: string;
  showLineNumbers: boolean;
}>) {
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-border bg-slate-950 font-mono text-sm text-slate-100 shadow-sm">
      {content.filename && (
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-2 text-xs text-slate-400">
          <span>{content.filename}</span>
          <span className="uppercase">{content.language || "code"}</span>
        </div>
      )}
      <pre className="overflow-x-auto p-4 leading-relaxed">
        <code>{content.code}</code>
      </pre>
    </div>
  );
}

export function QuoteRenderer({
  content,
}: BlockRendererProps<{ text: string; author?: string; citation?: string }>) {
  return (
    <blockquote className="my-6 border-l-4 border-primary bg-primary/5 p-4 pl-6 rounded-r-xl italic text-foreground/90 space-y-2">
      <div className="flex items-start gap-2">
        <QuoteIcon className="size-5 text-primary shrink-0 mt-0.5 opacity-60" />
        <p className="text-base sm:text-lg">{content.text}</p>
      </div>
      {(content.author || content.citation) && (
        <footer className="text-xs not-italic font-medium text-muted-foreground text-right">
          — {content.author} {content.citation ? `, ${content.citation}` : ""}
        </footer>
      )}
    </blockquote>
  );
}

export function CalloutRenderer({
  content,
}: BlockRendererProps<{ variant: string; title?: string; text: string }>) {
  const variant = content.variant || "info";

  const styles: Record<
    string,
    { bg: string; border: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    info: {
      bg: "bg-blue-500/10 text-blue-900 dark:text-blue-100",
      border: "border-blue-500/30",
      icon: Info,
    },
    warning: {
      bg: "bg-amber-500/10 text-amber-900 dark:text-amber-100",
      border: "border-amber-500/30",
      icon: AlertTriangle,
    },
    success: {
      bg: "bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
      border: "border-emerald-500/30",
      icon: CheckCircle2,
    },
    danger: {
      bg: "bg-rose-500/10 text-rose-900 dark:text-rose-100",
      border: "border-rose-500/30",
      icon: XCircle,
    },
  };

  const current = styles[variant] || styles["info"]!;
  const IconComponent = current.icon;

  return (
    <div className={`my-4 flex gap-3 p-4 rounded-xl border ${current.bg} ${current.border}`}>
      <IconComponent className="size-5 shrink-0 mt-0.5" />
      <div className="space-y-1">
        {content.title && <h5 className="font-semibold text-sm">{content.title}</h5>}
        <p className="text-sm leading-relaxed">{content.text}</p>
      </div>
    </div>
  );
}

export function DividerRenderer({ content }: BlockRendererProps<{ style: string }>) {
  const style = content.style || "solid";
  const borderStyle =
    style === "dashed" ? "border-dashed" : style === "dotted" ? "border-dotted" : "border-solid";
  return <hr className={`my-8 border-t border-border ${borderStyle}`} />;
}
