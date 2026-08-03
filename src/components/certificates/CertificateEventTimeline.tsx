import React from "react";
import { Award, Download, ShieldCheck, AlertTriangle, RefreshCw, FileCode } from "lucide-react";
import { useCertificateEvents } from "@/hooks/useCertificates";

interface CertificateEventTimelineProps {
  certificateId: string;
}

export function CertificateEventTimeline({ certificateId }: CertificateEventTimelineProps) {
  const { data: events, isLoading } = useCertificateEvents(certificateId);

  if (isLoading) {
    return (
      <p className="text-xs text-muted-foreground animate-pulse">
        Cargando historial de auditoría...
      </p>
    );
  }

  if (!events || events.length === 0) {
    return <p className="text-xs text-muted-foreground">Sin eventos de auditoría registrados.</p>;
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case "issued":
        return <Award className="size-4 text-emerald-500" />;
      case "downloaded":
        return <Download className="size-4 text-blue-500" />;
      case "verified":
        return <ShieldCheck className="size-4 text-purple-500" />;
      case "revoked":
        return <AlertTriangle className="size-4 text-destructive" />;
      case "reissued":
        return <RefreshCw className="size-4 text-amber-500" />;
      case "pdf_generated":
        return <FileCode className="size-4 text-slate-500" />;
      default:
        return <Award className="size-4 text-muted-foreground" />;
    }
  };

  const getEventTitle = (type: string) => {
    switch (type) {
      case "issued":
        return "Certificado emitido";
      case "downloaded":
        return "PDF descargado";
      case "verified":
        return "Verificación pública realizada";
      case "revoked":
        return "Certificado revocado";
      case "reissued":
        return "Credencial reemitida";
      case "pdf_generated":
        return "Documento PDF generado";
      default:
        return type;
    }
  };

  return (
    <div id="cert-event-timeline" className="space-y-4">
      <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Historial de Auditoría
      </h4>
      <div className="relative border-l border-border pl-4 space-y-4">
        {events.map((event) => (
          <div key={event.id} className="relative group">
            <div className="absolute -left-[21px] top-0.5 flex size-6 items-center justify-center rounded-full border border-border bg-background shadow-xs">
              {getEventIcon(event.event_type)}
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-foreground">
                {getEventTitle(event.event_type)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {new Date(event.created_at).toLocaleString("es-ES")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
