import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type {
  StudentCertificate,
  AdminCertificate,
  CertificateVerificationResult,
  CertificateTemplate,
  CertificateEvent,
} from "./types";

export async function issueCourseCertificate(courseId: string): Promise<StudentCertificate> {
  const { data, error } = await supabase.rpc("issue_course_certificate_rpc", {
    p_course_id: courseId,
  });

  if (error) {
    console.error("Error al emitir certificado:", error);
    throw new Error(error.message || "No se pudo emitir el certificado");
  }

  return data as unknown as StudentCertificate;
}

export async function verifyCertificate(
  verificationCode: string,
): Promise<CertificateVerificationResult> {
  const { data, error } = await supabase.rpc("verify_certificate_rpc", {
    p_verification_code: verificationCode,
  });

  if (error) {
    console.error("Error al verificar certificado:", error);
    return { found: false };
  }

  return data as unknown as CertificateVerificationResult;
}

export async function fetchStudentCertificates(): Promise<StudentCertificate[]> {
  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .order("issued_at", { ascending: false });

  if (error) {
    console.error("Error al consultar certificados del estudiante:", error);
    throw new Error(error.message || "Error al obtener tus certificados");
  }

  return (data || []) as StudentCertificate[];
}

export async function fetchCertificateDetail(certificateId: string): Promise<StudentCertificate> {
  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .eq("id", certificateId)
    .single();

  if (error) {
    console.error("Error al obtener detalle del certificado:", error);
    throw new Error(error.message || "Certificado no encontrado");
  }

  return data as StudentCertificate;
}

