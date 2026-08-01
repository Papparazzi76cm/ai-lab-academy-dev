import { useState } from "react";
import { Award, CheckCircle2, Share2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CertificateDraft } from "@/lib/learning-engine/types";
import { toast } from "sonner";

interface CourseCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificateDraft?: CertificateDraft | null;
  courseTitle: string;
}

export function CourseCompletionModal({
  isOpen,
  onClose,
  certificateDraft,
  courseTitle,
}: CourseCompletionModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const certCode = certificateDraft?.certificateCode || "AILA-CERT-SUCCESS";

  const handleCopyCode = () => {
    navigator.clipboard.writeText(certCode);
    setCopied(true);
    toast.success("Código de certificado copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-5" />
        </button>

        {/* Header graphics */}
        <div className="text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-8 animate-pulse" />
          </div>

          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            ¡Felicidades, Has completado el curso!
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Has finalizado con éxito todas las lecciones de{" "}
            <strong className="text-foreground">{courseTitle}</strong>.
          </p>
        </div>

        {/* Certificate Card Preview */}
        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5 text-center">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Award className="size-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Certificado de Finalización
            </span>
          </div>
          <p className="mt-2 font-mono text-lg font-bold tracking-widest text-foreground">
            {certCode}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyCode}
              className="gap-1.5 text-xs"
            >
              {copied ? (
                <CheckCircle2 className="size-3.5 text-emerald-500" />
              ) : (
                <Share2 className="size-3.5" />
              )}
              {copied ? "Copiado" : "Copiar código"}
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Continuar explorando
          </Button>
          <Button
            onClick={() => {
              onClose();
              window.location.href = "/dashboard";
            }}
            className="w-full sm:w-auto"
          >
            Ir a Mi Progreso
          </Button>
        </div>
      </div>
    </div>
  );
}
