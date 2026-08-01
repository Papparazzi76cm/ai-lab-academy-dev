import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/auth/RouteGuard";
import { PageShell } from "@/components/layout/PageShell";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { myEnrollmentsQuery, profileQuery } from "@/lib/api";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progreso — NeuraLab" },
      { name: "description", content: "Tu progreso, racha diaria y tiempo total de estudio." },
      { property: "og:title", content: "Progreso — NeuraLab" },
      { property: "og:description", content: "Métricas de aprendizaje y objetivos diarios." },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  return (
    <RequireAuth>
      <ProgressPageContent />
    </RequireAuth>
  );
}

function ProgressPageContent() {
  const { user } = useAuth();
  const { data: profile } = useQuery(profileQuery(user?.id));
  const { data: enrollments = [] } = useQuery(myEnrollmentsQuery(user?.id));

  const stats = [
    { label: "Racha diaria", value: `${profile?.streak_days ?? 0} días` },
    { label: "Objetivo diario", value: `${profile?.daily_goal_minutes ?? 20} min` },
    { label: "Cursos activos", value: String(enrollments.length) },
  ];

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-5xl px-5 py-14">
        <h1 className="font-display text-4xl font-bold tracking-tight">Progreso</h1>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="mt-2 font-display text-2xl font-semibold">{s.value}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 font-display text-xl font-semibold">Progreso por curso</h2>
        <div className="mt-4 space-y-4">
          {enrollments.length ? (
            enrollments.map((e) => (
              <div key={e.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex justify-between text-sm">
                  <span>{e.courses?.title}</span>
                  <span className="text-muted-foreground">{Number(e.progress_percent)}%</span>
                </div>
                <Progress value={Number(e.progress_percent)} className="mt-3" />
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Aún no hay datos de progreso.
            </p>
          )}
        </div>
      </div>
    </PageShell>
  );
}
