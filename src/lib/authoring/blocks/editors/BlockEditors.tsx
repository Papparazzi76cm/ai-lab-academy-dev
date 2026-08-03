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
import { Plus, Trash2, Link as LinkIcon } from "lucide-react";

export function HeadingEditor({
  content,
  onChangeContent,
}: BlockEditorProps<{ text: string; level: number; alignment: string }>) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select
          value={String(content.level || 2)}
          onValueChange={(val) => onChangeContent({ level: Number(val) })}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">H1 (Grande)</SelectItem>
            <SelectItem value="2">H2 (Medio)</SelectItem>
            <SelectItem value="3">H3 (Pequeño)</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={content.alignment || "left"}
          onValueChange={(val) => onChangeContent({ alignment: val })}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Izquierda</SelectItem>
            <SelectItem value="center">Centro</SelectItem>
            <SelectItem value="right">Derecha</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Input
        value={content.text || ""}
        onChange={(e) => onChangeContent({ text: e.target.value })}
        placeholder="Escribe el título aquí..."
        className="font-bold text-lg"
      />
    </div>
  );
}

export function ParagraphEditor({
  content,
  onChangeContent,
}: BlockEditorProps<{ text: string; alignment: string }>) {
  return (
    <div className="space-y-2">
      <Textarea
        value={content.text || ""}
        onChange={(e) => onChangeContent({ text: e.target.value })}
        placeholder="Escribe el contenido del párrafo..."
        rows={3}
      />
    </div>
  );
}

export function ImageEditor({
  content,
  onChangeContent,
}: BlockEditorProps<{ url: string; caption?: string; alt: string; size: string }>) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground">URL de la Imagen *</label>
        <Input
          value={content.url || ""}
          onChange={(e) => onChangeContent({ url: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">
          Texto Alternativo (ALT - Obligatorio) *
        </label>
        <Input
          value={content.alt || ""}
          onChange={(e) => onChangeContent({ alt: e.target.value })}
          placeholder="Descripción para lectores de pantalla..."
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Pie de Foto</label>
          <Input
            value={content.caption || ""}
            onChange={(e) => onChangeContent({ caption: e.target.value })}
            placeholder="Leyenda..."
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tamaño</label>
          <Select
            value={content.size || "medium"}
            onValueChange={(val) => onChangeContent({ size: val })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Pequeño</SelectItem>
              <SelectItem value="medium">Mediano</SelectItem>
              <SelectItem value="full">Ancho Completo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export function VideoEditor({
  content,
  onChangeContent,
}: BlockEditorProps<{ provider: string; url: string; autoplay: boolean; controls: boolean }>) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Proveedor</label>
          <Select
            value={content.provider || "youtube"}
            onValueChange={(val) => onChangeContent({ provider: val })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="vimeo">Vimeo</SelectItem>
              <SelectItem value="storage">Storage Supabase</SelectItem>
              <SelectItem value="hls">HLS Stream</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">URL del Vídeo</label>
          <Input
            value={content.url || ""}
            onChange={(e) => onChangeContent({ url: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <Switch
            checked={Boolean(content.autoplay)}
            onCheckedChange={(val) => onChangeContent({ autoplay: val })}
          />
          Reproducción automática
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <Switch
            checked={content.controls !== false}
            onCheckedChange={(val) => onChangeContent({ controls: val })}
          />
          Controles visibles
        </label>
      </div>
    </div>
  );
}

export function CodeEditor({
  content,
  onChangeContent,
}: BlockEditorProps<{
  code: string;
  language: string;
  filename?: string;
  showLineNumbers: boolean;
}>) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={content.filename || ""}
          onChange={(e) => onChangeContent({ filename: e.target.value })}
          placeholder="Nombre de archivo (ej. index.ts)"
          className="w-1/2"
        />
        <Select
          value={content.language || "typescript"}
          onValueChange={(val) => onChangeContent({ language: val })}
        >
          <SelectTrigger className="w-1/2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="typescript">TypeScript</SelectItem>
            <SelectItem value="javascript">JavaScript</SelectItem>
            <SelectItem value="python">Python</SelectItem>
            <SelectItem value="html">HTML</SelectItem>
            <SelectItem value="css">CSS</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="sql">SQL</SelectItem>
            <SelectItem value="bash">Bash</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Textarea
        value={content.code || ""}
        onChange={(e) => onChangeContent({ code: e.target.value })}
        placeholder="// Escribe aquí el código..."
        rows={5}
        className="font-mono text-sm"
      />
    </div>
  );
}

export function QuoteEditor({
  content,
  onChangeContent,
}: BlockEditorProps<{ text: string; author?: string; citation?: string }>) {
  return (
    <div className="space-y-3">
      <Textarea
        value={content.text || ""}
        onChange={(e) => onChangeContent({ text: e.target.value })}
        placeholder="Texto de la cita..."
        rows={2}
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={content.author || ""}
          onChange={(e) => onChangeContent({ author: e.target.value })}
          placeholder="Autor / Fuente"
        />
        <Input
          value={content.citation || ""}
          onChange={(e) => onChangeContent({ citation: e.target.value })}
          placeholder="Organización / Libro"
        />
      </div>
    </div>
  );
}

export function CalloutEditor({
  content,
  onChangeContent,
}: BlockEditorProps<{ variant: string; title?: string; text: string }>) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select
          value={content.variant || "info"}
          onValueChange={(val) => onChangeContent({ variant: val })}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="info">Información (Azul)</SelectItem>
            <SelectItem value="warning">Advertencia (Amarillo)</SelectItem>
            <SelectItem value="success">Éxito (Verde)</SelectItem>
            <SelectItem value="danger">Peligro (Rojo)</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={content.title || ""}
          onChange={(e) => onChangeContent({ title: e.target.value })}
          placeholder="Título del destacado (Opcional)"
          className="flex-1"
        />
      </div>
      <Textarea
        value={content.text || ""}
        onChange={(e) => onChangeContent({ text: e.target.value })}
        placeholder="Mensaje del destacado..."
        rows={2}
      />
    </div>
  );
}

export function DividerEditor({ content, onChangeContent }: BlockEditorProps<{ style: string }>) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-xs text-muted-foreground">Estilo de línea:</span>
      <Select
        value={content.style || "solid"}
        onValueChange={(val) => onChangeContent({ style: val })}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="solid">Sólida</SelectItem>
          <SelectItem value="dashed">Punteada (Dashed)</SelectItem>
          <SelectItem value="dotted">Puntos (Dotted)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
