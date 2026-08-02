import React from "react";
import { Link } from "@tanstack/react-router";
import { Award, ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CertificateStatusBadge } from "./CertificateStatusBadge";
import { CertificateDownloadButton } from "./CertificateDownloadButton";
import { getPublicVerificationUrl } from "@/lib/certificates/certificate-number";
import { toast } from "sonner";
import type { StudentCertificate } from "@/lib/certificates/types";

interface CertificateCardProps {
  certificate: StudentCertificate;
  showActions?: boolean;
}

export function CertificateCard({ certificate, showActions = true }: CertificateCardProps) {
  const [copied, setCopied] = React.useState(false);
  const verifyUrl = getPublicVerificationUrl(certificate.verification_code);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    toast.success("Enlace de verificación copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = new Date(certificate.issued_at).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      id={`cert-card-${certificate.id}`}
      className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-soft transition-all duration-200 hover:border-primary/40 hover:shadow-medium"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Award className="size-6" />
          </div>
          <CertificateStatusBadge status={certificate.status} />
        </div>

        <div className="mt-5 space-y-1">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {certificate.certificate_number}
          </p>
          <h3 className="font-display text-lg font-bold text-card-foreground line-clamp-2">
            {certificate.course_title_snapshot}
          </h3>
          <p className="text-xs text-muted-foreground">
            Otorgado a: <span className="font-medium text-foreground">{certificate.student_name_snapshot}</span>
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Emitido el {formattedDate}</span>
          {certificate.instructor_name_snapshot && (
            <span>• Instructor: {certificate.instructor_name_snapshot}</span>
          )}
        </div>
      </div>

      {showActions && (
        <div className="mt-6 border-t border-border/60 pt-4 flex flex-wrap items-center justify-between gap-2">
          <CertificateDownloadButton
            certificateId={certificate.id}
            variant={certificate.status === "active" ? "default" : "secondary"}
          />

          <div className="flex items-center gap-1">
            <Button
              id={`btn-copy-cert-link-${certificate.id}`}
              variant="outline"
              size="sm"
              title="Copiar enlace de verificación"
              onClick={handleCopyLink}
              className="size-9 p-0"
            >
              {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
            </Button>

            <Button
              id={`btn-verify-cert-${certificate.id}`}
              variant="ghost"
              size="sm"
              asChild
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Link to="/verify/$verificationCode" params={{ verificationCode: certificate.verification_code }} target="_blank">
                Verificar
                <ExternalLink className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
