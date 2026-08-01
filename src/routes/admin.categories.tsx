import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RequireRole } from "@/components/auth/RouteGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  adminCategoriesQuery,
  createCategory,
  deleteCategory,
  errorMessage,
  slugify,
  updateCategory,
  type Category,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({
    meta: [
      { title: "Categorías — NeuraLab" },
      { name: "description", content: "Gestiona las categorías del catálogo de cursos." },
      { property: "og:title", content: "Categorías — NeuraLab" },
      { property: "og:description", content: "CMS de categorías de NeuraLab." },
    ],
  }),
  component: AdminCategoriesPage,
});

type Draft = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  position: string;
};

const emptyDraft: Draft = {
  name: "",
  slug: "",
  description: "",
  icon: "",
  color: "",
  position: "0",
};

function AdminCategoriesPage() {
  return (
    <RequireRole roles={["admin"]}>
      <AdminCategoriesContent />
    </RequireRole>
  );
}

function AdminCategoriesContent() {
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading } = useQuery(adminCategoriesQuery());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["admin"] });

  const save = useMutation({
    mutationFn: async (value: Draft) => {
      const values = {
        name: value.name.trim(),
        slug: slugify(value.slug) || slugify(value.name),
        description: value.description.trim() || null,
        icon: value.icon.trim() || null,
        color: value.color.trim() || null,
        position: Number(value.position || 0),
      };
      return value.id ? updateCategory(value.id, values) : createCategory(values);
    },
    onSuccess: () => {
      invalidate();
      setDraft(null);
      toast.success("Categoría guardada.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      invalidate();
      setToDelete(null);
      toast.success("Categoría eliminada.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setDraft(emptyDraft)}>
          <Plus className="size-4" /> Nueva categoría
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li
              key={category.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft"
            >
              <div className="flex items-center gap-2">
                <span
                  className="size-3 rounded-full border border-border"
                  style={category.color ? { backgroundColor: category.color } : undefined}
                />
                <h2 className="font-display font-semibold">{category.name}</h2>
                <span className="ml-auto text-xs text-muted-foreground">#{category.position}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">/{category.slug}</p>
              {category.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{category.description}</p>
              ) : null}
              <p className="mt-3 text-xs text-muted-foreground">
                {category.courses?.[0]?.count ?? 0} cursos
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft({
                      id: category.id,
                      name: category.name,
                      slug: category.slug,
                      description: category.description ?? "",
                      icon: category.icon ?? "",
                      color: category.color ?? "",
                      position: String(category.position),
                    })
                  }
                >
                  <Pencil className="size-4" /> Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setToDelete(category)}>
                  <Trash2 className="size-4" /> Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="space-y-4">
              <Field label="Nombre" htmlFor="cat-name">
                <Input
                  id="cat-name"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </Field>
              <Field label="Slug" htmlFor="cat-slug" hint="Se genera desde el nombre.">
                <div className="flex gap-2">
                  <Input
                    id="cat-slug"
                    value={draft.slug}
                    onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDraft({ ...draft, slug: slugify(draft.name) })}
                  >
                    Generar
                  </Button>
                </div>
              </Field>
              <Field label="Descripción" htmlFor="cat-description">
                <Textarea
                  id="cat-description"
                  rows={3}
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Icono" htmlFor="cat-icon" hint="Nombre de icono lucide.">
                  <Input
                    id="cat-icon"
                    value={draft.icon}
                    onChange={(event) => setDraft({ ...draft, icon: event.target.value })}
                  />
                </Field>
                <Field label="Color" htmlFor="cat-color">
                  <Input
                    id="cat-color"
                    value={draft.color}
                    onChange={(event) => setDraft({ ...draft, color: event.target.value })}
                    placeholder="#6366f1"
                  />
                </Field>
                <Field label="Orden" htmlFor="cat-position">
                  <Input
                    id="cat-position"
                    type="number"
                    value={draft.position}
                    onChange={(event) => setDraft({ ...draft, position: event.target.value })}
                  />
                </Field>
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
        title="Eliminar categoría"
        description={`Se eliminará "${toDelete?.name ?? ""}". No es posible si tiene cursos asociados.`}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  );
}
