// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import {
  formatCertificateNumber,
  formatVerificationCode,
  isValidVerificationCodeFormat,
  getPublicVerificationUrl,
} from "../lib/certificates/certificate-number";
import { CertificateStatusBadge } from "../components/certificates/CertificateStatusBadge";
import { CertificatePreview } from "../components/certificates/CertificatePreview";
import { CertificateVerificationPage } from "../components/certificates/CertificateVerificationPage";

// Local formatting utility tests
describe("Certificate Formatting & Code Utilities", () => {
  it("formats certificate number correctly", () => {
    expect(formatCertificateNumber(" aila-2026-000001 ")).toBe("AILA-2026-000001");
  });

  it("formats 16-char raw string into verification code pattern", () => {
    expect(formatVerificationCode("7GQ4K8M2PZ9XL3VN")).toBe("7GQ4-K8M2-PZ9X-L3VN");
  });

  it("validates verification code format strictly", () => {
    expect(isValidVerificationCodeFormat("7GQ4-K8M2-PZ9X-L3VN")).toBe(true);
    expect(isValidVerificationCodeFormat("7GQ4-K8M2-PZ9X")).toBe(false);
    expect(isValidVerificationCodeFormat("INVALID_CODE")).toBe(false);
  });

  it("builds public verification URL pointing to /verify/:code", () => {
    const url = getPublicVerificationUrl("7GQ4-K8M2-PZ9X-L3VN", "https://ailab.academy");
    expect(url).toBe("https://ailab.academy/verify/7GQ4-K8M2-PZ9X-L3VN");
  });
});

describe("Certificate UI Components", () => {
  it("renders active CertificateStatusBadge", () => {
    render(<CertificateStatusBadge status="active" />);
    expect(screen.getByText("Válido")).toBeDefined();
  });

  it("renders revoked CertificateStatusBadge", () => {
    render(<CertificateStatusBadge status="revoked" />);
    expect(screen.getByText("Revocado")).toBeDefined();
  });

  it("renders CertificatePreview with template info", () => {
    render(
      <CertificatePreview
        certificate={{
          student_name_snapshot: "Carlos Mariscal",
          course_title_snapshot: "Ingeniería de Prompts",
          certificate_number: "AILA-2026-000100",
        }}
      />,
    );
    expect(screen.getByText("Carlos Mariscal")).toBeDefined();
    expect(screen.getByText('"Ingeniería de Prompts"')).toBeDefined();
  });

  it("renders public verification page without private user data leaks", () => {
    render(
      <CertificateVerificationPage
        result={{
          found: true,
          status: "active",
          certificate_number: "AILA-2026-000001",
          student_name: "Juan Perez",
          course_title: "Curso de Python para IA",
          issued_at: "2026-08-01T12:00:00Z",
          completed_at: "2026-08-01T11:50:00Z",
          issuer: "AI Lab Academy",
        }}
        verificationCode="7GQ4-K8M2-PZ9X-L3VN"
      />,
    );

    expect(screen.getByText("Juan Perez")).toBeDefined();
    expect(screen.getByText("AILA-2026-000001")).toBeDefined();
    expect(screen.getByText("Curso de Python para IA")).toBeDefined();
    // Ensure no private credentials/user_id displayed
    expect(screen.queryByText(/@/)).toBeNull();
  });
});
