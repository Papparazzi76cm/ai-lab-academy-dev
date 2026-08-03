import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  AlertCircle,
  Check,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeUrl } from "@/lib/url-security";

export interface MediaPickerSelectEvent {
  url: string;
  alt?: string;
  title?: string;
  filename?: string;
}

interface MediaPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (media: MediaPickerSelectEvent) => void;
  allowedTypes?: "image" | "video" | "audio" | "document" | "all";
  initialUrl?: string;
  initialAlt?: string;
  requireAlt?: boolean;
}

export function MediaPickerModal({
  open,
  onOpenChange,
  onSelect,
  allowedTypes = "image",
  initialUrl = "",
  initialAlt = "",
  requireAlt = false,
}: MediaPickerModalProps) {
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [url, setUrl] = useState<string>(initialUrl);
  const [altText, setAltText] = useState<string>(initialAlt);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<Array<{ name: string; url: string }>>([]);
  const [loadingRecent, setLoadingRecent] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setUrl(initialUrl);
      setAltText(initialAlt);
      setError(null);
      fetchRecentFiles();
    }
  }, [open, initialUrl, initialAlt]);

  const fetchRecentFiles = async () => {
    setLoadingRecent(true);
    try {
      const { data, error: listErr } = await supabase.storage.from("course-media").list("", {
        limit: 12,
        sortBy: { column: "created_at", order: "desc" },
      });

      if (!listErr && data) {
        const filesWithUrl = data
          .filter((item) => item.name && !item.name.startsWith("."))
          .map((item) => {
            const { data: publicUrlData } = supabase.storage
              .from("course-media")
              .getPublicUrl(item.name);
            return {
              name: item.name,
              url: publicUrlData.publicUrl,
            };
          });
        setRecentFiles(filesWithUrl);
      }
    } catch {
      // Storage bucket might be created on demand
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from("course-media")
        .upload(filePath, file);

      if (uploadErr) throw uploadErr;

      const { data: publicUrlData } = supabase.storage.from("course-media").getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;

      setUrl(publicUrl);
      if (!altText) {
        setAltText(file.name.replace(/\.[^/.]+$/, ""));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al subir archivo a Supabase Storage";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = () => {
    setError(null);

    const sanitized = sanitizeUrl(url, { allowRelative: false });
    if (!sanitized) {
      setError("La URL no es válida o utiliza un protocolo no seguro (javascript:, data:).");
      return;
    }

    if (requireAlt && !altText.trim()) {
      setError("El texto alternativo (ALT) es obligatorio para imágenes publicadas.");
      return;
    }

    onSelect({
      url: sanitized,
      alt: altText.trim(),
      filename: sanitized.split("/").pop(),
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="size-5 text-primary" />
            <span>Seleccionar Archivo Multimedia</span>
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="size-4" />
              <span>Subir Archivo</span>
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-2">
              <LinkIcon className="size-4" />
              <span>URL Externa</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 pt-4">
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center transition-colors hover:border-primary/50">
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="text-sm font-medium text-muted-foreground">Subiendo archivo...</p>
                </div>
              ) : url ? (
                <div className="space-y-3">
                  <div className="relative mx-auto max-h-40 max-w-xs overflow-hidden rounded-lg border border-border">
                    <img
                      src={url}
                      alt={altText || "Vista previa"}
                      className="size-full object-cover"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground truncate max-w-sm">{url}</p>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-2">
                  <Upload className="size-8 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    Haz clic para subir desde tu equipo
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Soporta JPG, PNG, WEBP, MP4, MP3, PDF
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept={
                      allowedTypes === "image"
                        ? "image/*"
                        : allowedTypes === "video"
                          ? "video/*"
                          : "*/*"
                    }
                  />
                </label>
              )}
            </div>

            {/* Recent files grid */}
            {recentFiles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Archivos subidos recientemente
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {recentFiles.slice(0, 4).map((file, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setUrl(file.url);
                        setAltText(file.name);
                      }}
                      className={`group relative aspect-square overflow-hidden rounded-md border text-left transition-all ${
                        url === file.url
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <img src={file.url} alt={file.name} className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="url" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="media-url">URL del recurso multimedia</Label>
              <Input
                id="media-url"
                type="url"
                placeholder="https://ejemplo.com/imagen.jpg o https://youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Debe ser una dirección HTTPS segura. No se permiten protocolos local/javascript.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Mandatory ALT field if required or image type */}
        <div className="space-y-2 border-t border-border pt-4">
          <Label htmlFor="media-alt" className="flex items-center gap-1.5">
            <span>Texto alternativo (ALT)</span>
            {requireAlt && <span className="text-xs text-destructive">*Obligatorio</span>}
          </Label>
          <Input
            id="media-alt"
            type="text"
            placeholder="Descripción accesible de la imagen para lectores de pantalla..."
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
          />
        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!url || uploading}
            className="gap-2"
          >
            <Check className="size-4" />
            <span>Seleccionar Recurso</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
