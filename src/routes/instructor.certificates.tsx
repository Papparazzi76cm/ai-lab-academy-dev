import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RequireRole } from "@/components/auth/RouteGuard";
import { PageShell } from "@/components/layout/PageShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CertificateStatusBadge } from "@/components/certificates/CertificateStatusBadge";
import { CertificateDownloadButton } from "@/components/certificates/CertificateDownloadButton";
import { useCertificateInstructor } from "@/hooks/useCertificates";
import { Award, Search, Loader2 } from "lucide-react";

export const Route = createFileRoute("/instructor/certificates")({
  head: () => ({
    meta: [
      { title: "Certificados de mis Cursos — Instructor" },
      {
        name: "description",
        content: "Consulta de certificados emitidos para los estudiantes de tus cursos.",
      },
    ],
  }),
  component: InstructorCertificatesPage,
});

function InstructorCertificatesPage() {
  return (
    <RequireRole roles={["instructor", "admin"]}>
      <InstructorCertificatesContent />
    </RequireRole>
  );
}

function InstructorCertificatesContent() {
  const [search, setSearch] = useState("");
  const { data: certificates, isLoading } = useCertificateInstructor({ search });

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:py-14">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
              <Award className="size-4" />
              Panel de Instructor
            </div>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Certificados Emitidos
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Estudiantes que han completado tus cursos y obtenido su certificado oficial.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-8 relative max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="input-instructor-cert-search"
            placeholder="Buscar estudiante o certificado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table / List */}
        <div className="mt-6 rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : !certificates || certificates.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No se han encontrado certificados para tus cursos.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 uppercase text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-4">Nº Certificado</th>
                    <th className="p-4">Estudiante</th>
                    <th className="p-4">Curso</th>
                    <th className="p-4">Fecha Emisión</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Documento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {certificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-muted/20">
                      <td className="p-4 font-mono font-medium">{cert.certificate_number}</td>
                      <td className="p-4 font-medium text-foreground">
                        {cert.student_name_snapshot}
                      </td>
                      <td className="p-4 max-w-[200px] truncate">{cert.course_title_snapshot}</td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(cert.issued_at).toLocaleDateString("es-ES")}
                      </td>
                      <td className="p-4">
                        <CertificateStatusBadge status={cert.status} showIcon={false} />
                      </td>
                      <td className="p-4 text-right">
                        <CertificateDownloadButton
                          certificateId={cert.id}
                          size="sm"
                          variant="ghost"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