export async function fetchAdminCertificates(params?: {
  search?: string;
  status?: string;
  courseId?: string;
}): Promise<AdminCertificate[]> {
  let query = supabase.from("certificates").select("*").order("issued_at", { ascending: false });

  if (params?.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params?.courseId) {
    query = query.eq("course_id", params.courseId);
  }

  if (params?.search && params.search.trim()) {
    const s = `%${params.search.trim()}%`;
    query = query.or(
      `certificate_number.ilike.${s},student_name_snapshot.ilike.${s},course_title_snapshot.ilike.${s},verification_code.ilike.${s}`,
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error al consultar certificados (admin):", error);
    throw new Error(error.message || "Error al consultar lista de certificados");
  }

  return (data || []) as AdminCertificate[];
}

export async function fetchInstructorCertificates(params?: {
  courseId?: string;
  search?: string;
}): Promise<StudentCertificate[]> {
  let query = supabase.from("certificates").select("*").order("issued_at", { ascending: false });

  if (params?.courseId) {
    query = query.eq("course_id", params.courseId);
  }

  if (params?.search && params.search.trim()) {
    const s = `%${params.search.trim()}%`;
    query = query.or(
      `certificate_number.ilike.${s},student_name_snapshot.ilike.${s},course_title_snapshot.ilike.${s}`,
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error al consultar certificados (instructor):", error);
    throw new Error(error.message || "Error al obtener certificados del instructor");
  }

  return (data || []) as StudentCertificate[];
}

export async function revokeCertificate(
  certificateId: string,
  reason: string,
): Promise<AdminCertificate> {
  const { data, error } = await supabase.rpc("revoke_certificate_rpc", {
    p_certificate_id: certificateId,
    p_reason: reason,
  });

  if (error) {
    console.error("Error al revocar certificado:", error);
    throw new Error(error.message || "No se pudo revocar el certificado");
  }

  return data as unknown as AdminCertificate;
}

export async function reissueCertificate(certificateId: string): Promise<AdminCertificate> {
  const { data, error } = await supabase.rpc("reissue_certificate_rpc", {
    p_certificate_id: certificateId,
  });

  if (error) {
    console.error("Error al reemitir certificado:", error);
    throw new Error(error.message || "No se pudo reemitir el certificado");
  }

  return data as unknown as AdminCertificate;
}

export async function generateCertificatePdf(
  certificateId: string,
): Promise<{ pdfPath: string; downloadUrl: string }> {
  const { data, error } = await supabase.functions.invoke("generate-certificate-pdf", {
    body: { certificate_id: certificateId },
  });

  if (error) {
    console.error("Error al invocar la función generate-certificate-pdf:", error);
    throw new Error(error.message || "Error al generar el PDF del certificado");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return {
    pdfPath: data.pdf_path,
    downloadUrl: data.signed_url,
  };
}

export async function getCertificateDownloadUrl(pdfPath: string): Promise<string | null> {
  if (!pdfPath) return null;
  const { data, error } = await supabase.storage
    .from("certificates")
    .createSignedUrl(pdfPath, 3600);

  if (error) {
    console.error("Error obteniendo URL firmada:", error);
    return null;
  }

  return data.signedUrl;
}

export async function fetchCertificateEvents(certificateId: string): Promise<CertificateEvent[]> {
  const { data, error } = await supabase
    .from("certificate_events")
    .select("*")
    .eq("certificate_id", certificateId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al obtener historial de eventos:", error);
    return [];
  }

  return (data || []) as CertificateEvent[];
}

export async function fetchCertificateTemplates(): Promise<CertificateTemplate[]> {
  const { data, error } = await supabase
    .from("certificate_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error al obtener plantillas:", error);
    throw new Error(error.message || "Error al obtener plantillas de certificado");
  }

  return (data || []) as unknown as CertificateTemplate[];
}

export async function saveCertificateTemplate(
  templateData: Partial<CertificateTemplate>,
): Promise<CertificateTemplate> {
  const layout = templateData.layout_json
    ? (templateData.layout_json as unknown as Json)
    : ({
        orientation: "landscape",
        showLogo: true,
        showQr: true,
        showSignature: true,
        issuerName: "AI Lab Academy",
        titleText: "Certificado de Finalización",
        bodyText: "Por haber completado satisfactoriamente el programa formativo de",
      } as unknown as Json);

  if (templateData.id) {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      layout_json: layout,
    };
    if (templateData["name"] !== undefined) updatePayload["name"] = templateData["name"];
    if (templateData["course_id"] !== undefined)
      updatePayload["course_id"] = templateData["course_id"];
    if (templateData["is_default"] !== undefined)
      updatePayload["is_default"] = templateData["is_default"];
    if (templateData["status"] !== undefined) updatePayload["status"] = templateData["status"];
    if (templateData["primary_color"] !== undefined)
      updatePayload["primary_color"] = templateData["primary_color"];
    if (templateData["secondary_color"] !== undefined)
      updatePayload["secondary_color"] = templateData["secondary_color"];
    if (templateData["signature_name"] !== undefined)
      updatePayload["signature_name"] = templateData["signature_name"];
    if (templateData["signature_title"] !== undefined)
      updatePayload["signature_title"] = templateData["signature_title"];

    const { data, error } = await supabase
      .from("certificate_templates")
      .update(updatePayload as never)
      .eq("id", templateData.id)
      .select()
      .single();

    if (error) throw new Error(error.message || "Error al actualizar plantilla");
    return data as unknown as CertificateTemplate;
  } else {
    const { data, error } = await supabase
      .from("certificate_templates")
      .insert({
        name: templateData.name || "Nueva Plantilla",
        course_id: templateData.course_id ?? null,
        is_default: templateData.is_default || false,
        status: templateData.status || "active",
        primary_color: templateData.primary_color || "#0f172a",
        secondary_color: templateData.secondary_color || "#2563eb",
        signature_name: templateData.signature_name ?? null,
        signature_title: templateData.signature_title ?? null,
        layout_json: layout,
      })
      .select()
      .single();

    if (error) throw new Error(error.message || "Error al crear plantilla");
    return data as unknown as CertificateTemplate;
  }
}
