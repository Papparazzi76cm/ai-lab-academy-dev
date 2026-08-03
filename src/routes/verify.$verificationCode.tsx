import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/PageShell";
import { CertificateVerificationPage } from "@/components/certificates/CertificateVerificationPage";
import { useVerifyCertificate } from "@/hooks/useCertificates";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/verify/$verificationCode")({
  head: ({ params }) => ({
    meta: [
      { title: `Verificación de Certificado ${params.verificationCode} — AI Lab Academy` },
      {
        name: "description",
        content: `Página pública oficial de verificación de credenciales y certificados de AI Lab Academy.`,
      },
    ],
  }),
  component: VerifyCertificateRoute,
});

function VerifyCertificateRoute() {
  const { verificationCode } = Route.useParams();
  const { data: result, isLoading } = useVerifyCertificate(verificationCode);

  return (
    <PageShell>
      <div className="min-h-[70vh] py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              Verificando credencial en el servidor oficial...
            </p>
          </div>
        ) : (
          <CertificateVerificationPage
            result={result || { found: false }}
            verificationCode={verificationCode}
          />
        )}
      </div>
    </PageShell>
  );
}
