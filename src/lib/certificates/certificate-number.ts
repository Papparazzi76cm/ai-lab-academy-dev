// Helper functions for formatting and validating certificate numbers and codes

export function formatCertificateNumber(numberStr: string): string {
  if (!numberStr) return "";
  return numberStr.trim().toUpperCase();
}

export function formatVerificationCode(codeRaw: string): string {
  const clean = codeRaw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (clean.length !== 16) return codeRaw.trim().toUpperCase();
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}`;
}

export function isValidVerificationCodeFormat(code: string): boolean {
  const codePattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
  return codePattern.test(code.trim());
}

export function getPublicVerificationUrl(verificationCode: string, origin?: string): string {
  const base =
    origin || (typeof window !== "undefined" ? window.location.origin : "https://ailab.academy");
  const cleanCode = encodeURIComponent(formatVerificationCode(verificationCode));
  return `${base.replace(/\/$/, "")}/verify/${cleanCode}`;
}
