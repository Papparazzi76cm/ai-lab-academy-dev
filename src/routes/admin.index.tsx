import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, FolderTree, Layers, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { adminRecentChangesQuery, adminStatsQuery } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Panel de administración — NeuraLab" },
      {
        name: "description",
        content: "Resumen del CMS: cursos, categorías, profesores, módulos y lecciones.",
      },
      { property: "og:title", content: "Panel de administración — NeuraLab" },
      { property: "og:description", content: "Resumen y últimos cambios del CMS académico." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: stats, isLoading } = useQuery(adminStatsQuery());
  const { data: changes = [], isLoading: loadingChanges } = useQuery(adminRecentChangesQuery());

  const cards = [
    { label: "Cursos", value: stats?.courses, icon: BookOpen },
    { label: "Publicados", value: stats?.published, icon: BookOpen },
    { label: "Borradores", value: stats?.drafts, icon: BookOpen },
    { label: "Archivados", value: stats?.archived, icon: BookOpen },
    { label: "Categorías", value: stats?.categories, icon: FolderTree },
    { label: "Profesores", value: stats?.instructors, icon: Users },
    { label: "Módulos", value: stats?.modules, icon: Layers },
    { label: "Lecciones", value: stats?.lessons, icon: Layers },
  ];

  return (
    <div className="space-y-10">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-border bg-card p-5 shadow-soft"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-secondary">
              <card.icon className="size-4 text-primary" />
            </span>
            <p className="mt-4 text-sm text-muted-foreground">{card.label}</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-8 w-14" />
            ) : (
              <p className="font-display text-3xl font-semibold">{card.value ?? 0}</p>
            )}
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="font-display text-xl font-semibold">Últimos cambios</h2>
        {loadingChanges ? (
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : changes.length ? (
          <ul className="mt-4 divide-y divide-border">
            {changes.map((change) => (
              <li key={`${change.type}-${change.id}`} className="flex items-center gap-3 py-3">
                <Badge variant="secondary">{change.type}</Badge>
                <Link
                  to="/admin/courses/$courseId"
                  params={{ courseId: change.courseId }}
                  className="truncate text-sm hover:underline"
                >
                  {change.title}
                </Link>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {new Date(change.updatedAt).toLocaleString("es-ES")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Todavía no hay actividad registrada.</p>
        )}
      </section>
    </div>
  );
}
