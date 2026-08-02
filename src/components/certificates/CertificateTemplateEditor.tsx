import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CertificatePreview } from "./CertificatePreview";
import { CertificateTemplateSchema } from "@/lib/certificates/validation";
import type { CertificateTemplate } from "@/lib/certificates/types";
import { Loader2, Save } from "lucide-react";
import { z } from "zod";

type TemplateFormValues = z.infer<typeof CertificateTemplateSchema>;

interface CertificateTemplateEditorProps {
  initialTemplate?: Partial<CertificateTemplate>;
  onSave: (data: Partial<CertificateTemplate>) => void;
  isSaving?: boolean;
}

export function CertificateTemplateEditor({
  initialTemplate,
  onSave,
  isSaving = false,
}: CertificateTemplateEditorProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(CertificateTemplateSchema),
    defaultValues: {
      name: initialTemplate?.name || "Plantilla Oficial",
      is_default: initialTemplate?.is_default ?? false,
      status: initialTemplate?.status || "active",
      primary_color: initialTemplate?.primary_color || "#0f172a",
      secondary_color: initialTemplate?.secondary_color || "#2563eb",
      signature_name: initialTemplate?.signature_name || "",
      signature_title: initialTemplate?.signature_title || "",
      layout_json: {
        orientation: initialTemplate?.layout_json?.orientation || "landscape",
        showLogo: initialTemplate?.layout_json?.showLogo ?? true,
        showQr: initialTemplate?.layout_json?.showQr ?? true,
        showSignature: initialTemplate?.layout_json?.showSignature ?? true,
        issuerName: initialTemplate?.layout_json?.issuerName || "AI Lab Academy",
        titleText: initialTemplate?.layout_json?.titleText || "Certificado de Finalización",
        bodyText:
          initialTemplate?.layout_json?.bodyText ||
          "Por haber completado satisfactoriamente el programa formativo de",
        qrSize: initialTemplate?.layout_json?.qrSize || 60,
      },
    },
  });

  const watchAllFields = watch();

  const onSubmit = (values: TemplateFormValues) => {
    onSave({
      id: initialTemplate?.id,
      ...values,
    } as Partial<CertificateTemplate>);
  };

  return (
    <div id="template-editor-layout" className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h3 className="font-display text-base font-bold">Datos de la Plantilla</h3>

          <div className="space-y-1.5">
            <Label htmlFor="template-name">Nombre de la Plantilla</Label>
            <Input id="template-name" {...register("name")} placeholder="Ej. Plantilla Especial Python" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="primary-color">Color Primario</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={watchAllFields.primary_color}
                  onChange={(e) => setValue("primary_color", e.target.value)}
                  className="size-9 rounded-lg border cursor-pointer"
                />
                <Input id="primary-color" {...register("primary_color")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="secondary-color">Color Secundario</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={watchAllFields.secondary_color}
                  onChange={(e) => setValue("secondary_color", e.target.value)}
                  className="size-9 rounded-lg border cursor-pointer"
                />
                <Input id="secondary-color" {...register("secondary_color")} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <Label htmlFor="switch-default" className="font-medium">Plantilla Predeterminada Global</Label>
              <p className="text-xs text-muted-foreground">Utilizada si un curso no tiene plantilla específica</p>
            </div>
            <Switch
              id="switch-default"
              checked={watchAllFields.is_default}
              onCheckedChange={(checked) => setValue("is_default", checked)}
            />
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h3 className="font-display text-base font-bold">Textos del Certificado</h3>

          <div className="space-y-1.5">
            <Label htmlFor="issuer-name">Institución Emisora</Label>
            <Input id="issuer-name" {...register("layout_json.issuerName")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title-text">Título Principal</Label>
            <Input id="title-text" {...register("layout_json.titleText")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="body-text">Texto de Certificación</Label>
            <Textarea id="body-text" {...register("layout_json.bodyText")} rows={2} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="signature-name">Nombre Firmante</Label>
              <Input id="signature-name" {...register("signature_name")} placeholder="Ej. Dr. Carlos Mariscal" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="signature-title">Cargo Firmante</Label>
              <Input id="signature-title" {...register("signature_title")} placeholder="Ej. Director Académico" />
            </div>
          </div>
        </div>

        <Button id="btn-save-template" type="submit" disabled={isSaving} className="w-full gap-2">
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Guardar Configuración
        </Button>
      </form>

      <div className="space-y-4">
        <h3 className="font-display text-base font-bold">Vista Previa en Tiempo Real</h3>
        <CertificatePreview
          template={{
            name: watchAllFields.name,
            primary_color: watchAllFields.primary_color,
            secondary_color: watchAllFields.secondary_color,
            signature_name: watchAllFields.signature_name,
            signature_title: watchAllFields.signature_title,
            layout_json: watchAllFields.layout_json,
          }}
        />
      </div>
    </div>
  );
}
