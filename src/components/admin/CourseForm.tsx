import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/admin/Field";
import {
  courseLevelLabel,
  courseStatusLabel,
  errorMessage,
  slugify,
  updateCourse,
  type Category,
  type Course,
  type CourseLevel,
  type CourseStatus,
  type Instructor,
} from "@/lib/admin-api";

const NONE = "none";

export function CourseForm({
  course,
  categories,
  instructors,
}: {
  course: Course;
  categories: Category[];
  instructors: Instructor[];
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: course.title,
    subtitle: course.subtitle ?? "",
    slug: course.slug,
    description: course.description ?? "",
    cover_url: course.cover_url ?? "",
    level: course.level,
    category_id: course.category_id ?? NONE,
    instructor_id: course.instructor_id ?? NONE,
    price: (course.price_cents / 100).toString(),
    currency: course.currency,
    duration_minutes: course.duration_minutes.toString(),
    language: course.language,
    tags: course.tags.join(", "),
    is_featured: course.is_featured,
    status: course.status,
    published_at: course.published_at ? course.published_at.slice(0, 10) : "",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const mutation = useMutation({
    mutationFn: () =>
      updateCourse(course.id, {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        slug: slugify(form.slug) || slugify(form.title),
        description: form.description.trim() || null,
        cover_url: form.cover_url.trim() || null,
        level: form.level,
        category_id: form.category_id === NONE ? null : form.category_id,
        instructor_id: form.instructor_id === NONE ? null : form.instructor_id,
        price_cents: Math.round(Number(form.price || 0) * 100),
        currency: form.currency,
        duration_minutes: Number(form.duration_minutes || 0),
        language: form.language,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        is_featured: form.is_featured,
        status: form.status,
        published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      void queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Curso guardado.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Título" htmlFor="title">
          <Input
            id="title"
            value={form.title}
            onChange={(event) => set("title", event.target.value)}
            required
          />
        </Field>

        <Field label="Subtítulo" htmlFor="subtitle">
          <Input
            id="subtitle"
            value={form.subtitle}
            onChange={(event) => set("subtitle", event.target.value)}
          />
        </Field>

        <Field label="Slug" htmlFor="slug" hint="Se genera automáticamente desde el título.">
          <div className="flex gap-2">
            <Input
              id="slug"
              value={form.slug}
              onChange={(event) => set("slug", event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => set("slug", slugify(form.title))}
            >
              Generar
            </Button>
          </div>
        </Field>

        <Field label="Imagen de portada (URL)" htmlFor="cover">
          <Input
            id="cover"
            value={form.cover_url}
            onChange={(event) => set("cover_url", event.target.value)}
            placeholder="https://…"
          />
        </Field>

        <Field label="Descripción" htmlFor="description" className="md:col-span-2">
          <Textarea
            id="description"
            rows={5}
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
          />
        </Field>

        <Field label="Nivel">
          <Select value={form.level} onValueChange={(value) => set("level", value as CourseLevel)}>
            <SelectTrigger aria-label="Nivel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(courseLevelLabel).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Categoría">
          <Select value={form.category_id} onValueChange={(value) => set("category_id", value)}>
            <SelectTrigger aria-label="Categoría">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Sin categoría</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Profesor">
          <Select value={form.instructor_id} onValueChange={(value) => set("instructor_id", value)}>
            <SelectTrigger aria-label="Profesor">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Sin asignar</SelectItem>
              {instructors.map((instructor) => (
                <SelectItem key={instructor.id} value={instructor.id}>
                  {instructor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Idioma" htmlFor="language">
          <Input
            id="language"
            value={form.language}
            onChange={(event) => set("language", event.target.value)}
            placeholder="es"
          />
        </Field>

        <Field label={`Precio (${form.currency})`} htmlFor="price" hint="0 = curso gratuito.">
          <Input
            id="price"
            type="number"
            min={0}
            step="0.01"
            value={form.price}
            onChange={(event) => set("price", event.target.value)}
          />
        </Field>

        <Field label="Duración estimada (minutos)" htmlFor="duration">
          <Input
            id="duration"
            type="number"
            min={0}
            value={form.duration_minutes}
            onChange={(event) => set("duration_minutes", event.target.value)}
          />
        </Field>

        <Field
          label="Etiquetas"
          htmlFor="tags"
          hint="Separadas por comas."
          className="md:col-span-2"
        >
          <Input
            id="tags"
            value={form.tags}
            onChange={(event) => set("tags", event.target.value)}
            placeholder="prompting, automatización"
          />
        </Field>

        <Field label="Estado">
          <Select
            value={form.status}
            onValueChange={(value) => set("status", value as CourseStatus)}
          >
            <SelectTrigger aria-label="Estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(courseStatusLabel).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Fecha de publicación" htmlFor="published-at">
          <Input
            id="published-at"
            type="date"
            value={form.published_at}
            onChange={(event) => set("published_at", event.target.value)}
          />
        </Field>

        <div className="flex items-center gap-3 md:col-span-2">
          <Switch
            id="featured"
            checked={form.is_featured}
            onCheckedChange={(checked) => set("is_featured", checked)}
          />
          <label htmlFor="featured" className="text-sm">
            Curso destacado
          </label>
        </div>
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
