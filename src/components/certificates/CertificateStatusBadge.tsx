import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import type { CertificateStatus } from "@/lib/certificates/types";

interface CertificateStatusBadgeProps {
  status: CertificateStatus | string;
  showIcon?: boolean;
  className?: string;
}

export function CertificateStatusBadge({
  status,
  showIcon = true,
  className = "",
}: CertificateStatusBadgeProps) {
  switch (status) {
    case "active":
      return (
        <Badge
          id="cert-badge-active"
          variant="outline"
          className={`border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1.5 font-medium ${className}`}
        >
          {showIcon && <CheckCircle2 className="size-3.5" />}
          Válido
        </Badge>
      );
    case "revoked":
      return (
        <Badge
          id="cert-badge-revoked"
          variant="outline"
          className={`border-destructive/30 bg-destructive/10 text-destructive gap-1.5 font-medium ${className}`}
        >
          {showIcon && <AlertTriangle className="size-3.5" />}
          Revocado
        </Badge>
      );
    case "replaced":
      return (
        <Badge
          id="cert-badge-replaced"
          variant="outline"
          className={`border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 gap-1.5 font-medium ${className}`}
        >
          {showIcon && <RefreshCw className="size-3.5" />}
          Reemplazado
        </Badge>
      );
    default:
      return (
        <Badge id="cert-badge-unknown" variant="secondary" className={className}>
          {status}
        </Badge>
      );
  }
}
