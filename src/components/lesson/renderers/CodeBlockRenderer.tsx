import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, Code } from "lucide-react";
import type { LessonBlockItem } from "@/lib/blocks";
import { str } from "./renderer-utils";

export function CodeBlockRenderer({ block }: { block: LessonBlockItem }) {
  const c = (block.content_json || {}) as Record<string, unknown>;
  const s = (block.settings_json || {}) as Record<string, unknown>;
  const [copied, setCopied] = useState(false);

  const code = str(c["code"]);
  const language = str(c["language"], "typescript");
  const title = str(c["title"]);
  const showLineNumbers = s["showLineNumbers"] !== false;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-slate-950 text-slate-100 dark:bg-slate-900 shadow-md">
      {/* Code Header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Code className="size-3.5 text-primary" />
          <span className="font-mono font-medium text-slate-200">{title || language}</span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="h-7 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800 gap-1.5"
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

      {/* Code Body */}
      <div className="p-4 overflow-x-auto text-xs font-mono leading-relaxed">
        {showLineNumbers ? (
          <table className="w-full border-collapse">
            <tbody>
              {code.split("\n").map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="pr-4 text-right text-slate-600 select-none w-8 font-mono">
                    {idx + 1}
                  </td>
                  <td className="whitespace-pre font-mono text-slate-200">{line}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <pre className="whitespace-pre font-mono text-slate-200">{code}</pre>
        )}
      </div>
    </div>
  );
}
