import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AIProviderSettings } from "./AIProviderSettings";
import type { AIProviderType } from "@/lib/ai/types";

interface GenerationFormProps {
  prompt: string;
  setPrompt: (val: string) => void;
  level: string;
  setLevel: (val: string) => void;
  duration: number;
  setDuration: (val: number) => void;
  language: string;
  setLanguage: (val: string) => void;
  tone: string;
  setTone: (val: string) => void;
  audience: string;
  setAudience: (val: string) => void;
  objectivesText: string;
  setObjectivesText: (val: string) => void;
  provider: AIProviderType;
  model: string;
  setModel: (val: string) => void;
  temperature: number;
  setTemperature: (val: number) => void;
  onProviderChange: (val: AIProviderType) => void;
}

export function GenerationForm({
  prompt,
  setPrompt,
  level,
  setLevel,
  duration,
  setDuration,
  language,
  setLanguage,
  tone,
  setTone,
  audience,
  setAudience,
  objectivesText,
  setObjectivesText,
  provider,
  model,
  setModel,
  temperature,
  setTemperature,
  onProviderChange,
}: GenerationFormProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="prompt" className="text-sm font-semibold">
          Tema o Prompt Principal <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="prompt"
          placeholder="Ej: 'Cómo implementar React Server Components con Server Actions y revalidación de datos en TanStack Query...'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[100px] text-sm resize-y"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="level" className="text-xs font-medium">
            Nivel Dificultad
          </Label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger id="level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Principiante">Principiante</SelectItem>
              <SelectItem value="Intermedio">Intermedio</SelectItem>
              <SelectItem value="Avanzado">Avanzado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration" className="text-xs font-medium">
            Duración Estimada (min)
          </Label>
          <Input
            id="duration"
            type="number"
            min={5}
            max={120}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="language" className="text-xs font-medium">
            Idioma
          </Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger id="language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Español">Español</SelectItem>
              <SelectItem value="English">English</SelectItem>
              <SelectItem value="Português">Português</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tone" className="text-xs font-medium">
            Tono Pedagógico
          </Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger id="tone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Práctico y Profesional">Práctico y Profesional</SelectItem>
              <SelectItem value="Académico">Académico</SelectItem>
              <SelectItem value="Cercano y Entusiasta">Cercano y Entusiasta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="audience" className="text-xs font-medium">
            Público Objetivo
          </Label>
          <Input
            id="audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="Ej: Desarrolladores Frontend"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="objectives" className="text-xs font-medium">
          Objetivos Específicos (opcional, uno por línea)
        </Label>
        <Textarea
          id="objectives"
          placeholder="• Comprender el ciclo de vida&#10;• Escribir código limpio"
          value={objectivesText}
          onChange={(e) => setObjectivesText(e.target.value)}
          className="min-h-[70px] text-sm"
        />
      </div>

      <AIProviderSettings
        provider={provider}
        model={model}
        temperature={temperature}
        onProviderChange={onProviderChange}
        onModelChange={setModel}
        onTemperatureChange={setTemperature}
      />
    </div>
  );
}
