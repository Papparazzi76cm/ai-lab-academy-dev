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
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={content.label || ""}
          onChange={(e) => onChangeContent({ label: e.target.value })}
          placeholder="Texto del botón"
        />
        <Input
          value={content.url || ""}
          onChange={(e) => onChangeContent({ url: e.target.value })}
          placeholder="URL del enlace (https://...)"
        />
      </div>
      <div className="flex items-center justify-between">
        <Select
          value={content.variant || "primary"}
          onValueChange={(val) => onChangeContent({ variant: val })}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">Principal</SelectItem>
            <SelectItem value="secondary">Secundario</SelectItem>
            <SelectItem value="outline">Borde</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <Switch
            checked={content.openInNewTab !== false}
            onCheckedChange={(val) => onChangeContent({ openInNewTab: val })}
          />
          Abrir en nueva pestaña
        </label>
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
    next[index] = { ...next[index], text };
    onChangeContent({ items: next });
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
    next[index] = { ...next[index], [key]: val };
    onChangeContent({ items: next });
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
    next[index] = { ...next[index], [key]: val };
    onChangeContent({ items: next });
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
              placeholder="Etiqueta de la pestaña"
              className="w-48 font-medium"
            />
            <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
          <Textarea
            value={item.content}
            onChange={(e) => updateItem(idx, "content", e.target.value)}
            placeholder="Contenido..."
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
    next[index] = { ...next[index], [key]: val };
    onChangeContent({ images: next });
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
          <div
            key={idx}
            className="p-3 border border-border rounded-lg grid grid-cols-3 gap-2 items-center"
          >
            <Input
              value={img.url}
              onChange={(e) => updateImage(idx, "url", e.target.value)}
              placeholder="URL Imagen"
            />
            <Input
              value={img.alt}
              onChange={(e) => updateImage(idx, "alt", e.target.value)}
              placeholder="Texto ALT (Obligatorio)"
            />
            <div className="flex gap-2">
              <Input
                value={img.caption || ""}
                onChange={(e) => updateImage(idx, "caption", e.target.value)}
                placeholder="Leyenda"
              />
              <Button variant="ghost" size="icon" onClick={() => removeImage(idx)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addImage}>
        <Plus className="size-4 mr-1" /> Añadir imagen a la galería
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
  fileType?: string;
  description?: string;
}>) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={content.filename || ""}
          onChange={(e) => onChangeContent({ filename: e.target.value })}
          placeholder="Nombre del archivo (ej. manual.pdf)"
        />
        <Input
          value={content.fileUrl || ""}
          onChange={(e) => onChangeContent({ fileUrl: e.target.value })}
          placeholder="URL de descarga"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={content.fileSize || ""}
          onChange={(e) => onChangeContent({ fileSize: e.target.value })}
          placeholder="Tamaño (ej. 3.5 MB)"
        />
        <Input
          value={content.description || ""}
          onChange={(e) => onChangeContent({ description: e.target.value })}
          placeholder="Descripción breve"
        />
      </div>
    </div>
  );
}

export function EmbedEditor({
  content,
  onChangeContent,
}: BlockEditorProps<{
  provider: "youtube" | "vimeo" | "figma" | "canva" | "loom";
  embedUrl: string;
  aspectRatio?: string;
  title?: string;
}>) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={content.provider || "youtube"}
          onValueChange={(val: "youtube" | "vimeo" | "figma" | "canva" | "loom") =>
            onChangeContent({ provider: val })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="vimeo">Vimeo</SelectItem>
            <SelectItem value="figma">Figma</SelectItem>
            <SelectItem value="canva">Canva</SelectItem>
            <SelectItem value="loom">Loom</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={content.embedUrl || ""}
          onChange={(e) => onChangeContent({ embedUrl: e.target.value })}
          placeholder="URL iframe / embed"
        />
      </div>
      <Input
        value={content.title || ""}
        onChange={(e) => onChangeContent({ title: e.target.value })}
        placeholder="Título del iframe / embed (Accesibilidad)"
      />
    </div>
  );
}

export function QuizBlockEditor({
  content,
  onChangeContent,
}: BlockEditorProps<{ quizId: string; showTitle: boolean; showPassingScore: boolean }>) {
  return (
    <div className="space-y-3">
      <Input
        value={content.quizId || ""}
        onChange={(e) => onChangeContent({ quizId: e.target.value })}
        placeholder="ID del Cuestionario / Quiz"
      />
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <Switch
            checked={content.showTitle !== false}
            onCheckedChange={(val) => onChangeContent({ showTitle: val })}
          />
          Mostrar título del Quiz
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <Switch
            checked={content.showPassingScore !== false}
            onCheckedChange={(val) => onChangeContent({ showPassingScore: val })}
          />
          Mostrar nota de aprobación
        </label>
      </div>
    </div>
  );
}

export function CertificateBlockEditor({
  content,
  onChangeContent,
}: BlockEditorProps<{ templateId?: string; title: string; description: string }>) {
  return (
    <div className="space-y-3">
      <Input
        value={content.title || ""}
        onChange={(e) => onChangeContent({ title: e.target.value })}
        placeholder="Título del certificado"
      />
      <Textarea
        value={content.description || ""}
        onChange={(e) => onChangeContent({ description: e.target.value })}
        placeholder="Descripción explicativa..."
        rows={2}
      />
    </div>
  );
}

export function SpacerEditor({ content, onChangeContent }: BlockEditorProps<{ height: number }>) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-xs text-muted-foreground">Altura del espaciador (px):</span>
      <Input
        type="number"
        value={content.height || 32}
        onChange={(e) => onChangeContent({ height: Number(e.target.value) })}
        className="w-28"
        min={8}
        max={200}
      />
    </div>
  );
}
