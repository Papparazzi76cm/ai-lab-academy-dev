// Types for Sprint 2.7 Certificates & Verification

export type CertificateStatus = "active" | "revoked" | "replaced";

export interface PublicCertificate {
  certificate_number: string;
  verification_code: string;
  student_name_snapshot: string;
  course_title_snapshot: string;
  instructor_name_snapshot: string | null;
  issued_at: string;
  completed_at: string;
  status: CertificateStatus;
  revocation_reason: string | null;
  issuer: string;
}

export interface StudentCertificate {
  id: string;
  certificate_number: string;
  verification_code: string;
  course_id: string;
  student_name_snapshot: string;
  course_title_snapshot: string;
  instructor_name_snapshot: string | null;
  issued_at: string;
  completed_at: string;
  status: CertificateStatus;
  pdf_path: string | null;
  revocation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminCertificate extends StudentCertificate {
  user_id: string;
  enrollment_id: string | null;
  template_id: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  metadata_json: Record<string, unknown>;
}

export interface CertificateVerificationResult {
  found: boolean;
  status?: CertificateStatus;
  certificate_number?: string;
  student_name?: string;
  course_title?: string;
  issued_at?: string;
  completed_at?: string;
  issuer?: string;
  revocation_reason_public?: string | null;
}

export interface CertificateLayout {
  orientation: "landscape" | "portrait";
  showLogo: boolean;
  showQr: boolean;
  showSignature: boolean;
  issuerName: string;
  titleText: string;
  bodyText: string;
  qrSize?: number;
}

export interface CertificateTemplate {
  id: string;
  name: string;
  course_id: string | null;
  is_default: boolean;
  status: "draft" | "active" | "archived";
  background_url: string | null;
  logo_url: string | null;
  signature_name: string | null;
  signature_title: string | null;
  signature_image_url: string | null;
  primary_color: string;
  secondary_color: string;
  layout_json: CertificateLayout;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificateEvent {
  id: string;
  certificate_id: string;
  event_type: "issued" | "downloaded" | "verified" | "revoked" | "reissued" | "pdf_generated";
  actor_user_id: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
}
