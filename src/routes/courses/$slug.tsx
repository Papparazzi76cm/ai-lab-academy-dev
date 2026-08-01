import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Clock, Star, Users } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { courseQuery, formatDuration, formatPrice, levelLabel } from "@/lib/api";

export const Route = createFileRoute("/courses/$slug")({
  head: () => ({
    meta: [
      { title: "Curso — NeuraLab" },
      {
        name: "description",
        content: "Detalle del curso: temario, módulos, lecciones y recursos.",
      },
      { property: "og:title", content: "Curso — NeuraLab" },
      { property: "og:description", content: "Temario completo, módulos y lecciones del curso." },
    ],
  }),
  component: CourseDetail,
});

function CourseDetail() {
  const { slug } = Route.useParams();
  const { data: course, isLoading } = useQuery(courseQuery(slug));

  if (isLoading) {
    return (
      <PageShell>
        <div className="mx-auto max-w-5xl px-5 py-20">
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      </PageShell>
    );
  }

  if (!course) {
    return (
      <PageShell>
        <div className="mx-auto max-w-2xl px-5 py-24 text-center">
          <h1 className="font-display text-2xl font-semibold">Curso no encontrado</h1>
          <Button className="mt-6" asChild>
            <Link to="/courses">Volver al catálogo</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const modules = [...(course.modules ?? [])].sort((a, b) => a.position - b.position);
  const firstLesson = modules
    .flatMap((m) => m.lessons ?? [])
    .sort((a, b) => a.position - b.position)[0];

  return (
    <PageShell>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <Badge variant="secondary">{levelLabel[course.level] ?? course.level}</Badge>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              {course.title}
            </h1>
            {course.subtitle && (
              <p className="mt-4 text-lg text-muted-foreground">{course.subtitle}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" /> {formatDuration(course.duration_minutes)}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="size-4" /> {course.students_count} alumnos
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="size-4" /> {course.rating || "—"} ({course.ratings_count})
              </span>
            </div>
            {course.description && (
              <p className="mt-8 leading-relaxed text-foreground/90">{course.description}</p>
            )}

            {course.what_you_learn?.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display text-2xl font-semibold">Qué aprenderás</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {course.what_you_learn.map((item) => (
                    <li key={item} className="text-sm text-muted-foreground">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-12">
              <h2 className="font-display text-2xl font-semibold">Temario</h2>
              {modules.length ? (
                <Accordion type="multiple" className="mt-4">
                  {modules.map((mod) => (
                    <AccordionItem key={mod.id} value={mod.id}>
                      <AccordionTrigger className="text-left">{mod.title}</AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-2">
                          {[...(mod.lessons ?? [])]
                            .sort((a, b) => a.position - b.position)
                            .map((lesson) => (
                              <li key={lesson.id}>
                                <Link
                                  to="/learn/$courseSlug/$lessonSlug"
                                  params={{ courseSlug: course.slug, lessonSlug: lesson.slug }}
                                  className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-secondary"
                                >
                                  <BookOpen className="size-4 text-muted-foreground" />
                                  {lesson.title}
                                  <span className="ml-auto text-xs text-muted-foreground">
                                    {formatDuration(lesson.duration_minutes)}
                                  </span>
                                </Link>
                              </li>
                            ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">
                  El temario se publicará próximamente.
                </p>
              )}
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              <div className="aspect-video bg-gradient-brand">
                {course.cover_url && (
                  <img
                    src={course.cover_url}
                    alt={course.title}
                    className="size-full object-cover"
                  />
                )}
              </div>
              <div className="p-6">
                <p className="font-display text-2xl font-semibold">
                  {formatPrice(course.price_cents, course.currency)}
                </p>
                <Button className="mt-5 w-full" size="lg" asChild disabled={!firstLesson}>
                  {firstLesson ? (
                    <Link
                      to="/learn/$courseSlug/$lessonSlug"
                      params={{ courseSlug: course.slug, lessonSlug: firstLesson.slug }}
                    >
                      Empezar curso
                    </Link>
                  ) : (
                    <span>Próximamente</span>
                  )}
                </Button>
                {course.instructors && (
                  <div className="mt-6 border-t border-border pt-5 text-sm">
                    <p className="font-semibold">{course.instructors.name}</p>
                    <p className="text-muted-foreground">{course.instructors.title}</p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {course.faqs?.length > 0 && (
        <section className="mx-auto w-full max-w-3xl px-5 py-16">
          <h2 className="font-display text-2xl font-semibold">Preguntas frecuentes</h2>
          <Accordion type="single" collapsible className="mt-6">
            {course.faqs.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}
    </PageShell>
  );
}
