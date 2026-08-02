import React from "react";
import { Award, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIssueCertificate } from "@/hooks/useCertificates";
import { Link } from "@tanstack/react-router";

interface CertificateCompletionBannerProps {
  courseId: string;
  courseTitle: string;
  isIssued?: boolean;
}

export function CertificateCompletionBanner({
  courseId,
  courseTitle,
  isIssued = false,
}: CertificateCompletionBannerProps) {
  const { mutate: issueCert, isPending } = useIssueCertificate();

  return (
    <div
      id={`cert-completion-banner-${courseId}`}
      className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-6 shadow-medium dark:from-emerald-950/40"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-soft">
            <Sparkles className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              <span className="text-xs font-bold uppercase tracking-wider">¡Curso Completado!</span>
            </div>
            <h3 className="font-display text-lg font-bold text-foreground sm:text-xl">
              Tu certificado de "{courseTitle}" está listo
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Has alcanzado el 100% de progreso y superado todas las evaluaciones.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {isIssued ? (
            <Button id="btn-view-certificates" size="sm" asChild className="gap-2">
              <Link to="/dashboard/certificates">
                Ver mis certificados
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button
              id="btn-issue-certificate"
              size="sm"
              disabled={isPending}
              onClick={() => issueCert(courseId)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Award className="size-4" />
              {isPending ? "Generando certificado..." : "Obtener certificado"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
