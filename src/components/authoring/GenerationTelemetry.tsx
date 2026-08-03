import React from "react";
import { Clock, Coins, FileCode, ShieldCheck } from "lucide-react";
import type { GenerationResult } from "@/lib/ai/types";

interface GenerationTelemetryHeaderProps {
  telemetry: GenerationResult["telemetry"];
}

export function GenerationTelemetryHeader({ telemetry }: GenerationTelemetryHeaderProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl border border-border bg-muted/20 text-xs">
      <div className="flex items-center gap-2">
        <Clock className="size-4 text-primary" />
        <div>
          <div className="text-muted-foreground font-medium">Tiempo</div>
          <div className="font-semibold font-mono">{(telemetry.durationMs / 1000).toFixed(2)}s</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Coins className="size-4 text-amber-500" />
        <div>
          <div className="text-muted-foreground font-medium">Coste Est.</div>
          <div className="font-semibold font-mono">${telemetry.estimatedCost.toFixed(5)}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <FileCode className="size-4 text-blue-500" />
        <div>
          <div className="text-muted-foreground font-medium">Tokens</div>
          <div className="font-semibold font-mono">
            {telemetry.tokensInput + telemetry.tokensOutput}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4 text-emerald-500" />
        <div>
          <div className="text-muted-foreground font-medium">Auto-Repairs</div>
          <div className="font-semibold font-mono">{telemetry.repairCount} correcciones</div>
        </div>
      </div>
    </div>
  );
}

interface GenerationTelemetryTabProps {
  result: GenerationResult;
}

export function GenerationTelemetryTab({ result }: GenerationTelemetryTabProps) {
  return (
    <div className="rounded-xl border border-border p-4 space-y-4 bg-card text-xs">
      <div className="space-y-2">
        <h4 className="font-semibold text-foreground">Información de Ejecución:</h4>
        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
          <div>
            Proveedor:{" "}
            <span className="font-mono text-foreground">{result.telemetry.provider}</span>
          </div>
          <div>
            Modelo: <span className="font-mono text-foreground">{result.telemetry.model}</span>
          </div>
          <div>
            Tokens Entrada:{" "}
            <span className="font-mono text-foreground">{result.telemetry.tokensInput}</span>
          </div>
          <div>
            Tokens Salida:{" "}
            <span className="font-mono text-foreground">{result.telemetry.tokensOutput}</span>
          </div>
        </div>
      </div>

      {result.repairLog && result.repairLog.length > 0 ? (
        <div className="space-y-2">
          <h4 className="font-semibold text-foreground">
            Registro de Auto-Reparación ({result.repairLog.length}):
          </h4>
          <div className="p-3 rounded-lg bg-black/90 text-emerald-400 font-mono text-[11px] space-y-1 max-h-40 overflow-y-auto">
            {result.repairLog.map((logItem, idx) => (
              <div key={idx}>{logItem}</div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-muted-foreground">
          No se requirieron correcciones. Todos los bloques pasaron la validación en el primer
          intento.
        </div>
      )}
    </div>
  );
}
