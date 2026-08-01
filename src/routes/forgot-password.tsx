import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Recuperar contraseña — NeuraLab" },
      { name: "description", content: "Restablece la contraseña de tu cuenta de NeuraLab." },
      { property: "og:title", content: "Recuperar contraseña — NeuraLab" },
      { property: "og:description", content: "Te enviamos un enlace para restablecer tu acceso." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    setSent(true);
  }

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-md px-5 py-16">
        <h1 className="font-display text-3xl font-bold tracking-tight">Recuperar contraseña</h1>
        {sent ? (
          <p className="mt-6 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-soft">
            Si el correo existe, recibirás un enlace para restablecer tu contraseña.
          </p>
        ) : (
          <form
            onSubmit={onSubmit}
            className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando…" : "Enviar enlace"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="hover:text-foreground">
                Volver a iniciar sesión
              </Link>
            </p>
          </form>
        )}
      </div>
    </PageShell>
  );
}
