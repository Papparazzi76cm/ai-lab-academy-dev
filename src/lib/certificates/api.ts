import { supabase } from "@/integrations/supabase/client";
import { generateCertificatePdfDoc } from "./pdf";
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

  return data as StudentCertificate;
}

export async function verifyCertificate(verificationCode: string): Promise<CertificateVerificationResult> {
  const { data, error } = await supabase.rpc("verify_certificate_rpc", {
    p_verification_code: verificationCode,
  });

  if (error) {
    console.error("Error al verificar certificado:", error);
    return { found: false };
  }

  return data as CertificateVerificationResult;
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
    query = query.or(`certificate_number.ilike.${s},student_name_snapshot.ilike.${s},course_title_snapshot.ilike.${s},verification_code.ilike.${s}`);
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
    query = query.or(`certificate_number.ilike.${s},student_name_snapshot.ilike.${s},course_title_snapshot.ilike.${s}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error al consultar certificados (instructor):", error);
    throw new Error(error.message || "Error al obtener certificados del instructor");
  }

  return (data || []) as StudentCertificate[];
}

export async function revokeCertificate(certificateId: string, reason: string): Promise<AdminCertificate> {
  const { data, error } = await supabase.rpc("revoke_certificate_rpc", {
    p_certificate_id: certificateId,
    p_reason: reason,
  });

  if (error) {
    console.error("Error al revocar certificado:", error);
    throw new Error(error.message || "No se pudo revocar el certificado");
  }

  return data as AdminCertificate;
}

export async function reissueCertificate(certificateId: string): Promise<AdminCertificate> {
  const { data, error } = await supabase.rpc("reissue_certificate_rpc", {
    p_certificate_id: certificateId,
  });

  if (error) {
    console.error("Error al reemitir certificado:", error);
    throw new Error(error.message || "No se pudo reemitir el certificado");
  }

  return data as AdminCertificate;
}

export async function generateCertificatePdf(certificateId: string): Promise<{ pdfPath: string; downloadUrl: string }> {
  // 1. Fetch certificate
  const cert = await fetchCertificateDetail(certificateId);

  // 2. Fetch template
  let template: CertificateTemplate | null = null;
  const { data: tData } = await supabase
    .from("certificate_templates")
    .select("*")
    .eq("status", "active")
    .or(`course_id.eq.${cert.course_id},is_default.eq.true`)
    .order("is_default", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (tData) {
    template = tData as unknown as CertificateTemplate;
  }

  // 3. Generate PDF doc
  const pdfDoc = await generateCertificatePdfDoc({
    certificate: cert,
    template,
  });

  const pdfArrayBuffer = pdfDoc.output("arraybuffer");
  const blob = new Blob([pdfArrayBuffer], { type: "application/pdf" });

  const userId = cert.id; // Or user's folder path
  const storagePath = `${cert.course_id}/${cert.id}/certificate.pdf`;

  // 4. Upload to storage bucket
  const { error: uploadError } = await supabase.storage
    .from("certificates")
    .upload(storagePath, blob, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.warn("Upload to storage warning (proceeding with Blob URL fallback if restricted):", uploadError);
  }

  // 5. Update pdf_path in database
  await supabase
    .from("certificates")
    .update({ pdf_path: storagePath, updated_at: new Date().toISOString() })
    .eq("id", cert.id);

  // 6. Record pdf_generated event
  await supabase.from("certificate_events").insert({
    certificate_id: cert.id,
    event_type: "pdf_generated",
    metadata_json: { path: storagePath },
  });

  // 7. Get temporary signed download URL
  const { data: signedData } = await supabase.storage
    .from("certificates")
    .createSignedUrl(storagePath, 3600);

  const downloadUrl = signedData?.signedUrl || URL.createObjectURL(blob);

  return {
    pdfPath: storagePath,
    downloadUrl,
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

export async function saveCertificateTemplate(templateData: Partial<CertificateTemplate>): Promise<CertificateTemplate> {
  if (templateData.id) {
    const { data, error } = await supabase
      .from("certificate_templates")
      .update({
        ...templateData,
        updated_at: new Date().toISOString(),
      })
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
        is_default: templateData.is_default || false,
        status: templateData.status || "active",
        primary_color: templateData.primary_color || "#0f172a",
        secondary_color: templateData.secondary_color || "#2563eb",
        layout_json: templateData.layout_json || {
          orientation: "landscape",
          showLogo: true,
          showQr: true,
          showSignature: true,
          issuerName: "AI Lab Academy",
          titleText: "Certificado de Finalización",
          bodyText: "Por haber completado satisfactoriamente el programa formativo de",
        },
      })
      .select()
      .single();

    if (error) throw new Error(error.message || "Error al crear plantilla");
    return data as unknown as CertificateTemplate;
  }
}
