import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { CourseCard } from "@/components/course/CourseCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { categoriesQuery, coursesQuery } from "@/lib/api";

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "Catálogo de cursos de IA — NeuraLab" },
      {
        name: "description",
        content:
          "Explora todos los cursos de inteligencia artificial de NeuraLab: fundamentos, prompts, imagen, audio y automatización.",
      },
      { property: "og:title", content: "Catálogo de cursos de IA — NeuraLab" },
      {
        property: "og:description",
        content: "Cursos de inteligencia artificial para todos los niveles, desde cero.",
      },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const { data: courses = [], isLoading } = useQuery(coursesQuery({ category, search }));
  const { data: categories = [] } = useQuery(categoriesQuery());

  return (
    <PageShell>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto w-full max-w-7xl px-5 py-14">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Catálogo de cursos
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Formación en inteligencia artificial estructurada por niveles y áreas de aplicación.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cursos…"
                className="pl-9"
                aria-label="Buscar cursos"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={category === null ? "default" : "outline"}
                onClick={() => setCategory(null)}
              >
                Todos
              </Button>
              {categories.map((c) => (
                <Button
                  key={c.id}
                  size="sm"
                  variant={category === c.slug ? "default" : "outline"}
                  onClick={() => setCategory(c.slug)}
                >
                  {c.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-14">
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : courses.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course, i) => (
              <CourseCard key={course.id} course={course} index={i} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <h2 className="font-display text-xl font-semibold">Aún no hay cursos publicados</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              La estructura está lista: crea cursos, módulos y lecciones desde el panel de
              administración y aparecerán aquí automáticamente.
            </p>
          </div>
        )}
      </section>
    </PageShell>
  );
}
