import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Download } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { BlockRenderer } from "@/components/lesson/BlockRenderer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { courseQuery, formatDuration, lessonQuery, myProgressQuery } from "@/lib/api";
import { parseBlocks } from "@/lib/blocks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/learn/$courseSlug/$lessonSlug")({
  head: () => ({
    meta: [
      { title: "Lección — NeuraLab" },
      { name: "description", content: "Aula del curso: vídeo, contenido, recursos y ejercicios." },
      { property: "og:title", content: "Lección — NeuraLab" },
      { property: "og:description", content: "Contenido de la lección y recursos descargables." },
    ],
  }),
  component: LessonPage,
});

function LessonPage() {
  const { courseSlug, lessonSlug } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: course } = useQuery(courseQuery(courseSlug));
  const { data: current } = useQuery(lessonQuery(courseSlug, lessonSlug));
  const { data: progress = [] } = useQuery(myProgressQuery(user?.id, course?.id));

  const flatLessons = useMemo(() => {
    const modules = [...(course?.modules ?? [])].sort((a, b) => a.position - b.position);
    return modules.flatMap((m) =>
      [...(m.lessons ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((l) => ({ ...l, moduleTitle: m.title })),
    );
  }, [course]);

  const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.lesson_id));
  const index = flatLessons.findIndex((l) => l.slug === lessonSlug);
  const prev = index > 0 ? flatLessons[index - 1] : null;
  const next = index >= 0 && index < flatLessons.length - 1 ? flatLessons[index + 1] : null;
  const percent = flatLessons.length
    ? Math.round((completedIds.size / flatLessons.length) * 100)
    : 0;

  async function markComplete() {
    if (!user || !current) {
      toast.error("Inicia sesión para guardar tu progreso");
      return;
    }
    const { error } = await supabase.from("lesson_progress").upsert(
      {
        user_id: user.id,
        lesson_id: current.lesson.id,
        course_id: current.course.id,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" },
    );
    if (error) {
      toast.error("No se pudo guardar el progreso");
      return;
    }
    toast.success("Lección completada");
    queryClient.invalidateQueries({ queryKey: ["progress"] });
  }

  const blocks = parseBlocks(current?.lesson.content);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto grid w-full max-w-[1400px] gap-8 px-5 py-8 lg:grid-cols-[300px_1fr]">
        {/* SIDEBAR */}
        <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <Link
              to="/courses/$slug"
              params={{ slug: courseSlug }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← {course?.title ?? "Curso"}
            </Link>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progreso</span>
                <span>{percent}%</span>
              </div>
              <Progress value={percent} className="mt-2" />
            </div>

            <nav className="mt-6 space-y-5">
              {[...(course?.modules ?? [])]
                .sort((a, b) => a.position - b.position)
                .map((mod) => (
                  <div key={mod.id}>
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {mod.title}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {[...(mod.lessons ?? [])]
                        .sort((a, b) => a.position - b.position)
                        .map((lesson) => (
                          <li key={lesson.id}>
                            <Link
                              to="/learn/$courseSlug/$lessonSlug"
                              params={{ courseSlug, lessonSlug: lesson.slug }}
                              className={cn(
                                "flex items-start gap-2 rounded-lg px-2 py-2 text-sm hover:bg-secondary",
                                lesson.slug === lessonSlug && "bg-secondary font-medium",
                              )}
                            >
                              {completedIds.has(lesson.id) ? (
                                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                              ) : (
                                <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                              )}
                              <span className="flex-1">{lesson.title}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDuration(lesson.duration_minutes)}
                              </span>
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
            </nav>
          </div>
        </aside>

        {/* CONTENIDO */}
        <main className="min-w-0">
          {current ? (
            <article className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-10">
              <h1 className="font-display text-3xl font-semibold">{current.lesson.title}</h1>
              {current.lesson.summary && (
                <p className="mt-3 text-muted-foreground">{current.lesson.summary}</p>
              )}

              {current.lesson.video_url && (
                <div className="mt-8 aspect-video overflow-hidden rounded-xl border border-border bg-black">
                  <iframe
                    src={current.lesson.video_url}
                    title={current.lesson.title}
                    allowFullScreen
                    className="size-full"
                  />
                </div>
              )}

              <div className="mt-8">
                <BlockRenderer blocks={blocks} />
              </div>

              {current.lesson.resources?.length > 0 && (
                <section className="mt-10 rounded-xl border border-border p-5">
                  <h2 className="font-display text-lg font-semibold">Recursos y descargas</h2>
                  <ul className="mt-4 space-y-2">
                    {current.lesson.resources.map((r) => (
                      <li key={r.id}>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <Download className="size-4" /> {r.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-6">
                <Button variant="outline" disabled={!prev} asChild={Boolean(prev)}>
                  {prev ? (
                    <Link
                      to="/learn/$courseSlug/$lessonSlug"
                      params={{ courseSlug, lessonSlug: prev.slug }}
                    >
                      <ArrowLeft className="size-4" /> Anterior
                    </Link>
                  ) : (
                    <span>
                      <ArrowLeft className="size-4" /> Anterior
                    </span>
                  )}
                </Button>
                <Button onClick={markComplete}>
                  <CheckCircle2 className="size-4" /> Marcar como completada
                </Button>
                <Button
                  variant="outline"
                  className="ml-auto"
                  disabled={!next}
                  asChild={Boolean(next)}
                >
                  {next ? (
                    <Link
                      to="/learn/$courseSlug/$lessonSlug"
                      params={{ courseSlug, lessonSlug: next.slug }}
                    >
                      Siguiente <ArrowRight className="size-4" />
                    </Link>
                  ) : (
                    <span>
                      Siguiente <ArrowRight className="size-4" />
                    </span>
                  )}
                </Button>
              </div>
            </article>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-16 text-center text-sm text-muted-foreground">
              Lección no encontrada.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
