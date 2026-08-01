import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, type AppRole } from "@/hooks/useAuth";

function GuardLoading({ label }: { label: string }) {
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-3xl px-5 py-16" aria-busy="true" aria-live="polite">
        <span className="sr-only">{label}</span>
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-4 h-4 w-80" />
        <Skeleton className="mt-8 h-40 w-full rounded-2xl" />
      </div>
    </PageShell>
  );
}

function GuardMessage({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <PageShell>
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </PageShell>
  );
}

/** Redirects unauthenticated visitors to /login and returns them afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const href = useRouterState({ select: (s) => s.location.href });

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: "/login", search: { redirect: href }, replace: true });
    }
  }, [loading, user, href, navigate]);

  if (loading) return <GuardLoading label="Comprobando tu sesión…" />;

  if (!user) {
    return (
      <GuardMessage
        title="Necesitas iniciar sesión"
        description="Te estamos llevando a la página de acceso."
        action={
          <Button asChild>
            <Link to="/login" search={{ redirect: href }}>
              Iniciar sesión
            </Link>
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}

/** Requires an authenticated user holding at least one of the given roles. */
export function RequireRole({ roles, children }: { roles: AppRole[]; children: ReactNode }) {
  const { profileLoading, hasAnyRole } = useAuth();

  return (
    <RequireAuth>
      {profileLoading ? (
        <GuardLoading label="Comprobando tus permisos…" />
      ) : hasAnyRole(roles) ? (
        <>{children}</>
      ) : (
        <GuardMessage
          title="Acceso restringido"
          description="Tu cuenta no tiene permisos para ver esta sección de la academia."
          action={
            <Button asChild variant="outline">
              <Link to="/dashboard">Volver a mi aprendizaje</Link>
            </Button>
          }
        />
      )}
    </RequireAuth>
  );
}
