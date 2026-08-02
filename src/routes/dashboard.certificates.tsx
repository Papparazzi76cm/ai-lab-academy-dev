import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/auth/RouteGuard";
import { PageShell } from "@/components/layout/PageShell";
import { CertificateCard } from "@/components/certificates/CertificateCard";
import { useCertificates } from "@/hooks/useCertificates";
import { Award, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/certificates")({
  head: () => ({
    meta: [
      { title: "Mis Certificados — AI Lab Academy" },
      { name: "description", content: "Consulta y descarga tus certificados oficiales de AI Lab Academy." },
    ],
  }),
  component: DashboardCertificatesPage,
});

function DashboardCertificatesPage() {
  return (
    <RequireAuth>
      <DashboardCertificatesContent />
    </RequireAuth>
  );
}

function DashboardCertificatesContent() {
  const { data: certificates, isLoading } = useCertificates();

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:py-14">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
              <Award className="size-4" />
              Credenciales Oficiales
            </div>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Mis Certificados
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Certificados de finalización emitidos y verificables públicamente.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-12 flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Cargando tus certificados...</p>
          </div>
        ) : !certificates || certificates.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Award className="size-6" />
            </div>
            <h3 className="mt-4 font-display text-lg font-bold">Aún no tienes certificados emitidos</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Completa al 100% tus cursos y aprueba las evaluaciones obligatorias para obtener tu certificado oficial.
            </p>
            <Button className="mt-6 gap-2" asChild>
              <Link to="/courses">
                <BookOpen className="size-4" />
                Explorar Cursos
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {certificates.map((cert) => (
              <CertificateCard key={cert.id} certificate={cert} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
