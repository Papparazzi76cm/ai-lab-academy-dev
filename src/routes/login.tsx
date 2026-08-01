import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";

function safeRedirect(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search["redirect"] === "string" ? (search["redirect"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Iniciar sesión — NeuraLab" },
      {
        name: "description",
        content: "Accede a tu cuenta de NeuraLab y continúa tu formación en IA.",
      },
      { property: "og:title", content: "Iniciar sesión — NeuraLab" },
      { property: "og:description", content: "Accede a tus cursos y a tu progreso." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { signIn } = useAuth();
  const destination = safeRedirect(search.redirect);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: message } = await signIn(email, password);
    setLoading(false);
    if (message) {
      setError(message);
      toast.error(message);
      return;
    }
    navigate({ to: destination });
  }

  async function google() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("No se pudo iniciar sesión con Google.");
      toast.error("No se pudo iniciar sesión con Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: destination });
  }

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-md px-5 py-16">
        <h1 className="font-display text-3xl font-bold tracking-tight">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-muted-foreground">Continúa donde lo dejaste.</p>

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
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
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
            {loading ? "Entrando…" : "Entrar"}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={google}>
            Continuar con Google
          </Button>
          <div className="flex justify-between text-sm text-muted-foreground">
            <Link to="/forgot-password" className="hover:text-foreground">
              ¿Olvidaste tu contraseña?
            </Link>
            <Link to="/register" className="hover:text-foreground">
              Crear cuenta
            </Link>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
