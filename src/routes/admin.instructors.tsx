import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RequireRole } from "@/components/auth/RouteGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/admin/Field";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  adminInstructorsQuery,
  createInstructor,
  deleteInstructor,
  errorMessage,
  updateInstructor,
  type Instructor,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/instructors")({
  head: () => ({
    meta: [
      { title: "Profesores — NeuraLab" },
      { name: "description", content: "Gestiona el equipo docente de la academia." },
      { property: "og:title", content: "Profesores — NeuraLab" },
      { property: "og:description", content: "CMS de profesores de NeuraLab." },
    ],
  }),
  component: AdminInstructorsPage,
});

type Draft = {
  id?: string;
  name: string;
  title: string;
  avatar_url: string;
  bio: string;
  specialties: string;
  website: string;
  linkedin: string;
  x: string;
  is_active: boolean;
};

const emptyDraft: Draft = {
  name: "",
  title: "",
  avatar_url: "",
  bio: "",
  specialties: "",
  website: "",
  linkedin: "",
  x: "",
  is_active: true,
};

function linkValue(links: unknown, key: string): string {
  if (links && typeof links === "object" && key in links) {
    const value = (links as Record<string, unknown>)[key];
    return typeof value === "string" ? value : "";
  }
  return "";
}

function AdminInstructorsPage() {
  return (
    <RequireRole roles={["admin"]}>
      <AdminInstructorsContent />
    </RequireRole>
  );
}

function AdminInstructorsContent() {
  const queryClient = useQueryClient();
  const { data: instructors = [], isLoading } = useQuery(adminInstructorsQuery());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [toDelete, setToDelete] = useState<Instructor | null>(null);

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["admin"] });

  const save = useMutation({
    mutationFn: async (value: Draft) => {
      const values = {
        name: value.name.trim(),
        title: value.title.trim() || null,
        avatar_url: value.avatar_url.trim() || null,
        bio: value.bio.trim() || null,
        specialties: value.specialties
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        links: {
          website: value.website.trim(),
          linkedin: value.linkedin.trim(),
          x: value.x.trim(),
        },
        is_active: value.is_active,
      };
      return value.id ? updateInstructor(value.id, values) : createInstructor(values);
    },
    onSuccess: () => {
      invalidate();
      setDraft(null);
      toast.success("Profesor guardado.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteInstructor(id),
    onSuccess: () => {
      invalidate();
      setToDelete(null);
      toast.success("Profesor eliminado.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setDraft(emptyDraft)}>
          <Plus className="size-4" /> Nuevo profesor
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {instructors.map((instructor) => (
            <li
              key={instructor.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft"
            >
              <div className="flex items-center gap-3">
                <h2 className="font-display font-semibold">{instructor.name}</h2>
                <Badge variant={instructor.is_active ? "default" : "outline"}>
                  {instructor.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              {instructor.title ? (
                <p className="mt-1 text-sm text-muted-foreground">{instructor.title}</p>
              ) : null}
              {instructor.specialties.length ? (
                <div className="mt-3 flex flex-wrap gap-1">
                  {instructor.specialties.map((item) => (
                    <Badge key={item} variant="secondary">
                      {item}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <p className="mt-3 text-xs text-muted-foreground">
                {instructor.courses?.[0]?.count ?? 0} cursos
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft({
                      id: instructor.id,
                      name: instructor.name,
                      title: instructor.title ?? "",
                      avatar_url: instructor.avatar_url ?? "",
                      bio: instructor.bio ?? "",
                      specialties: instructor.specialties.join(", "),
                      website: linkValue(instructor.links, "website"),
                      linkedin: linkValue(instructor.links, "linkedin"),
                      x: linkValue(instructor.links, "x"),
                      is_active: instructor.is_active,
                    })
                  }
                >
                  <Pencil className="size-4" /> Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setToDelete(instructor)}>
                  <Trash2 className="size-4" /> Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Editar profesor" : "Nuevo profesor"}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="space-y-4">
              <Field label="Nombre" htmlFor="ins-name">
                <Input
                  id="ins-name"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </Field>
              <Field label="Cargo" htmlFor="ins-title">
                <Input
                  id="ins-title"
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                />
              </Field>
              <Field label="Fotografía (URL)" htmlFor="ins-avatar">
                <Input
                  id="ins-avatar"
                  value={draft.avatar_url}
                  onChange={(event) => setDraft({ ...draft, avatar_url: event.target.value })}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Biografía" htmlFor="ins-bio">
                <Textarea
                  id="ins-bio"
                  rows={4}
                  value={draft.bio}
                  onChange={(event) => setDraft({ ...draft, bio: event.target.value })}
                />
              </Field>
              <Field label="Especialidades" htmlFor="ins-specialties" hint="Separadas por comas.">
                <Input
                  id="ins-specialties"
                  value={draft.specialties}
                  onChange={(event) => setDraft({ ...draft, specialties: event.target.value })}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Web" htmlFor="ins-website">
                  <Input
                    id="ins-website"
                    value={draft.website}
                    onChange={(event) => setDraft({ ...draft, website: event.target.value })}
                  />
                </Field>
                <Field label="LinkedIn" htmlFor="ins-linkedin">
                  <Input
                    id="ins-linkedin"
                    value={draft.linkedin}
                    onChange={(event) => setDraft({ ...draft, linkedin: event.target.value })}
                  />
                </Field>
                <Field label="X" htmlFor="ins-x">
                  <Input
                    id="ins-x"
                    value={draft.x}
                    onChange={(event) => setDraft({ ...draft, x: event.target.value })}
                  />
                </Field>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="ins-active"
                  checked={draft.is_active}
                  onCheckedChange={(checked) => setDraft({ ...draft, is_active: checked })}
                />
                <label htmlFor="ins-active" className="text-sm">
                  Activo
                </label>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!draft?.name.trim() || save.isPending}
              onClick={() => draft && save.mutate(draft)}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Eliminar profesor"
        description={`Se eliminará "${toDelete?.name ?? ""}". Los cursos quedarán sin profesor asignado.`}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  );
}
