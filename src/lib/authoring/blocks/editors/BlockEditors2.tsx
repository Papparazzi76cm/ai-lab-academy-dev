import React from "react";
import type { BlockEditorProps } from "../../types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

export function ButtonBlockEditor({
  content,
  onChangeContent,
}: BlockEditorProps<{ label: string; url: string; variant: string; openInNewTab: boolean }>) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Texto del Botón
          </label>
          <Input
            value={content.label || ""}
            onChange={(e) => onChangeContent({ label: e.target.value })}
            placeholder="ej. Descargar Recursos"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            URL de Destino
          </label>
          <Input
            value={content.url || ""}
            onChange={(e) => onChangeContent({ url: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Variante</label>
          <Select
            value={content.variant || "default"}
            onValueChange={(val) => onChangeContent({ variant: val })}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Primario</SelectItem>
              <SelectItem value="secondary">Secundario</SelectItem>
              <SelectItem value="outline">Borde</SelectItem>
              <SelectItem value="ghost">Transparente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Switch
            checked={content.openInNewTab ?? true}
            onCheckedChange={(checked) => onChangeContent({ openInNewTab: checked })}
          />
          <label className="text-xs font-medium text-muted-foreground">
            Abrir en nueva pestaña
          </label>
        </div>
      </div>
    </div>
  );
}

export function ChecklistEditor({
  content,
  onChangeContent,
}: BlockEditorProps<{ items: Array<{ id: string; text: string; checked: boolean }> }>) {
  const items = content.items || [];
  const addItem = () => {
    const newItem = { id: `chk_${Date.now()}`, text: "Nuevo ítem", checked: false };
    onChangeContent({ items: [...items, newItem] });
  };
  const updateItem = (index: number, text: string) => {
    const next = [...items];
    const current = next[index];
    if (current) {
      next[index] = {
        id: current.id || `chk_${index}`,
        text,
        checked: !!current.checked,
      };
      onChangeContent({ items: next });
    }
  };
  const removeItem = (index: number) => {
    onChangeContent({ items: items.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={item.id || idx} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={item.checked}
              disabled
              className="rounded border-border"
            />
            <Input
              value={item.text}
              onChange={(e) => updateItem(idx, e.target.value)}
              className="flex-1"
            />
            <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addItem}>
        <Plus className="size-4 mr-1" /> Añadir ítem
      </Button>
    </div>
  );
}

export function AccordionEditor({
  content,
  onChangeContent,
}: BlockEditorProps<{ items: Array<{ id: string; title: string; content: string }> }>) {
  const items = content.items || [];
  const addItem = () => {
    const newItem = {
      id: `acc_${Date.now()}`,
      title: "Nuevo encabezado",
      content: "Contenido del acordeón...",
    };
    onChangeContent({ items: [...items, newItem] });
  };
  const updateItem = (index: number, key: "title" | "content", val: string) => {
    const next = [...items];
    const current = next[index];
    if (current) {
      next[index] = {
        id: current.id || `acc_${index}`,
        title: key === "title" ? val : current.title || "",
        content: key === "content" ? val : current.content || "",
      };
      onChangeContent({ items: next });
    }
  };
  const removeItem = (index: number) => {
    onChangeContent({ items: items.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={item.id || idx} className="p-3 border border-border rounded-lg space-y-2">
          <div className="flex gap-2">
            <Input
              value={item.title}
              onChange={(e) => updateItem(idx, "title", e.target.value)}
              placeholder="Título de la sección"
              className="font-medium"
            />
            <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
          <Textarea
            value={item.content}
            onChange={(e) => updateItem(idx, "content", e.target.value)}
            placeholder="Contenido descriptivo..."
            rows={2}
          />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem}>
        <Plus className="size-4 mr-1" /> Añadir elemento al acordeón
      </Button>
    </div>
  );
}

export function TabsEditor({
  content,
  onChangeContent,
}: BlockEditorProps<{ items: Array<{ id: string; label: string; content: string }> }>) {
  const items = content.items || [];
  const addItem = () => {
    const newItem = {
      id: `tab_${Date.now()}`,
      label: "Pestaña",
      content: "Contenido de la pestaña...",
    };
    onChangeContent({ items: [...items, newItem] });
  };
  const updateItem = (index: number, key: "label" | "content", val: string) => {
    const next = [...items];
    const current = next[index];
    if (current) {
      next[index] = {
        id: current.id || `tab_${index}`,
        label: key === "label" ? val : current.label || "",
        content: key === "content" ? val : current.content || "",
      };
      onChangeContent({ items: next });
    }
  };
  const removeItem = (index: number) => {
    onChangeContent({ items: items.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={item.id || idx} className="p-3 border border-border rounded-lg space-y-2">
          <div className="flex gap-2">
            <Input
              value={item.label}
              onChange={(e) => updateItem(idx, "label", e.target.value)}
              placeholder="Etiqueta de pestaña"
              className="font-medium"
            />
            <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
          <Textarea
            value={item.content}
            onChange={(e) => updateItem(idx, "content", e.target.value)}
            placeholder="Contenido de pestaña..."
            rows={2}
          />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem}>
        <Plus className="size-4 mr-1" /> Añadir pestaña
      </Button>
    </div>
  );
}

export function GalleryEditor({
  content,
  onChangeContent,
}: BlockEditorProps<{
  images: Array<{ url: string; caption?: string; alt: string }>;
  layout: string;
}>) {
  const images = content.images || [];
  const addImage = () => {
    const newImg = { url: "", caption: "", alt: "Imagen de galería" };
    onChangeContent({ images: [...images, newImg] });
  };
  const updateImage = (index: number, key: "url" | "caption" | "alt", val: string) => {
    const next = [...images];
    const current = next[index];
    if (current) {
      next[index] = {
        url: key === "url" ? val : current.url || "",
        caption: key === "caption" ? val : (current.caption ?? ""),
        alt: key === "alt" ? val : current.alt || "",
      };
      onChangeContent({ images: next });
    }
  };
  const removeImage = (index: number) => {
    onChangeContent({ images: images.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">Diseño de Galería:</label>
        <Select
          value={content.layout || "grid"}
          onValueChange={(val) => onChangeContent({ layout: val })}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Cuadrícula</SelectItem>
            <SelectItem value="carousel">Carrusel</SelectItem>
            <SelectItem value="masonry">Mosaico</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {images.map((img, idx) => (
          <div key={idx} className="p-3 border border-border rounded-lg space-y-2">
            <div className="flex gap-2">
              <Input
                value={img.url}
                onChange={(e) => updateImage(idx, "url", e.target.value)}
                placeholder="https://..."
              />
              <Button variant="ghost" size="icon" onClick={() => removeImage(idx)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={img.caption || ""}
                onChange={(e) => updateImage(idx, "caption", e.target.value)}
                placeholder="Pie de foto (opcional)"
              />
              <Input
                value={img.alt}
                onChange={(e) => updateImage(idx, "alt", e.target.value)}
                placeholder="Texto alternativo (alt)"
              />
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addImage}>
        <Plus className="size-4 mr-1" /> Añadir imagen
      </Button>
    </div>
  );
}

export function FileDownloadEditor({
  content,
  onChangeContent,
}: BlockEditorProps<{
  filename: string;
  fileUrl: string;
  fileSize?: string;
  description?: string;
}>) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Nombre del Archivo
          </label>
          <Input
            value={content.filename || ""}
            onChange={(e) => onChangeContent({ filename: e.target.value })}
            placeholder="ej. Plantilla.pdf"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            URL del Archivo
          </label>
          <Input
            value={content.fileUrl || ""}
            onChange={(e) => onChangeContent({ fileUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Tamaño (opcional)
          </label>
          <Input
            value={content.fileSize || ""}
            onChange={(e) => onChangeContent({ fileSize: e.target.value })}
            placeholder="ej. 1.2 MB"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Descripción (opcional)
          </label>
          <Input
            value={content.description || ""}
            onChange={(e) => onChangeContent({ description: e.target.value })}
            placeholder="ej. Guía PDF interactiva"
          />
        </div>
      </div>
    </div>
  );
}

export function EmbedEditor({
  content,
  onChangeContent,
}: BlockEditorProps<{ embedUrl: string; title?: string }>) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          URL Embebida (iFrame)
        </label>
        <Input
          value={content.embedUrl || ""}
          onChange={(e) => onChangeContent({ embedUrl: e.target.value })}
          placeholder="https://www.youtube.com/embed/..."
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          Título Accesible
        </label>
        <Input
          value={content.title || ""}
          onChange={(e) => onChangeContent({ title: e.target.value })}
          placeholder="ej. Vídeo explicativo"
        />
      </div>
    </div>
  );
}

export function QuizBlockEditor({
  content,
  onChangeContent,
}: BlockEditorProps<{ quizId: string; showTitle: boolean }>) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          ID del Cuestionario
        </label>
        <Input
          value={content.quizId || ""}
          onChange={(e) => onChangeContent({ quizId: e.target.value })}
          placeholder="UUID o slug del cuestionario"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={content.showTitle ?? true}
          onCheckedChange={(checked) => onChangeContent({ showTitle: checked })}
        />
        <label className="text-xs font-medium text-muted-foreground">
          Mostrar título del cuestionario
        </label>
      </div>
    </div>
  );
}

export function CertificateBlockEditor({
  content,
  onChangeContent,
}: BlockEditorProps<{ title: string; description: string }>) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          Título del Certificado
        </label>
        <Input
          value={content.title || ""}
          onChange={(e) => onChangeContent({ title: e.target.value })}
          placeholder="Certificado de Finalización"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">Descripción</label>
        <Textarea
          value={content.description || ""}
          onChange={(e) => onChangeContent({ description: e.target.value })}
          placeholder="Acredita la superación exitosa..."
          rows={2}
        />
      </div>
    </div>
  );
}

export function SpacerEditor({ content, onChangeContent }: BlockEditorProps<{ height: number }>) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">
        Altura en Píxeles ({content.height || 32}px)
      </label>
      <Input
        type="number"
        min={8}
        max={200}
        step={8}
        value={content.height || 32}
        onChange={(e) => onChangeContent({ height: Number(e.target.value) })}
      />
    </div>
  );
}
