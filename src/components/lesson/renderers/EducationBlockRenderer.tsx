import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Target,
  BookOpen,
  Lightbulb,
  AlertTriangle,
  Dumbbell,
  Trophy,
  HelpCircle,
} from "lucide-react";
import type { LessonBlockItem } from "@/lib/blocks";
import { str } from "./renderer-utils";

export function EducationBlockRenderer({ block }: { block: LessonBlockItem }) {
  const c = (block.content_json || {}) as Record<string, unknown>;
  const type = block.type;

  switch (type) {
    case "objectives": {
      const items = Array.isArray(c["items"]) ? (c["items"] as string[]) : [];
      return (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-primary font-display font-semibold text-base">
            <Target className="size-5" />
            <span>Objetivos de la lección</span>
          </div>
          <ul className="space-y-1.5 pl-5 text-sm text-foreground/90 list-disc">
            {items.map((item, i) => (
              <li key={i}>{item}</li>
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
                  Ver pista u orientación
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
                  Ver respuesta orientativa
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
