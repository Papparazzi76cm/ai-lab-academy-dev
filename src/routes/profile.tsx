import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/auth/RouteGuard";
import { PageShell } from "@/components/layout/PageShell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { profileQuery } from "@/lib/api";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Perfil del alumno — NeuraLab" },
      { name: "description", content: "Tu perfil de alumno: datos, objetivos y certificados." },
      { property: "og:title", content: "Perfil del alumno — NeuraLab" },
      { property: "og:description", content: "Información y logros de tu cuenta." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <RequireAuth>
      <ProfilePageContent />
    </RequireAuth>
  );
}

function ProfilePageContent() {
  const { user } = useAuth();
  const { data: profile } = useQuery(profileQuery(user?.id));
  const name = profile?.full_name ?? user?.email ?? "Invitado";

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-3xl px-5 py-14">
        <h1 className="font-display text-4xl font-bold tracking-tight">Perfil</h1>
        <div className="mt-8 flex items-center gap-5 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <Avatar className="size-16">
            <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-display text-xl font-semibold">{name}</p>
            <p className="text-sm text-muted-foreground">
              {profile?.headline ?? "Alumno de NeuraLab"}
            </p>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-lg font-semibold">Sobre mí</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {profile?.bio ?? "Añade una biografía desde Configuración."}
          </p>
        </div>
      </div>
    </PageShell>
  );
}
