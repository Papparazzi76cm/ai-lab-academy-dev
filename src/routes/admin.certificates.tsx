import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RequireRole } from "@/components/auth/RouteGuard";
import { PageShell } from "@/components/layout/PageShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CertificateStatusBadge } from "@/components/certificates/CertificateStatusBadge";
import { CertificateDetails } from "@/components/certificates/CertificateDetails";
import { CertificateEventTimeline } from "@/components/certificates/CertificateEventTimeline";
import { RevokeCertificateDialog } from "@/components/certificates/RevokeCertificateDialog";
import { ReissueCertificateDialog } from "@/components/certificates/ReissueCertificateDialog";
import { useCertificateAdmin } from "@/hooks/useCertificates";
import { Award, Search, Eye, Loader2, RefreshCw } from "lucide-react";
import type { AdminCertificate } from "@/lib/certificates/types";

export const Route = createFileRoute("/admin/certificates")({
  head: () => ({
    meta: [
      { title: "Gestión de Certificados — Admin" },
      {
        name: "description",
        content: "Panel de administración de certificados y credenciales de AI Lab Academy.",
      },
    ],
  }),
  component: AdminCertificatesPage,
});

function AdminCertificatesPage() {
  return (
    <RequireRole roles={["admin"]}>
      <AdminCertificatesContent />
    </RequireRole>
  );
}

function AdminCertificatesContent() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCert, setSelectedCert] = useState<AdminCertificate | null>(null);
  const [revokeCertId, setRevokeCertId] = useState<string | null>(null);
  const [reissueCertId, setReissueCertId] = useState<string | null>(null);

  const { certificatesQuery, revokeMutation, reissueMutation } = useCertificateAdmin({
    search,
    status: statusFilter,
  });

  const { data: certificates, isLoading } = certificatesQuery;

  const handleRevokeConfirm = (reason: string) => {
    if (!revokeCertId) return;
    revokeMutation.mutate(
      { certificateId: revokeCertId, reason },
      {
        onSuccess: () => {
          setRevokeCertId(null);
          setSelectedCert(null);
        },
      },
    );
  };

  const handleReissueConfirm = () => {
    if (!reissueCertId) return;
    reissueMutation.mutate(reissueCertId, {
      onSuccess: () => {
        setReissueCertId(null);
        setSelectedCert(null);
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
              Gestión de Certificados
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Busca, consulta auditada, revoca y reemite credenciales registradas.
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="input-admin-cert-search"
              placeholder="Buscar por alumno, nº de certificado o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="select-admin-cert-status" className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Válidos (Activos)</SelectItem>
              <SelectItem value="revoked">Revocados</SelectItem>
              <SelectItem value="replaced">Reemplazados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table / List */}
        <div className="mt-6 rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : !certificates || certificates.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No se encontraron certificados con los criterios seleccionados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 uppercase text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-4">Nº Certificado</th>
                    <th className="p-4">Alumno</th>
                    <th className="p-4">Curso</th>
                    <th className="p-4">Emisión</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Acción</th>
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
                        <Button
                          id={`btn-view-admin-cert-${cert.id}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCert(cert)}
                          className="gap-1.5"
                        >
                          <Eye className="size-3.5" />
                          Detalles
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        <Dialog
          open={Boolean(selectedCert)}
          onOpenChange={(open) => !open && setSelectedCert(null)}
        >
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-lg">Detalles del Certificado</DialogTitle>
            </DialogHeader>
            {selectedCert && (
              <div className="space-y-6 py-2">
                <CertificateDetails
                  certificate={selectedCert}
                  isAdmin={true}
                  onRevoke={() => setRevokeCertId(selectedCert.id)}
                  onReissue={() => setReissueCertId(selectedCert.id)}
                />
                <CertificateEventTimeline certificateId={selectedCert.id} />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialogs */}
        <RevokeCertificateDialog
          open={Boolean(revokeCertId)}
          onOpenChange={(open) => !open && setRevokeCertId(null)}
          onConfirm={handleRevokeConfirm}
          isPending={revokeMutation.isPending}
        />

        <ReissueCertificateDialog
          open={Boolean(reissueCertId)}
          onOpenChange={(open) => !open && setReissueCertId(null)}
          onConfirm={handleReissueConfirm}
          isPending={reissueMutation.isPending}
        />
      </div>
    </PageShell>
  );
}
