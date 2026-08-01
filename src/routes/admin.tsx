import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { BookOpen, FolderTree, LayoutDashboard, Users } from "lucide-react";
import { RequireRole } from "@/components/auth/RouteGuard";
import { PageShell } from "@/components/layout/PageShell";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const navItems = [
  { to: "/admin", label: "Resumen", icon: LayoutDashboard, exact: true },
  { to: "/admin/courses", label: "Cursos", icon: BookOpen },
  { to: "/admin/categories", label: "Categorías", icon: FolderTree, adminOnly: true },
  { to: "/admin/instructors", label: "Profesores", icon: Users, adminOnly: true },
] as const;

function AdminLayout() {
  return (
    <RequireRole roles={["admin", "instructor"]}>
      <AdminChrome />
    </RequireRole>
  );
}

function AdminChrome() {
  const { isAdmin } = useAuth();
  const items = navItems.filter((item) => isAdmin || !("adminOnly" in item && item.adminOnly));

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-7xl px-5 py-10">
        <header>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Administración
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isAdmin ? "Centro de control de la academia." : "Gestiona los cursos que impartes."}
          </p>
        </header>

        <nav className="mt-6 flex flex-wrap gap-2 border-b border-border pb-4">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: "exact" in item ? item.exact : false }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary"
              activeProps={{ className: "bg-secondary text-foreground font-medium" }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="py-8">
          <Outlet />
        </div>
      </div>
    </PageShell>
  );
}
