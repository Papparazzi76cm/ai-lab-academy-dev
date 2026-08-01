import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/update-password")({
  head: () => ({
    meta: [
      { title: "Nueva contraseña — NeuraLab" },
      {
        name: "description",
        content: "Define una nueva contraseña para tu cuenta de NeuraLab.",
      },
      { property: "og:title", content: "Nueva contraseña — NeuraLab" },
      { property: "og:description", content: "Completa el cambio de contraseña de tu cuenta." },
    ],
  }),
  component: UpdatePasswordPage,
});

function UpdatePasswordPage() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setHasSession(Boolean(data.session));
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
      setChecking(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    const { error: message } = await updatePassword(password);
    setLoading(false);
    if (message) {
      setError(message);
      toast.error(message);
      return;
    }
    setDone(true);
    toast.success("Contraseña actualizada correctamente.");
    setTimeout(() => void navigate({ to: "/dashboard" }), 1200);
  }

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-md px-5 py-16">
        <h1 className="font-display text-3xl font-bold tracking-tight">Nueva contraseña</h1>

        {checking ? (
          <div className="mt-8 space-y-4" aria-busy="true" aria-live="polite">
            <span className="sr-only">Comprobando el enlace de recuperación…</span>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !hasSession ? (
          <div className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <p className="text-sm text-muted-foreground">
              El enlace de recuperación no es válido o ha caducado. Solicita uno nuevo para cambiar
              tu contraseña.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/forgot-password">Solicitar nuevo enlace</Link>
            </Button>
          </div>
        ) : done ? (
          <div className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <p className="text-sm text-muted-foreground">
              Tu contraseña se ha actualizado. Te llevamos a tu aprendizaje…
            </p>
            <Button asChild className="w-full">
              <Link to="/dashboard">Ir a mi aprendizaje</Link>
            </Button>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-soft"
          >
            <div className="space-y-2">
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input
                id="password"
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Repite la contraseña</Label>
              <Input
                id="confirm"
                type="password"
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Guardando…" : "Guardar contraseña"}
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
