import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Crear cuenta — NeuraLab" },
      {
        name: "description",
        content: "Crea tu cuenta gratuita y empieza a aprender inteligencia artificial desde cero.",
      },
      { property: "og:title", content: "Crear cuenta — NeuraLab" },
      { property: "og:description", content: "Regístrate gratis en la academia de IA." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: message, needsEmailConfirmation } = await signUp(email, password, fullName);
    setLoading(false);
    if (message) {
      setError(message);
      toast.error(message);
      return;
    }
    if (needsEmailConfirmation) {
      setPendingEmail(email);
      return;
    }
    toast.success("Cuenta creada. ¡Bienvenido!");
    navigate({ to: "/dashboard" });
  }

  if (pendingEmail) {
    return (
      <PageShell>
        <div className="mx-auto w-full max-w-md px-5 py-16">
          <h1 className="font-display text-3xl font-bold tracking-tight">Revisa tu correo</h1>
          <div className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <p className="text-sm text-muted-foreground">
              Hemos enviado un enlace de confirmación a{" "}
              <span className="font-medium text-foreground">{pendingEmail}</span>. Confirma tu
              cuenta para poder iniciar sesión.
            </p>
            <p className="text-sm text-muted-foreground">
              <Link to="/login" className="hover:text-foreground">
                Volver a iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-md px-5 py-16">
        <h1 className="font-display text-3xl font-bold tracking-tight">Crear cuenta</h1>
        <p className="mt-2 text-sm text-muted-foreground">Empieza gratis en menos de un minuto.</p>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
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
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creando…" : "Crear cuenta"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="hover:text-foreground">
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </PageShell>
  );
}
