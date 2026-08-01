import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { BlockType } from "@/lib/blocks";

export function BlockSettings({
  open,
  onOpenChange,
  type,
  settings,
  onSaveSettings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: BlockType;
  settings: Record<string, unknown>;
  onSaveSettings: (settings: Record<string, unknown>) => void;
}) {
  const align = (settings["align"] as string) || "left";
  const showLineNumbers = settings["showLineNumbers"] !== false;
  const columns = String(settings["columns"] || 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md space-y-4">
        <DialogHeader>
          <DialogTitle>Ajustes del bloque ({type})</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {["h1", "h2", "h3", "paragraph", "text"].includes(type) && (
            <div className="space-y-2">
              <Label>Alineación del texto</Label>
              <Select
                value={align}
                onValueChange={(val) => onSaveSettings({ ...settings, align: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Izquierda</SelectItem>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="right">Derecha</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {type === "code" && (
            <div className="flex items-center justify-between">
              <Label htmlFor="line-numbers">Mostrar números de línea</Label>
              <Switch
                id="line-numbers"
                checked={showLineNumbers}
                onCheckedChange={(checked) =>
                  onSaveSettings({ ...settings, showLineNumbers: checked })
                }
              />
            </div>
          )}

          {type === "gallery" && (
            <div className="space-y-2">
              <Label>Columnas de la galería</Label>
              <Select
                value={columns}
                onValueChange={(val) => onSaveSettings({ ...settings, columns: parseInt(val, 10) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Columna</SelectItem>
                  <SelectItem value="2">2 Columnas</SelectItem>
                  <SelectItem value="3">3 Columnas</SelectItem>
                  <SelectItem value="4">4 Columnas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="collapsed-default">Iniciar colapsado en el editor</Label>
            <Switch
              id="collapsed-default"
              checked={Boolean(settings["collapsed"])}
              onCheckedChange={(checked) => onSaveSettings({ ...settings, collapsed: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Guardar ajustes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
