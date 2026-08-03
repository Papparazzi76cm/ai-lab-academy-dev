import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Upload, Image as ImageIcon, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MediaSelectorModalProps {
  open: boolean;
  onClose: () => void;
  onSelectMedia: (url: string, alt: string) => void;
}

export function MediaSelectorModal({ open, onClose, onSelectMedia }: MediaSelectorModalProps) {
  const [urlInput, setUrlInput] = useState("");
  const [altInput, setAltInput] = useState("Imagen cargada");
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      const { data, error } = await supabase.storage
        .from("course-media")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage.from("course-media").getPublicUrl(data.path);

      setUrlInput(publicUrlData.publicUrl);
    } catch (err) {
      console.error("Storage upload failed, fallback to data URL:", err);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUrlInput(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = () => {
    if (!urlInput.trim()) return;
    onSelectMedia(urlInput, altInput || "Imagen de lección");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-lg">
            <ImageIcon className="size-5 text-primary" /> Selector Multimedia (Storage)
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upload" className="mt-4">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="upload">Subir Archivo</TabsTrigger>
            <TabsTrigger value="url">URL Externa</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4 space-y-4">
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/40 transition-colors">
              <Upload className="size-8 text-muted-foreground mb-2" />
              <span className="text-sm font-medium">Haga clic para seleccionar una imagen</span>
              <span className="text-xs text-muted-foreground mt-1">
                PNG, JPG, WEBP, GIF hasta 10MB
              </span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
            {uploading && <p className="text-xs text-primary text-center">Subiendo imagen...</p>}
          </TabsContent>

          <TabsContent value="url" className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">URL Directa *</label>
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2 mt-4">
          <label className="text-xs font-medium text-muted-foreground">
            Texto Alternativo (ALT - Accesibilidad) *
          </label>
          <Input
            value={altInput}
            onChange={(e) => setAltInput(e.target.value)}
            placeholder="Descripción para lectores de pantalla"
          />
        </div>

        {urlInput && (
          <div className="mt-4 rounded-lg overflow-hidden border border-border h-32 flex items-center justify-center bg-black/5">
            <img src={urlInput} alt="Preview" className="h-full object-contain" />
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!urlInput.trim() || !altInput.trim()}>
            <Check className="size-4 mr-1" /> Confirmar Selección
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
