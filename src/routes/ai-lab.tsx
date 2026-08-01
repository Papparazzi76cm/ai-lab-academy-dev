import { createFileRoute, Link } from "@tanstack/react-router";
import { FlaskConical, Lock } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { aiLabModules, aiProviders } from "@/lib/ai/providers";

export const Route = createFileRoute("/ai-lab")({
  head: () => ({
    meta: [
      { title: "Laboratorio de IA — NeuraLab" },
      {
        name: "description",
        content:
          "Compara modelos, genera prompts y practica con herramientas de IA sin salir de la plataforma.",
      },
      { property: "og:title", content: "Laboratorio de IA — NeuraLab" },
      {
        property: "og:description",
        content: "Playground, comparador de modelos y biblioteca de prompts.",
      },
    ],
  }),
  component: AiLabPage,
});

function AiLabPage() {
  return (
    <PageShell>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto w-full max-w-7xl px-5 py-14">
          <Badge variant="secondary" className="gap-2">
            <FlaskConical className="size-3.5" /> Próximamente
          </Badge>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Laboratorio de IA
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Un espacio para experimentar con inteligencia artificial dentro de la academia. La
            arquitectura ya está preparada: sólo falta activar los proveedores.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-14">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {aiLabModules.map((m) => (
            <div key={m.id} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-semibold">{m.title}</h2>
                <Lock className="ml-auto size-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{m.description}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-16 font-display text-2xl font-semibold">Proveedores preparados</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {aiProviders.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <p className="font-medium">{p.name}</p>
                <Badge variant="outline">{p.enabled ? "Activo" : "Pendiente"}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-3xl bg-gradient-brand p-10 text-center">
          <p className="font-display text-2xl font-semibold text-primary-foreground">
            Mientras tanto, empieza por los fundamentos
          </p>
          <Button variant="secondary" className="mt-6" asChild>
            <Link to="/courses">Ver cursos</Link>
          </Button>
        </div>
      </section>
    </PageShell>
  );
}
