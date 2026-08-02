import React from "react";
import { Award, Calendar, User, BookOpen, ShieldCheck, Download, AlertTriangle, RefreshCw } from "lucide-react";
import { CertificateStatusBadge } from "./CertificateStatusBadge";
import { CertificateDownloadButton } from "./CertificateDownloadButton";
import { Button } from "@/components/ui/button";
import type { AdminCertificate, StudentCertificate } from "@/lib/certificates/types";

interface CertificateDetailsProps {
  certificate: AdminCertificate | StudentCertificate;
  onRevoke?: () => void;
  onReissue?: () => void;
  isAdmin?: boolean;
}

export function CertificateDetails({
  certificate,
  onRevoke,
  onReissue,
  isAdmin = false,
}: CertificateDetailsProps) {
  const issuedDate = new Date(certificate.issued_at).toLocaleString("es-ES");
  const completedDate = new Date(certificate.completed_at).toLocaleDateString("es-ES");

  return (
    <div id={`cert-details-${certificate.id}`} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <span className="font-mono text-xs text-muted-foreground uppercase">{certificate.certificate_number}</span>
          <h2 className="font-display text-xl font-bold">{certificate.course_title_snapshot}</h2>
        </div>
        <CertificateStatusBadge status={certificate.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 text-sm">
        <div className="rounded-xl border border-border p-4 space-y-1">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
            <User className="size-3.5" /> Alumno
          </span>
          <p className="font-medium text-foreground">{certificate.student_name_snapshot}</p>
        </div>

        <div className="rounded-xl border border-border p-4 space-y-1">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
            <BookOpen className="size-3.5" /> Código de Verificación
          </span>
          <p className="font-mono font-semibold text-foreground">{certificate.verification_code}</p>
        </div>

        <div className="rounded-xl border border-border p-4 space-y-1">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
            <Calendar className="size-3.5" /> Emisión
          </span>
          <p className="font-medium text-foreground">{issuedDate}</p>
        </div>

        <div className="rounded-xl border border-border p-4 space-y-1">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
            <Calendar className="size-3.5" /> Finalización
          </span>
          <p className="font-medium text-foreground">{completedDate}</p>
        </div>
      </div>

      {certificate.status === "revoked" && certificate.revocation_reason && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
          <p className="font-semibold">Motivo de revocación:</p>
          <p className="mt-1">{certificate.revocation_reason}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
        <CertificateDownloadButton certificateId={certificate.id} />

        {isAdmin && certificate.status === "active" && onRevoke && (
          <Button
            id={`btn-revoke-cert-${certificate.id}`}
            variant="destructive"
            size="sm"
            onClick={onRevoke}
            className="gap-2"
          >
            <AlertTriangle className="size-4" />
            Revocar
          </Button>
        )}

        {isAdmin && certificate.status === "revoked" && onReissue && (
          <Button
            id={`btn-reissue-cert-${certificate.id}`}
            variant="outline"
            size="sm"
            onClick={onReissue}
            className="gap-2"
          >
            <RefreshCw className="size-4" />
            Reemitir Credencial
          </Button>
        )}
      </div>
    </div>
  );
}
