import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useGenerateCertificatePdf } from "@/hooks/useCertificates";

interface CertificateDownloadButtonProps {
  certificateId: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
}

export function CertificateDownloadButton({
  certificateId,
  variant = "default",
  size = "sm",
  className = "",
  label = "Descargar PDF",
}: CertificateDownloadButtonProps) {
  const { mutate: generatePdf, isPending } = useGenerateCertificatePdf();

  return (
    <Button
      id={`btn-download-cert-${certificateId}`}
      variant={variant}
      size={size}
      disabled={isPending}
      className={`gap-2 ${className}`}
      onClick={() => generatePdf(certificateId)}
    >
      {isPending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Generando PDF...
        </>
      ) : (
        <>
          <Download className="size-4" />
          {label}
        </>
      )}
    </Button>
  );
}
