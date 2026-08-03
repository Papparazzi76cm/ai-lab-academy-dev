import React from "react";
import type { AuthoringBlock, AuthoringBlockSettings, Visibility } from "../types";
import { BlockRegistry } from "../blocks/registry";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Sliders, AlertCircle, Trash2, Copy, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PropertiesPanelProps {
  selectedBlock: AuthoringBlock | null;
  onChangeSettings: (blockId: string, newSettings: Partial<AuthoringBlockSettings>) => void;
  onDuplicate: (blockId: string) => void;
  onDelete: (blockId: string) => void;
  onMoveUp: (blockId: string) => void;
  onMoveDown: (blockId: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

export function PropertiesPanel({
  selectedBlock,
  onChangeSettings,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: PropertiesPanelProps) {
  if (!selectedBlock) {
    return (
      <div className="p-6 text-center text-muted-foreground space-y-2">
        <Sliders className="size-8 mx-auto opacity-40 mb-2" />
        <p className="text-sm font-medium">Sin bloque seleccionado</p>
        <p className="text-xs">
          Selecciona un bloque en el lienzo para ajustar sus propiedades visuales y reglas de
          visibilidad.
        </p>
      </div>
    );
  }

  const def = BlockRegistry.get(selectedBlock.type);
  const settings = selectedBlock.settings_json || {};

  // Validate block to display errors in inspector
  const validationResult = def?.validator.safeParse(selectedBlock.content_json);
  const errors = !validationResult?.success ? validationResult?.error.issues : [];

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <h4 className="font-display font-semibold text-sm text-foreground">
            {def?.name || selectedBlock.type}
          </h4>
          <p className="text-xs text-muted-foreground">ID: {selectedBlock.id}</p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            disabled={isFirst}
            onClick={() => onMoveUp(selectedBlock.id)}
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={isLast}
            onClick={() => onMoveDown(selectedBlock.id)}
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDuplicate(selectedBlock.id)}>
            <Copy className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(selectedBlock.id)}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>

      {errors && errors.length > 0 && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-100 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertCircle className="size-4 text-rose-600" /> Errores de Configuración:
          </div>
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map((err, i) => (
              <li key={i}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4 text-xs">
        <div>
          <label className="font-medium text-muted-foreground block mb-1">
            Visibilidad del Bloque
          </label>
          <Select
            value={selectedBlock.visibility || "visible"}
            onValueChange={(val: string) =>
              onChangeSettings(selectedBlock.id, { visibility: val as Visibility })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="visible">Público / Visible</SelectItem>
              <SelectItem value="hidden">Oculto (Borrador)</SelectItem>
              <SelectItem value="instructor_only">Solo Instructores</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="font-medium text-muted-foreground block mb-1">
            Espaciado Vertical (Padding)
          </label>
          <Select
            value={settings.paddingY || "medium"}
            onValueChange={(val: string) =>
              onChangeSettings(selectedBlock.id, {
                paddingY: val as "none" | "small" | "medium" | "large",
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin margen</SelectItem>
              <SelectItem value="small">Pequeño (8px)</SelectItem>
              <SelectItem value="medium">Mediano (16px)</SelectItem>
              <SelectItem value="large">Grande (32px)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="font-medium text-muted-foreground block mb-1">
            Clases CSS Personalizadas
          </label>
          <Input
            value={settings.className || ""}
            onChange={(e) => onChangeSettings(selectedBlock.id, { className: e.target.value })}
            placeholder="ej. shadow-lg border-primary"
          />
        </div>
      </div>
    </div>
  );
}
