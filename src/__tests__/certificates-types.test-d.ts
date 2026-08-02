import { expectTypeOf } from "vitest";
import type {
  PublicCertificate,
  StudentCertificate,
  AdminCertificate,
  CertificateVerificationResult,
} from "../lib/certificates/types";

// Type verification tests
export function testTypes() {
  // PublicCertificate must NOT have user_id, enrollment_id, pdf_path, metadata_json, or revoked_by
  expectTypeOf<PublicCertificate>().not.toHaveProperty("user_id");
  expectTypeOf<PublicCertificate>().not.toHaveProperty("enrollment_id");
  expectTypeOf<PublicCertificate>().not.toHaveProperty("pdf_path");
  expectTypeOf<PublicCertificate>().not.toHaveProperty("metadata_json");
  expectTypeOf<PublicCertificate>().not.toHaveProperty("revoked_by");

  // StudentCertificate has basic student fields
  expectTypeOf<StudentCertificate>().toHaveProperty("id");
  expectTypeOf<StudentCertificate>().toHaveProperty("certificate_number");
  expectTypeOf<StudentCertificate>().toHaveProperty("verification_code");
  expectTypeOf<StudentCertificate>().toHaveProperty("pdf_path");

  // AdminCertificate extends StudentCertificate with administrative fields
  expectTypeOf<AdminCertificate>().toHaveProperty("user_id");
  expectTypeOf<AdminCertificate>().toHaveProperty("enrollment_id");
  expectTypeOf<AdminCertificate>().toHaveProperty("metadata_json");

  // Verification result structure
  expectTypeOf<CertificateVerificationResult>().toHaveProperty("found");
}
