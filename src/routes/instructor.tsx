import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { HelpCircle, LayoutDashboard } from "lucide-react";
import { RequireRole } from "@/components/auth/RouteGuard";
import { PageShell } from "@/components/layout/PageShell";

export const Route = createFileRoute("/instructor")({
  component: InstructorLayout,
});

const navItems = [
  { to: "/instructor/quizzes", label: "Mis Cuestionarios", icon: HelpCircle },
] as const;

function InstructorLayout() {
  return (
    <RequireRole roles={["instructor", "admin"]}>
      <InstructorChrome />
    </RequireRole>
  );
}

function InstructorChrome() {
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-7xl px-5 py-10">
        <header>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Panel de Profesor
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gestiona los cuestionarios y consulta los resultados de tus estudiantes.
          </p>
        </header>

        <nav className="mt-6 flex flex-wrap gap-2 border-b border-border pb-4">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
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
