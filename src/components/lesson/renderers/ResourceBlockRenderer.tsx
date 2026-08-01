import { Button } from "@/components/ui/button";
import { Download, ExternalLink, FileText } from "lucide-react";
import type { LessonBlockItem } from "@/lib/blocks";
import { sanitizeUrl, isAllowedIframeUrl } from "@/lib/url-security";
import { str } from "./renderer-utils";

export function ResourceBlockRenderer({ block }: { block: LessonBlockItem }) {
  const c = (block.content_json || {}) as Record<string, unknown>;
  const type = block.type;

  switch (type) {
    case "download_button":
    case "button": {
      const downloadUrl = sanitizeUrl(c["url"]);
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
          {downloadUrl && (
            <Button size="sm" asChild className="gap-2">
              <a href={downloadUrl} download target="_blank" rel="noopener noreferrer">
                <Download className="size-4" />
                <span>Descargar</span>
              </a>
            </Button>
          )}
        </div>
      );
    }

    case "external_link": {
      const linkUrl = sanitizeUrl(c["url"]);
      if (!linkUrl) return null;
      return (
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
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
    }

    case "pdf_embed":
    case "pdf": {
      const pdfUrl = sanitizeUrl(c["url"]);
      const isIframeAllowed = isAllowedIframeUrl(pdfUrl);

      return (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs space-y-0">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <span className="text-sm font-medium">{str(c["title"], "Documento PDF")}</span>
            </div>
            {pdfUrl && (
              <Button size="sm" variant="outline" asChild className="h-8 gap-1.5 text-xs">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="size-3.5" />
                  <span>Abrir PDF</span>
                </a>
              </Button>
            )}
          </div>
          {pdfUrl && isIframeAllowed ? (
            <iframe
              src={pdfUrl}
              title={str(c["title"], "Visor PDF")}
              className="w-full h-[500px]"
            />
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">
              {pdfUrl
                ? "El documento PDF está listo. Haz clic en 'Abrir PDF' para visualizarlo."
                : "Sin URL de PDF configurada."}
            </div>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}
