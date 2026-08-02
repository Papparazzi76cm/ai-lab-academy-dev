import React from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, AlertOctagon, Award, Building2, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { CertificateStatusBadge } from "./CertificateStatusBadge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CertificateVerificationResult } from "@/lib/certificates/types";

interface CertificateVerificationPageProps {
  result: CertificateVerificationResult;
  verificationCode: string;
}

export function CertificateVerificationPage({
  result,
  verificationCode,
}: CertificateVerificationPageProps) {
  if (!result || !result.found) {
    return (
      <div id="verify-not-found-container" className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertOctagon className="size-8" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Credencial No Encontrada
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          El código de verificación <span className="font-mono font-bold text-foreground">{verificationCode}</span> no corresponde a ningún certificado válido emitido por AI Lab Academy.
        </p>
        <div className="mt-8">
          <Button asChild variant="outline">
            <Link to="/">Volver al inicio</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isRevoked = result.status === "revoked";
  const formattedIssuedDate = result.issued_at
    ? new Date(result.issued_at).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-";

  const formattedCompletedDate = result.completed_at
    ? new Date(result.completed_at).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-";

  return (
    <div id="verify-success-container" className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <Card className={`overflow-hidden border shadow-medium ${isRevoked ? "border-destructive/40 bg-destructive/5" : "border-emerald-500/30"}`}>
        <CardHeader className="border-b border-border bg-card/50 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`flex size-12 items-center justify-center rounded-xl ${isRevoked ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-500"}`}>
                {isRevoked ? <AlertOctagon className="size-6" /> : <ShieldCheck className="size-6" />}
              </div>
              <div>
                <CardTitle className="font-display text-xl sm:text-2xl">
                  Verificación Oficial de Credencial
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Emitido por AI Lab Academy
                </p>
              </div>
            </div>
            <CertificateStatusBadge status={result.status || "active"} />
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6 sm:p-8">
          {isRevoked && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <p className="font-semibold">Atención: Certificado Revocado</p>
              <p className="mt-1 text-xs opacity-90">
                Motivo: {result.revocation_reason_public || "Este certificado ha sido revocado oficialmente por la institución."}
              </p>
            </div>
          )}

          {!isRevoked && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-4 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>Esta credencial es auténtica, válida e inalterable.</span>
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                <Award className="size-3.5" /> Alumno Certificado
              </span>
              <p className="font-display text-lg font-bold text-foreground">
                {result.student_name}
              </p>
            </div>

            <div className="space-y-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                <FileText className="size-3.5" /> Número de Certificado
              </span>
              <p className="font-mono text-base font-bold text-foreground">
                {result.certificate_number}
              </p>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                <Award className="size-3.5" /> Programa / Curso
              </span>
              <p className="font-display text-xl font-bold text-primary">
                {result.course_title}
              </p>
            </div>

            <div className="space-y-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                <Calendar className="size-3.5" /> Fecha de Finalización
              </span>
              <p className="text-sm font-medium text-foreground">{formattedCompletedDate}</p>
            </div>

            <div className="space-y-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                <Calendar className="size-3.5" /> Fecha de Emisión
              </span>
              <p className="text-sm font-medium text-foreground">{formattedIssuedDate}</p>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                <Building2 className="size-3.5" /> Institución Emisora
              </span>
              <p className="text-sm font-medium text-foreground">{result.issuer || "AI Lab Academy"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
