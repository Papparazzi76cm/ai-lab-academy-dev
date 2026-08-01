import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BlockType } from "@/lib/blocks";
import { strVal } from "./editor-utils";

export function EducationBlockEditor({
  type,
  content,
  onChange,
}: {
  type: BlockType;
  content: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  switch (type) {
    case "summary":
    case "tip":
    case "warning":
    case "callout":
      return (
        <div className="space-y-2">
          <Input
            placeholder="Título del mensaje..."
            value={strVal(content, "title")}
            onChange={(e) => onChange({ ...content, title: e.target.value })}
          />
          <Textarea
            placeholder="Contenido explicativo..."
            rows={3}
            value={strVal(content, "text")}
            onChange={(e) => onChange({ ...content, text: e.target.value })}
          />
        </div>
      );

    case "exercise":
      return (
        <div className="space-y-3">
          <Input
            placeholder="Título del ejercicio..."
            value={strVal(content, "title")}
            onChange={(e) => onChange({ ...content, title: e.target.value })}
            className="font-medium"
          />
          <Textarea
            placeholder="Instrucciones generales del ejercicio..."
            rows={2}
            value={strVal(content, "instructions")}
            onChange={(e) => onChange({ ...content, instructions: e.target.value })}
          />
        </div>
      );

    case "challenge":
      return (
        <div className="space-y-3">
          <Input
            placeholder="Título del reto..."
            value={strVal(content, "title")}
            onChange={(e) => onChange({ ...content, title: e.target.value })}
            className="font-medium"
          />
          <Textarea
            placeholder="Objetivo del reto..."
            rows={2}
            value={strVal(content, "goal")}
            onChange={(e) => onChange({ ...content, goal: e.target.value })}
          />
          <Input
            placeholder="Pista u orientación (opcional)..."
            value={strVal(content, "hint")}
            onChange={(e) => onChange({ ...content, hint: e.target.value })}
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
            value={strVal(content, "question") || strVal(content, "prompt")}
            onChange={(e) =>
              onChange({ ...content, question: e.target.value, prompt: e.target.value })
            }
          />
          <Textarea
            placeholder="Respuesta sugerida o pista (se revelará en la lección)..."
            rows={2}
            value={strVal(content, "sampleAnswer") || strVal(content, "answer")}
            onChange={(e) =>
              onChange({
                ...content,
                sampleAnswer: e.target.value,
                answer: e.target.value,
              })
            }
          />
        </div>
      );

    default:
      return null;
  }
}
