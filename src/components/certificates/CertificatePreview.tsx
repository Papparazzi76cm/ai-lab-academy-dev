import React from "react";
import { Award, ShieldCheck } from "lucide-react";
import type { CertificateTemplate, StudentCertificate } from "@/lib/certificates/types";

interface CertificatePreviewProps {
  certificate?: Partial<StudentCertificate>;
  template?: Partial<CertificateTemplate>;
  className?: string;
}

export function CertificatePreview({
  certificate,
  template,
  className = "",
}: CertificatePreviewProps) {
  const primaryColor = template?.primary_color || "#0f172a";
  const secondaryColor = template?.secondary_color || "#2563eb";
  const layout = template?.layout_json || {
    orientation: "landscape",
    showLogo: true,
    showQr: true,
    showSignature: true,
    issuerName: "AI Lab Academy",
    titleText: "Certificado de Finalización",
    bodyText: "Por haber completado satisfactoriamente el programa formativo de",
  };

  const studentName = certificate?.student_name_snapshot || "Nombre y Apellidos del Alumno";
  const courseTitle = certificate?.course_title_snapshot || "Nombre Oficial del Curso";
  const certNumber = certificate?.certificate_number || "AILA-2026-000001";
  const verifCode = certificate?.verification_code || "7GQ4-K8M2-PZ9X-L3VN";

  return (
    <div
      id="certificate-preview-container"
      className={`relative overflow-hidden rounded-xl border border-border bg-white p-8 text-center text-slate-800 shadow-soft dark:bg-slate-900 dark:text-slate-100 ${className}`}
      style={{
        borderColor: primaryColor,
      }}
    >
      {/* Decorative frame border */}
      <div
        className="pointer-events-none absolute inset-2 rounded-lg border"
        style={{ borderColor: secondaryColor, opacity: 0.4 }}
      />

      <div className="relative z-10 flex flex-col items-center space-y-4 py-4">
        {layout.showLogo && (
          <div
            className="flex size-12 items-center justify-center rounded-xl text-white shadow-soft"
            style={{ backgroundColor: primaryColor }}
          >
            <Award className="size-6" />
          </div>
        )}

        <h2
          className="font-display text-xl font-bold tracking-tight uppercase sm:text-2xl"
          style={{ color: primaryColor }}
        >
          {layout.issuerName || "AI LAB ACADEMY"}
        </h2>

        <p
          className="text-xs font-semibold tracking-widest uppercase sm:text-sm"
          style={{ color: secondaryColor }}
        >
          {layout.titleText || "CERTIFICADO DE FINALIZACIÓN"}
        </p>

        <div className="mx-auto h-0.5 w-24 bg-slate-200 dark:bg-slate-700" />

        <p className="text-xs text-muted-foreground">{layout.bodyText}</p>

        <p
          className="font-display text-2xl font-extrabold sm:text-3xl"
          style={{ color: primaryColor }}
        >
          {studentName}
        </p>

        <p className="text-xs text-muted-foreground">
          Ha superado con éxito el programa formativo:
        </p>

        <p className="font-display text-lg font-bold sm:text-xl" style={{ color: secondaryColor }}>
          "{courseTitle}"
        </p>

        <div className="mt-4 flex w-full flex-wrap items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
          <div className="text-left space-y-0.5">
            <p className="font-medium text-foreground">Nº Certificado: {certNumber}</p>
            <p className="text-[11px]">Código: {verifCode}</p>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <ShieldCheck className="size-4" />
            <span>Verificado por AI Lab Academy</span>
          </div>
        </div>
      </div>
    </div>
  );
}
