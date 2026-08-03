import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RequireRole } from "@/components/auth/RouteGuard";
import { PageShell } from "@/components/layout/PageShell";
import { CertificateTemplateEditor } from "@/components/certificates/CertificateTemplateEditor";
import { useCertificateAdmin } from "@/hooks/useCertificates";
import { Award, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CertificateTemplate } from "@/lib/certificates/types";

export const Route = createFileRoute("/admin/certificate-templates")({
  head: () => ({
    meta: [
      { title: "Plantillas de Certificados — Admin" },
      {
        name: "description",
        content: "Editor de plantillas oficiales de certificados para AI Lab Academy.",
      },
    ],
  }),
  component: AdminCertificateTemplatesPage,
});

function AdminCertificateTemplatesPage() {
  return (
    <RequireRole roles={["admin"]}>
      <AdminCertificateTemplatesContent />
    </RequireRole>
  );
}

function AdminCertificateTemplatesContent() {
  const { templatesQuery, saveTemplateMutation } = useCertificateAdmin();
  const { data: templates, isLoading } = templatesQuery;

  const [activeTemplate, setActiveTemplate] = useState<Partial<CertificateTemplate> | null>(null);

  const handleSave = (data: Partial<CertificateTemplate>) => {
    saveTemplateMutation.mutate(data, {
      onSuccess: () => {
        setActiveTemplate(null);
      },
    });
  };

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:py-14">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
              <Award className="size-4" />
              Administración
            </div>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Plantillas de Certificado
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configura el diseño, los colores, textos y firmas de los certificados.
            </p>
          </div>

          {!activeTemplate && (
            <Button
              id="btn-create-template"
              onClick={() => setActiveTemplate({ name: "Nueva Plantilla Especial" })}
              className="gap-2"
            >
              <Plus className="size-4" />
              Nueva Plantilla
            </Button>
          )}
        </div>

        {activeTemplate ? (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="font-display text-xl font-bold">
                {activeTemplate.id ? "Editar Plantilla" : "Crear Nueva Plantilla"}
              </h2>
              <Button variant="outline" size="sm" onClick={() => setActiveTemplate(null)}>
                Volver a la lista
              </Button>
            </div>

            <CertificateTemplateEditor
              initialTemplate={activeTemplate}
              onSave={handleSave}
              isSaving={saveTemplateMutation.isPending}
            />
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : !templates || templates.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No hay plantillas registradas.
              </p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-soft"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-bold">{tmpl.name}</span>
                        {tmpl.is_default && (
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary uppercase">
                            Predeterminada
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Orientación: {tmpl.layout_json?.orientation || "landscape"}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-end">
                      <Button
                        id={`btn-edit-tmpl-${tmpl.id}`}
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTemplate(tmpl)}
                      >
                        Editar Plantilla
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
