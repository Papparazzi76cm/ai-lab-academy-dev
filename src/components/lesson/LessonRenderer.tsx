import { Download, FileText, Video, AlertCircle } from "lucide-react";
import type { LessonBlockItem } from "@/lib/blocks";
import { BlockRenderer } from "./BlockRenderer";
import type { Tables } from "@/integrations/supabase/types";
import { getSafeVideoEmbedUrl, sanitizeUrl } from "@/lib/url-security";

export type LessonWithResources = Partial<Tables<"lessons">> &
  Pick<Tables<"lessons">, "id" | "title" | "slug"> & {
    video_url?: string | null;
    description?: string | null;
    resources?: Array<{
      id: string;
      title: string;
      url: string;
      resource_type?: string;
      is_public?: boolean;
    }> | null;
  };

interface LessonRendererProps {
  lesson: LessonWithResources;
  blocks: LessonBlockItem[];
}

/**
 * LessonRenderer: Read-only renderer for student lesson view.
 * Strictly decoupled from the BlockEditor and editor UI.
 */
export function LessonRenderer({ lesson, blocks }: LessonRendererProps) {
  const safeVideoUrl = lesson.video_url ? getSafeVideoEmbedUrl(lesson.video_url) : null;
  const hasRawVideoUrl = Boolean(lesson.video_url?.trim());

  // Filter valid sanitized resources
  const validResources = (lesson.resources || []).filter((resource) => {
    const sanitized = sanitizeUrl(resource.url, { allowRelative: false });
    return Boolean(sanitized);
  });

  return (
    <article className="space-y-8 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-10">
      {/* Lesson Title & Summary Header */}
      <header className="space-y-3 border-b border-border/60 pb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {lesson.title}
        </h1>
        {lesson.summary && (
          <p className="text-base leading-relaxed text-muted-foreground">{lesson.summary}</p>
        )}
      </header>

      {/* Primary Video Embed or Fallback if provided in lesson metadata */}
      {hasRawVideoUrl && (
        <section aria-label="Vídeo de la lección" className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Video className="size-4 text-primary" />
            <span>Vídeo principal</span>
          </div>

          {safeVideoUrl ? (
            <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-black shadow-inner">
              <iframe
                src={safeVideoUrl}
                title={`Vídeo: ${lesson.title}`}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="size-full border-0"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
              <AlertCircle className="size-5 shrink-0" />
              <div>
                <p className="font-medium">Vídeo no disponible</p>
                <p className="text-xs opacity-90">
                  La dirección URL configurada para el vídeo no cumple con el protocolo de seguridad
                  o dominio permitido.
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Main Content Rendered via Published Blocks */}
      {blocks.length > 0 ? (
        <section aria-label="Contenido de la lección" className="prose-container space-y-6">
          {blocks.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </section>
      ) : !hasRawVideoUrl ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <FileText className="mx-auto mb-2 size-8 text-muted-foreground/50" />
          Esta lección no contiene bloques de texto ni vídeo interactivo.
        </div>
      ) : null}

      {/* Supplementary Lesson Resources & Downloads */}
      {validResources.length > 0 && (
        <section
          aria-label="Recursos descargables"
          className="mt-10 rounded-xl border border-border/80 bg-muted/30 p-6"
        >
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <Download className="size-5 text-primary" />
            Recursos y archivos adjuntos
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {validResources.map((resource) => {
              const safeUrl = sanitizeUrl(resource.url, { allowRelative: false });
              return (
                <li key={resource.id}>
                  <a
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Descargar recurso: ${resource.title}`}
                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Download className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{resource.title}</p>
                      <p className="text-xs text-muted-foreground">Enlace externo / archivo</p>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </article>
  );
}
