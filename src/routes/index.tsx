import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Compass,
  FlaskConical,
  GraduationCap,
  Layers,
  PlayCircle,
  Quote,
  Sparkles,
} from "lucide-react";
import heroImage from "@/assets/hero-ai.jpg";
import { PageShell } from "@/components/layout/PageShell";
import { CourseCard } from "@/components/course/CourseCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { coursesQuery } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NeuraLab — Aprende Inteligencia Artificial desde cero" },
      {
        name: "description",
        content:
          "Academia online de inteligencia artificial para principiantes: cursos guiados, ejercicios prácticos y un laboratorio para experimentar con IA.",
      },
      { property: "og:title", content: "NeuraLab — Aprende IA desde cero" },
      {
        property: "og:description",
        content:
          "Cursos claros y prácticos de inteligencia artificial, con progreso, certificados y laboratorio de IA.",
      },
    ],
  }),
  component: Home,
});

const benefits = [
  {
    icon: Compass,
    title: "Ruta guiada",
    text: "Un itinerario claro paso a paso, sin tecnicismos innecesarios.",
  },
  {
    icon: Layers,
    title: "Contenido modular",
    text: "Módulos y lecciones cortas que encajan en tu día a día.",
  },
  {
    icon: FlaskConical,
    title: "Laboratorio IA",
    text: "Practica con herramientas reales sin salir de la plataforma.",
  },
  {
    icon: GraduationCap,
    title: "Certificados",
    text: "Acredita lo aprendido al completar cada curso.",
  },
];

const learnItems = [
  "Qué es la IA y cómo funciona realmente",
  "Escribir prompts que producen buenos resultados",
  "Usar ChatGPT, Gemini y Claude con criterio",
  "Generar imágenes, audio y vídeo con IA",
  "Automatizar tareas repetitivas del trabajo",
  "Evaluar riesgos, sesgos y privacidad",
];

const testimonials = [
  {
    name: "Marta Ruiz",
    role: "Diseñadora",
    text: "Partía de cero absoluto y en dos semanas ya usaba IA en mi trabajo diario.",
  },
  {
    name: "Javier Lorenzo",
    role: "Comercial",
    text: "Las lecciones son cortas y directas. Por fin una formación que no abruma.",
  },
  {
    name: "Ana Beltrán",
    role: "Docente",
    text: "El laboratorio para probar prompts es lo que marca la diferencia.",
  },
];

const faqs = [
  {
    q: "¿Necesito conocimientos previos?",
    a: "No. Los cursos están pensados para personas que parten desde cero o con conocimientos muy básicos.",
  },
  {
    q: "¿Cómo se estructura el aprendizaje?",
    a: "Cada curso se divide en módulos y lecciones cortas con vídeo, texto, ejercicios y recursos descargables.",
  },
  {
    q: "¿Puedo aprender a mi ritmo?",
    a: "Sí. Tu progreso se guarda automáticamente y puedes retomar la lección exactamente donde la dejaste.",
  },
  {
    q: "¿Obtengo un certificado?",
    a: "La plataforma emitirá certificados automáticos al completar el 100 % de un curso.",
  },
];

function Home() {
  const { data: courses = [] } = useQuery(coursesQuery());

  return (
    <PageShell>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 grid-backdrop" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-gradient-soft" aria-hidden />
        <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-5 pt-16 pb-20 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:pt-24 lg:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="secondary" className="mb-6 gap-2 rounded-full px-3 py-1.5">
              <Sparkles className="size-3.5" /> Nueva academia de IA
            </Badge>
            <h1 className="font-display text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Aprende inteligencia artificial <span className="text-gradient">desde cero</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Una academia clara, práctica y sin ruido. Formación guiada para entender la IA,
              aplicarla en tu trabajo y avanzar a tu propio ritmo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/courses">
                  Comenzar ahora <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/courses">
                  <PlayCircle className="size-4" /> Ver el curso
                </Link>
              </Button>
            </div>
            <dl className="mt-10 flex flex-wrap gap-8 text-sm">
              {[
                ["100 %", "Desde cero"],
                ["Módulos", "Aprendizaje guiado"],
                ["Laboratorio", "Práctica con IA"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="font-display text-2xl font-semibold">{value}</dt>
                  <dd className="text-muted-foreground">{label}</dd>
                </div>
              ))}
            </dl>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="relative"
          >
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-lift">
              <img
                src={heroImage}
                alt="Representación abstracta de una red neuronal"
                width={1600}
                height={1200}
                className="aspect-4/3 w-full object-cover"
              />
              <div className="flex items-center gap-3 border-t border-border p-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-secondary">
                  <BrainCircuit className="size-5 text-primary" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Fundamentos de IA</p>
                  <p className="text-xs text-muted-foreground">Vista previa del curso</p>
                </div>
                <Button size="sm" variant="secondary" className="ml-auto" asChild>
                  <Link to="/courses">Explorar</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto w-full max-w-7xl px-5 py-20">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">
            Una plataforma diseñada para que no te pierdas
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-2xl border border-border bg-card p-6 shadow-soft"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-secondary">
                  <b.icon className="size-5 text-primary" />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* QUÉ APRENDERÁS */}
      <section className="mx-auto w-full max-w-7xl px-5 py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">Qué aprenderás</h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Competencias reales y aplicables, explicadas con lenguaje sencillo y ejemplos
              concretos.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {learnItems.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CURSOS */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto w-full max-w-7xl px-5 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">Cursos destacados</h2>
            <Button variant="ghost" asChild>
              <Link to="/courses">
                Ver catálogo <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          {courses.length ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.slice(0, 3).map((course, i) => (
                <CourseCard key={course.id} course={course} index={i} />
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
              <p className="text-sm text-muted-foreground">
                El catálogo está listo. Los cursos aparecerán aquí en cuanto se publiquen desde el
                panel de administración.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* OPINIONES */}
      <section className="mx-auto w-full max-w-7xl px-5 py-20">
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">
          Lo que dicen los alumnos
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <Quote className="size-5 text-primary" />
              <blockquote className="mt-4 text-sm leading-relaxed">{t.text}</blockquote>
              <figcaption className="mt-6 text-sm">
                <span className="font-semibold">{t.name}</span>
                <span className="block text-muted-foreground">{t.role}</span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto w-full max-w-3xl px-5 py-20">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">Preguntas frecuentes</h2>
          <Accordion type="single" collapsible className="mt-8">
            {faqs.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent>{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-7xl px-5 py-20">
        <div className="rounded-3xl bg-gradient-brand p-10 text-center sm:p-16">
          <h2 className="font-display text-3xl font-semibold text-primary-foreground sm:text-4xl">
            Empieza hoy tu formación en IA
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/85">
            Crea tu cuenta gratis y accede al itinerario completo, tu progreso y el laboratorio de
            inteligencia artificial.
          </p>
          <Button size="lg" variant="secondary" className="mt-8" asChild>
            <Link to="/register">Crear cuenta gratis</Link>
          </Button>
        </div>
      </section>
    </PageShell>
  );
}
