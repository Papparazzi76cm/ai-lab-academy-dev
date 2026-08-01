import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Block } from "@/lib/blocks";

function str(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  if (!blocks.length) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Esta lección todavía no tiene contenido. Añádelo desde el editor del panel de
        administración.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {blocks.map((block) => (
        <BlockView key={block.id} block={block} />
      ))}
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d: any = block.data ?? {};

  switch (block.type) {
    case "heading": {
      const level = typeof d.level === "number" ? d.level : 2;
      const Tag = (level === 3 ? "h3" : "h2") as "h2" | "h3";
      return <Tag className="font-display text-2xl font-semibold">{str(d.text)}</Tag>;
    }
    case "text":
      return <p className="text-base leading-relaxed text-foreground/90">{str(d.text)}</p>;
    case "quote":
      return (
        <blockquote className="border-l-2 border-primary pl-5 text-lg italic text-muted-foreground">
          {str(d.text)}
          {str(d.author) && <footer className="mt-2 text-sm not-italic">— {str(d.author)}</footer>}
        </blockquote>
      );
    case "callout":
      return (
        <Alert>
          <AlertDescription>{str(d.text)}</AlertDescription>
        </Alert>
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded-xl bg-secondary p-5 text-sm">
          <code>{str(d.code)}</code>
        </pre>
      );
    case "image":
      return str(d.url) ? (
        <figure>
          <img
            src={str(d.url)}
            alt={str(d.alt)}
            loading="lazy"
            className="w-full rounded-xl border border-border"
          />
          {str(d.alt) && (
            <figcaption className="mt-2 text-xs text-muted-foreground">{str(d.alt)}</figcaption>
          )}
        </figure>
      ) : null;
    case "gallery": {
      const urls = Array.isArray(d.urls) ? (d.urls as string[]) : [];
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {urls.map((url) => (
            <img
              key={url}
              src={url}
              alt=""
              loading="lazy"
              className="w-full rounded-xl border border-border"
            />
          ))}
        </div>
      );
    }
    case "video":
      return str(d.url) ? (
        <div className="aspect-video overflow-hidden rounded-xl border border-border bg-black">
          <iframe
            src={str(d.url)}
            title="Vídeo de la lección"
            allowFullScreen
            className="size-full"
          />
        </div>
      ) : null;
    case "audio":
      return str(d.url) ? <audio controls src={str(d.url)} className="w-full" /> : null;
    case "pdf":
      return (
        <Button variant="outline" asChild>
          <a href={str(d.url)} target="_blank" rel="noreferrer">
            {str(d.title, "Descargar PDF")}
          </a>
        </Button>
      );
    case "button":
      return (
        <div>
          <Button asChild>
            <a href={str(d.url, "#")} target="_blank" rel="noreferrer">
              {str(d.label, "Abrir")}
            </a>
          </Button>
        </div>
      );
    case "list": {
      const items = Array.isArray(d.items) ? (d.items as string[]) : [];
      const Tag = d.ordered ? "ol" : "ul";
      return (
        <Tag className={d.ordered ? "list-decimal space-y-2 pl-6" : "list-disc space-y-2 pl-6"}>
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </Tag>
      );
    }
    case "checklist": {
      const items = Array.isArray(d.items) ? (d.items as { text: string; done: boolean }[]) : [];
      return (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                defaultChecked={item.done}
                className="size-4 accent-[var(--primary)]"
              />
              {item.text}
            </li>
          ))}
        </ul>
      );
    }
    case "table": {
      const headers = Array.isArray(d.headers) ? (d.headers as string[]) : [];
      const rows = Array.isArray(d.rows) ? (d.rows as string[][]) : [];
      return (
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {row.map((cell, j) => (
                  <TableCell key={j}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }
    case "question":
      return (
        <Accordion type="single" collapsible className="rounded-xl border border-border px-4">
          <AccordionItem value="q" className="border-none">
            <AccordionTrigger>{str(d.prompt)}</AccordionTrigger>
            <AccordionContent>{str(d.answer, "Respuesta pendiente.")}</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    case "quiz":
      return (
        <Alert>
          <AlertDescription>
            Cuestionario incrustado. El sistema de quizzes está preparado y se activará al asignar
            preguntas desde el panel de administración.
          </AlertDescription>
        </Alert>
      );
    case "divider":
      return <hr className="border-border" />;
    default:
      return null;
  }
}
