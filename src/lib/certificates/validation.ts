import { z } from "zod";

export const CertificateLayoutSchema = z.object({
  orientation: z.enum(["landscape", "portrait"]).default("landscape"),
  showLogo: z.boolean().default(true),
  showQr: z.boolean().default(true),
  showSignature: z.boolean().default(true),
  issuerName: z.string().min(1, "El nombre de la institución es requerido").default("AI Lab Academy"),
  titleText: z.string().min(1, "El título del certificado es requerido").default("Certificado de Finalización"),
  bodyText: z.string().min(1, "El texto descriptivo es requerido").default("Por haber completado satisfactoriamente el programa formativo de"),
  qrSize: z.number().min(30).max(150).optional().default(60),
});

export const CertificateTemplateSchema = z.object({
  name: z.string().min(2, "El nombre de la plantilla es requerido"),
  course_id: z.string().uuid("ID de curso inválido").nullable().optional(),
  is_default: z.boolean().default(false),
  status: z.enum(["draft", "active", "archived"]).default("active"),
  background_url: z.string().url("URL de fondo inválida").nullable().optional().or(z.literal("")),
  logo_url: z.string().url("URL de logo inválida").nullable().optional().or(z.literal("")),
  signature_name: z.string().nullable().optional(),
  signature_title: z.string().nullable().optional(),
  signature_image_url: z.string().url("URL de firma inválida").nullable().optional().or(z.literal("")),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color primario hex inválido").default("#0f172a"),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color secundario hex inválido").default("#2563eb"),
  layout_json: CertificateLayoutSchema,
});

export const VerificationCodeSchema = z.string().trim().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i, "Código de verificación con formato inválido");

export const PublicCertificateSchema = z.object({
  certificate_number: z.string(),
  verification_code: z.string(),
  student_name_snapshot: z.string(),
  course_title_snapshot: z.string(),
  instructor_name_snapshot: z.string().nullable(),
  issued_at: z.string(),
  completed_at: z.string(),
  status: z.enum(["active", "revoked", "replaced"]),
  revocation_reason: z.string().nullable(),
  issuer: z.string(),
});

export const CertificateVerificationResultSchema = z.object({
  found: z.boolean(),
  status: z.enum(["active", "revoked", "replaced"]).optional(),
  certificate_number: z.string().optional(),
  student_name: z.string().optional(),
  course_title: z.string().optional(),
  issued_at: z.string().optional(),
  completed_at: z.string().optional(),
  issuer: z.string().optional(),
  revocation_reason_public: z.string().nullable().optional(),
});

export const RevokeCertificateSchema = z.object({
  certificate_id: z.string().uuid("ID de certificado inválido"),
  reason: z.string().min(5, "Debes indicar un motivo de revocación explícito"),
});

export const ReissueCertificateSchema = z.object({
  certificate_id: z.string().uuid("ID de certificado inválido"),
});

export const GeneratePdfResponseSchema = z.object({
  pdf_path: z.string(),
  download_url: z.string().url(),
});
