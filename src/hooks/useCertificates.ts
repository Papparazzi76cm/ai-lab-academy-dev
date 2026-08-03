import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchStudentCertificates,
  fetchCertificateDetail,
  issueCourseCertificate,
  verifyCertificate,
  fetchAdminCertificates,
  fetchInstructorCertificates,
  revokeCertificate,
  reissueCertificate,
  generateCertificatePdf,
  fetchCertificateEvents,
  fetchCertificateTemplates,
  saveCertificateTemplate,
} from "@/lib/certificates/api";
import type { CertificateTemplate } from "@/lib/certificates/types";

export function useCertificates() {
  return useQuery({
    queryKey: ["student-certificates"],
    queryFn: () => fetchStudentCertificates(),
  });
}

export function useCertificate(certificateId?: string) {
  return useQuery({
    queryKey: ["certificate-detail", certificateId],
    queryFn: () => fetchCertificateDetail(certificateId!),
    enabled: Boolean(certificateId),
  });
}

export function useIssueCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseId: string) => issueCourseCertificate(courseId),
    onSuccess: () => {
      toast.success("¡Certificado emitido con éxito!");
      queryClient.invalidateQueries({ queryKey: ["student-certificates"] });
      queryClient.invalidateQueries({ queryKey: ["user-dashboard-stats"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "No se pudo emitir el certificado");
    },
  });
}

export function useGenerateCertificatePdf() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (certificateId: string) => generateCertificatePdf(certificateId),
    onSuccess: (data, certificateId) => {
      toast.success("PDF generado. Iniciando descarga...");
      queryClient.invalidateQueries({ queryKey: ["certificate-detail", certificateId] });
      queryClient.invalidateQueries({ queryKey: ["student-certificates"] });
      // Open / trigger download
      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al generar o descargar el PDF");
    },
  });
}

export function useVerifyCertificate(verificationCode?: string) {
  return useQuery({
    queryKey: ["verify-certificate", verificationCode],
    queryFn: () => verifyCertificate(verificationCode!),
    enabled: Boolean(verificationCode && verificationCode.trim().length > 0),
    retry: false,
  });
}

export function useCertificateEvents(certificateId?: string) {
  return useQuery({
    queryKey: ["certificate-events", certificateId],
    queryFn: () => fetchCertificateEvents(certificateId!),
    enabled: Boolean(certificateId),
  });
}

export function useCertificateAdmin(params?: {
  search?: string;
  status?: string;
  courseId?: string;
}) {
  const queryClient = useQueryClient();

  const certificatesQuery = useQuery({
    queryKey: ["admin-certificates", params],
    queryFn: () => fetchAdminCertificates(params),
  });

  const templatesQuery = useQuery({
    queryKey: ["certificate-templates"],
    queryFn: () => fetchCertificateTemplates(),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ certificateId, reason }: { certificateId: string; reason: string }) =>
      revokeCertificate(certificateId, reason),
    onSuccess: () => {
      toast.success("Certificado revocado correctamente");
      queryClient.invalidateQueries({ queryKey: ["admin-certificates"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al revocar certificado");
    },
  });

  const reissueMutation = useMutation({
    mutationFn: (certificateId: string) => reissueCertificate(certificateId),
    onSuccess: () => {
      toast.success("Nueva credencial reemitida correctamente");
      queryClient.invalidateQueries({ queryKey: ["admin-certificates"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al reemitir certificado");
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (templateData: Partial<CertificateTemplate>) =>
      saveCertificateTemplate(templateData),
    onSuccess: () => {
      toast.success("Plantilla guardada correctamente");
      queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Error al guardar la plantilla");
    },
  });

  return {
    certificatesQuery,
    templatesQuery,
    revokeMutation,
    reissueMutation,
    saveTemplateMutation,
  };
}

export function useCertificateInstructor(params?: { courseId?: string; search?: string }) {
  return useQuery({
    queryKey: ["instructor-certificates", params],
    queryFn: () => fetchInstructorCertificates(params),
  });
}
