import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, Clock, Play, Sparkles, Trophy } from "lucide-react";
import { RequireAuth } from "@/components/auth/RouteGuard";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { fetchUserDashboardStats } from "@/lib/learning-engine/analytics";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Mi aprendizaje — AI Lab Academy" },
      {
        name: "description",
        content: "Tus cursos, tu progreso y tu actividad reciente en AI Lab Academy.",
      },
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

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["user-dashboard-stats", user?.id],
    queryFn: () => fetchUserDashboardStats(user?.id || ""),
    enabled: Boolean(user?.id),
  });

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:py-14">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Mi aprendizaje
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sigue tu progreso y continúa donde lo dejaste.
            </p>
          </div>
        </div>

        {!user && !loading ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">Inicia sesión para ver tu progreso.</p>
            <Button className="mt-5" asChild>
              <Link to="/login">Iniciar sesión</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            {/* Quick Metrics */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <BookOpen className="size-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Cursos Activos
                  </span>
                </div>
                <p className="mt-3 font-display text-2xl font-bold">
                  {isStatsLoading ? "..." : stats?.activeCoursesCount || 0}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                    <Trophy className="size-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Completados
                  </span>
                </div>
                <p className="mt-3 font-display text-2xl font-bold">
                  {isStatsLoading ? "..." : stats?.completedCoursesCount || 0}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                    <Clock className="size-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Horas de Estudio
                  </span>
                </div>
                <p className="mt-3 font-display text-2xl font-bold">
                  {isStatsLoading ? "..." : `${stats?.totalHoursStudied || 0} h`}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
                    <Sparkles className="size-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Lecciones Hechas
                  </span>
                </div>
                <p className="mt-3 font-display text-2xl font-bold">
                  {isStatsLoading ? "..." : stats?.completedLessonsCount || 0}
                </p>
              </div>
            </div>

            {/* Main Sections Grid */}
            <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
              <section className="space-y-6">
                <h2 className="font-display text-xl font-semibold">Continuar aprendiendo</h2>

                {stats?.activeCourses.length ? (
                  <div className="space-y-4">
                    {stats.activeCourses.map((c) => (
                      <div
                        key={c.courseId}
                        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-2 flex-1">
                          <h3 className="font-semibold text-foreground">{c.title}</h3>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>
                              {c.completedLessons} de {c.totalLessons} lecciones
                            </span>
                            <span>•</span>
                            <span>{c.percentage}% completado</span>
                          </div>
                          <Progress value={c.percentage} className="h-2" />
                        </div>

                        <Button asChild size="sm" className="gap-2 shrink-0">
                          <Link to="/courses/$slug" params={{ slug: c.slug }}>
                            <Play className="size-3.5 fill-current" />
                            Continuar
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                    <p>No tienes cursos activos en este momento.</p>
                    <Button asChild variant="outline" className="mt-4">
                      <Link to="/courses">Explorar catálogo</Link>
                    </Button>
                  </div>
                )}

                {/* Completed Courses */}
                {Boolean(stats?.completedCourses.length) && (
                  <div className="pt-6 space-y-4">
                    <h2 className="font-display text-xl font-semibold">Cursos completados</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {stats?.completedCourses.map((c) => (
                        <div
                          key={c.courseId}
                          className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-soft space-y-2"
                        >
                          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                            <CheckCircle2 className="size-4" />
                            <span>Completado</span>
                          </div>
                          <h3 className="font-medium text-foreground">{c.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            {c.totalLessons} lecciones finalizadas
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Sidebar */}
              <aside className="space-y-6">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <h2 className="font-display text-lg font-semibold">Esta semana</h2>
                  <p className="mt-2 text-2xl font-bold text-primary">
                    {stats?.timeThisWeekMinutes || 0} min
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tiempo total de estudio activo acumulado en los últimos 7 días.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
