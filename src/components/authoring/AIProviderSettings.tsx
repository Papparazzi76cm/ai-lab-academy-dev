import React from "react";
import { Wand2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AIProviderType } from "@/lib/ai/types";

interface AIProviderSettingsProps {
  provider: AIProviderType;
  model: string;
  temperature: number;
  onProviderChange: (val: AIProviderType) => void;
  onModelChange: (val: string) => void;
  onTemperatureChange: (val: number) => void;
}

export function AIProviderSettings({
  provider,
  model,
  temperature,
  onProviderChange,
  onModelChange,
  onTemperatureChange,
}: AIProviderSettingsProps) {
  return (
    <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Wand2 className="size-4 text-primary" />
        <span>Configuración del Modelo IA</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label htmlFor="provider" className="text-xs">
            Proveedor
          </Label>
          <Select value={provider} onValueChange={(v) => onProviderChange(v as AIProviderType)}>
            <SelectTrigger id="provider" className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini">Google Gemini</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="anthropic">Anthropic Claude</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="model" className="text-xs">
            Modelo
          </Label>
          <Input
            id="model"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            className="h-9 text-xs font-mono"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="temp" className="text-xs">
            Temperatura ({temperature})
          </Label>
          <Input
            id="temp"
            type="number"
            step={0.1}
            min={0}
            max={1}
            value={temperature}
            onChange={(e) => onTemperatureChange(Number(e.target.value))}
            className="h-9 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
