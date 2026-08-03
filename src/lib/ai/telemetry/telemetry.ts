import type { TelemetryData } from "../types";

export interface TelemetryLogEntry {
  jobId: string;
  event: "start" | "end" | "error" | "repair";
  timestamp: string;
  data?: unknown;
}

const telemetryLogBuffer: TelemetryLogEntry[] = [];

export function logGenerationStart(
  jobId: string,
  provider: string,
  model: string,
  prompt: string,
): void {
  const entry: TelemetryLogEntry = {
    jobId,
    event: "start",
    timestamp: new Date().toISOString(),
    data: { provider, model, promptLength: prompt.length },
  };
  telemetryLogBuffer.push(entry);
}

export function logGenerationEnd(jobId: string, telemetry: TelemetryData): void {
  const entry: TelemetryLogEntry = {
    jobId,
    event: "end",
    timestamp: new Date().toISOString(),
    data: telemetry,
  };
  telemetryLogBuffer.push(entry);
}

export function logGenerationError(jobId: string, error: unknown): void {
  const entry: TelemetryLogEntry = {
    jobId,
    event: "error",
    timestamp: new Date().toISOString(),
    data: { error: error instanceof Error ? error.message : String(error) },
  };
  telemetryLogBuffer.push(entry);
}

export function getTelemetryLogs(): TelemetryLogEntry[] {
  return [...telemetryLogBuffer];
}
