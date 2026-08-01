import type { LessonBlockItem } from "@/lib/blocks";
import { str } from "./renderer-utils";

export function TextBlockRenderer({ block }: { block: LessonBlockItem }) {
  const c = (block.content_json || {}) as Record<string, unknown>;
  const type = block.type;

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

    default:
      return null;
  }
}
