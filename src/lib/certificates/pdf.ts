import { jsPDF } from "jspdf";
import { generateVerificationQrDataUrl } from "./qr";
import { getPublicVerificationUrl } from "./certificate-number";
import type { StudentCertificate, CertificateTemplate } from "./types";

export interface GeneratePdfOptions {
  certificate: StudentCertificate;
  template?: CertificateTemplate | null;
  origin?: string;
}

export async function generateCertificatePdfDoc({
  certificate,
  template,
  origin,
}: GeneratePdfOptions): Promise<jsPDF> {
  const orientation = template?.layout_json?.orientation || "landscape";
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  const primaryColor = template?.primary_color || "#0f172a";
  const secondaryColor = template?.secondary_color || "#2563eb";

  // Background frame / border
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(2);
  doc.rect(10, 10, width - 20, height - 20);

  doc.setDrawColor(secondaryColor);
  doc.setLineWidth(0.5);
  doc.rect(13, 13, width - 26, height - 26);

  // Decorative corner accents
  const cornerSize = 8;
  doc.setFillColor(secondaryColor);
  doc.rect(10, 10, cornerSize, cornerSize, "F");
  doc.rect(width - 10 - cornerSize, 10, cornerSize, cornerSize, "F");
  doc.rect(10, height - 10 - cornerSize, cornerSize, cornerSize, "F");
  doc.rect(width - 10 - cornerSize, height - 10 - cornerSize, cornerSize, cornerSize, "F");

  // Header / Institution Name
  const issuerName = template?.layout_json?.issuerName || "AI LAB ACADEMY";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(primaryColor);
  doc.text(issuerName.toUpperCase(), width / 2, 32, { align: "center" });

  // Subtitle / Title
  const titleText = template?.layout_json?.titleText || "CERTIFICADO DE FINALIZACIÓN";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(secondaryColor);
  doc.text(titleText.toUpperCase(), width / 2, 44, { align: "center" });

  // Divider Line
  doc.setDrawColor("#e2e8f0");
  doc.setLineWidth(0.5);
  doc.line(width / 4, 48, (width * 3) / 4, 48);

  // Body text introductory
  const bodyText = template?.layout_json?.bodyText || "Por haber completado satisfactoriamente el programa formativo de";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor("#475569");
  doc.text(bodyText, width / 2, 60, { align: "center" });

  // Student Full Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(primaryColor);
  doc.text(certificate.student_name_snapshot, width / 2, 76, { align: "center" });

  // Course Title Statement
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor("#475569");
  doc.text("Ha superado con éxito todos los módulos y evaluaciones del curso:", width / 2, 92, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(secondaryColor);
  doc.text(`"${certificate.course_title_snapshot}"`, width / 2, 106, { align: "center" });

  // Dates
  const completionDateFormatted = new Date(certificate.completed_at).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const issueDateFormatted = new Date(certificate.issued_at).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor("#64748b");
  doc.text(`Fecha de finalización: ${completionDateFormatted}  |  Fecha de emisión: ${issueDateFormatted}`, width / 2, 122, { align: "center" });

  // Instructor / Signature section
  if (certificate.instructor_name_snapshot || template?.signature_name) {
    const instName = certificate.instructor_name_snapshot || template?.signature_name || "";
    const instTitle = template?.signature_title || "Instructor Certificado";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(primaryColor);
    doc.text(instName, 50, height - 42, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor("#64748b");
    doc.text(instTitle, 50, height - 37, { align: "center" });

    doc.setDrawColor("#cbd5e1");
    doc.setLineWidth(0.5);
    doc.line(25, height - 47, 75, height - 47);
  }

  // QR Code & Verification Section
  const qrDataUrl = await generateVerificationQrDataUrl(certificate.verification_code, origin);
  const qrSize = 28;
  const qrX = width - 50;
  const qrY = height - 52;
  doc.addImage(qrDataUrl, "PNG", qrX - qrSize / 2, qrY, qrSize, qrSize);

  // Credential Details (Bottom line)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(primaryColor);
  doc.text(`Nº Certificado: ${certificate.certificate_number}`, width / 2, height - 28, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor("#64748b");
  doc.text(`Código de Verificación: ${certificate.verification_code}`, width / 2, height - 23, { align: "center" });

  const verifyUrl = getPublicVerificationUrl(certificate.verification_code, origin);
  doc.text(`Verificación pública en: ${verifyUrl}`, width / 2, height - 18, { align: "center" });

  if (certificate.status === "revoked") {
    // Watermark overlay for revoked certificates
    doc.setFont("helvetica", "bold");
    doc.setFontSize(40);
    doc.setTextColor("#ef4444");
    doc.text("REVOCADO", width / 2, height / 2, { align: "center", angle: 30 });
  }

  return doc;
}
