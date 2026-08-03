import React, { useState } from "react";
import type { BlockRendererProps } from "../../types";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, ExternalLink, Award, HelpCircle, CheckSquare, Square } from "lucide-react";

export function ButtonBlockRenderer({
  content,
}: BlockRendererProps<{ label: string; url: string; variant: string; openInNewTab: boolean }>) {
  return (
    <div className="my-4 flex justify-center">
      <Button
        variant={
          (content.variant as
            "default" | "destructive" | "outline" | "secondary" | "ghost" | "link") || "default"
        }
        asChild
        className="font-medium shadow-sm"
      >
        <a
          href={content.url || "#"}
          target={content.openInNewTab ? "_blank" : "_self"}
          rel={content.openInNewTab ? "noopener noreferrer" : undefined}
        >
          {content.label || "Acceder"}
          {content.openInNewTab && <ExternalLink className="size-4 ml-2" />}
        </a>
      </Button>
    </div>
  );
}

export function ChecklistRenderer({
  content,
}: BlockRendererProps<{ items: Array<{ id: string; text: string; checked: boolean }> }>) {
  const [items, setItems] = useState(content.items || []);

  const toggleItem = (idx: number) => {
    const next = [...items];
    const currentItem = next[idx];
    if (currentItem) {
      next[idx] = {
        id: currentItem.id || `chk_${idx}`,
        text: currentItem.text || "",
        checked: !currentItem.checked,
      };
      setItems(next);
    }
  };

  return (
    <div className="my-4 space-y-2 rounded-xl border border-border p-4 bg-card">
      {items.map((item, idx) => (
        <div
          key={item.id || idx}
          onClick={() => toggleItem(idx)}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
        >
          {item.checked ? (
            <CheckSquare className="size-5 text-emerald-600 shrink-0" />
          ) : (
            <Square className="size-5 text-muted-foreground shrink-0" />
          )}
          <span
            className={`text-sm ${item.checked ? "line-through text-muted-foreground" : "text-foreground"}`}
          >
            {item.text}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AccordionRenderer({
  content,
}: BlockRendererProps<{ items: Array<{ id: string; title: string; content: string }> }>) {
  const items = content.items || [];
  return (
    <div className="my-4 rounded-xl border border-border p-2 bg-card">
      <Accordion type="single" collapsible className="w-full">
        {items.map((item, idx) => (
          <AccordionItem key={item.id || idx} value={item.id || `item-${idx}`}>
            <AccordionTrigger className="text-sm font-semibold px-4">{item.title}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground px-4 leading-relaxed">
              {item.content}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

export function TabsRenderer({
  content,
}: BlockRendererProps<{ items: Array<{ id: string; label: string; content: string }> }>) {
  const items = content.items || [];
  if (items.length === 0) return null;

  return (
    <div className="my-4 rounded-xl border border-border p-4 bg-card">
      <Tabs defaultValue={items[0]?.id || "tab-0"}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/60 p-1">
          {items.map((item, idx) => (
            <TabsTrigger
              key={item.id || idx}
              value={item.id || `tab-${idx}`}
              className="text-xs font-medium"
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {items.map((item, idx) => (
          <TabsContent
            key={item.id || idx}
            value={item.id || `tab-${idx}`}
            className="mt-4 text-sm text-foreground/90 leading-relaxed"
          >
            {item.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export function GalleryRenderer({
  content,
}: BlockRendererProps<{
  images: Array<{ url: string; caption?: string; alt: string }>;
  layout: string;
}>) {
  const images = content.images || [];
  return (
    <div className="my-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {images.map((img, idx) => (
        <div
          key={idx}
          className="group relative overflow-hidden rounded-xl border border-border bg-muted"
        >
          <img
            src={img.url}
            alt={img.alt || "Galería"}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {img.caption && (
            <div className="p-2 text-xs text-center text-muted-foreground bg-card/90 backdrop-blur-xs">
              {img.caption}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function FileDownloadRenderer({
  content,
}: BlockRendererProps<{
  filename: string;
  fileUrl: string;
  fileSize?: string;
  description?: string;
}>) {
  return (
    <div className="my-4 flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-primary/10 text-primary">
          <Download className="size-5" />
        </div>
        <div>
          <h5 className="font-semibold text-sm text-foreground">{content.filename}</h5>
          <p className="text-xs text-muted-foreground">
            {content.description || content.fileSize || "Recuerpo descargable"}
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" asChild>
        <a href={content.fileUrl || "#"} download>
          Descargar
        </a>
      </Button>
    </div>
  );
}

export function EmbedRenderer({
  content,
}: BlockRendererProps<{ embedUrl: string; title?: string }>) {
  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border bg-muted aspect-video">
      <iframe
        src={content.embedUrl}
        title={content.title || "Contenido embebido"}
        className="w-full h-full border-0"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

export function QuizBlockRenderer({
  content,
}: BlockRendererProps<{ quizId: string; showTitle: boolean }>) {
  return (
    <div className="my-6 p-6 rounded-2xl border border-primary/20 bg-primary/5 text-center space-y-3">
      <HelpCircle className="size-8 text-primary mx-auto" />
      <h4 className="font-display text-lg font-bold">Evaluación de Conocimientos</h4>
      <p className="text-sm text-muted-foreground">
        Demuestra lo aprendido respondiendo las preguntas de esta unidad.
      </p>
      <Button className="mt-2" variant="default">
        Comenzar Cuestionario
      </Button>
    </div>
  );
}

export function CertificateBlockRenderer({
  content,
}: BlockRendererProps<{ title: string; description: string }>) {
  return (
    <div className="my-6 p-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-center space-y-3">
      <Award className="size-10 text-amber-600 mx-auto" />
      <h4 className="font-display text-lg font-bold text-amber-950 dark:text-amber-100">
        {content.title || "Acreditación Oficial"}
      </h4>
      <p className="text-sm text-amber-900/80 dark:text-amber-200">
        {content.description || "Al completar satisfactoriamente obtendrás tu certificado."}
      </p>
    </div>
  );
}

export function SpacerRenderer({ content }: BlockRendererProps<{ height: number }>) {
  const height = content.height || 32;
  return <div style={{ height: `${height}px` }} className="w-full" />;
}
