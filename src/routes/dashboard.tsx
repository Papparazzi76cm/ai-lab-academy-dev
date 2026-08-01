import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/auth/RouteGuard";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { myActivityQuery, myEnrollmentsQuery } from "@/lib/api";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Mi aprendizaje — NeuraLab" },
      {
        name: "description",
        content: "Tus cursos, tu progreso y tu actividad reciente en NeuraLab.",
      },
      { property: "og:title", content: "Mi aprendizaje — NeuraLab" },
      { property: "og:description", content: "Panel del alumno con cursos, progreso y objetivos." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}

function DashboardContent() {
  const { user, loading } = useAuth();
  const { data: enrollments = [] } = useQuery(myEnrollmentsQuery(user?.id));
  const { data: activity = [] } = useQuery(myActivityQuery(user?.id));

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-7xl px-5 py-14">
        <h1 className="font-display text-4xl font-bold tracking-tight">Mi aprendizaje</h1>

        {!user && !loading ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">Inicia sesión para ver tu progreso.</p>
            <Button className="mt-5" asChild>
              <Link to="/login">Iniciar sesión</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[2fr_1fr]">
            <section>
              <h2 className="font-display text-xl font-semibold">Cursos inscritos</h2>
              {enrollments.length ? (
                <ul className="mt-4 space-y-4">
                  {enrollments.map((e) => (
                    <li
                      key={e.id}
                      className="rounded-2xl border border-border bg-card p-5 shadow-soft"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-medium">{e.courses?.title}</p>
                        <span className="text-sm text-muted-foreground">
                          {Number(e.progress_percent)}%
                        </span>
                      </div>
                      <Progress value={Number(e.progress_percent)} className="mt-3" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                  Todavía no te has inscrito en ningún curso.
                </p>
              )}
            </section>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <h2 className="font-display text-lg font-semibold">Actividad reciente</h2>
                {activity.length ? (
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {activity.slice(0, 6).map((a) => (
                      <li key={a.id}>{a.lessons?.title ?? a.courses?.title ?? a.kind}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">Sin actividad todavía.</p>
                )}
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <h2 className="font-display text-lg font-semibold">Certificados</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Se emitirán automáticamente al completar un curso.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </PageShell>
  );
}
