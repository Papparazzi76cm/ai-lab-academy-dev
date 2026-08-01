import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, MoreHorizontal, Pencil, Plus, Search, Trash2, Archive } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Field } from "@/components/admin/Field";
import {
  adminCategoriesQuery,
  adminCoursesQuery,
  courseLevelLabel,
  courseStatusLabel,
  createCourse,
  deleteCourse,
  duplicateCourse,
  errorMessage,
  slugify,
  uniqueSlug,
  updateCourse,
  type AdminCourseRow,
  type CourseStatus,
} from "@/lib/admin-api";
import { formatPrice } from "@/lib/api";

export const Route = createFileRoute("/admin/courses/")({
  head: () => ({
    meta: [
      { title: "Gestión de cursos — NeuraLab" },
      { name: "description", content: "Crea, edita, duplica y archiva los cursos de la academia." },
      { property: "og:title", content: "Gestión de cursos — NeuraLab" },
      { property: "og:description", content: "CMS de cursos de NeuraLab." },
    ],
  }),
  component: AdminCoursesPage,
});

const PAGE_SIZE = 10;
type SortKey = "updated_desc" | "created_desc" | "title_asc" | "price_desc";

function AdminCoursesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: courses = [], isLoading } = useQuery(adminCoursesQuery());
  const { data: categories = [] } = useQuery(adminCategoriesQuery());

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CourseStatus | "all">("all");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("updated_desc");
  const [page, setPage] = useState(1);
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [toDelete, setToDelete] = useState<AdminCourseRow | null>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
    void queryClient.invalidateQueries({ queryKey: ["courses"] });
  };

  const takenSlugs = useMemo(() => courses.map((c) => c.slug), [courses]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = courses.filter((course) => {
      if (status !== "all" && course.status !== status) return false;
      if (category !== "all" && course.category_id !== category) return false;
      if (term && !`${course.title} ${course.slug}`.toLowerCase().includes(term)) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sort === "title_asc") return a.title.localeCompare(b.title);
      if (sort === "price_desc") return b.price_cents - a.price_cents;
      if (sort === "created_desc") return b.created_at.localeCompare(a.created_at);
      return b.updated_at.localeCompare(a.updated_at);
    });
  }, [courses, search, status, category, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const createMutation = useMutation({
    mutationFn: async (title: string) =>
      createCourse({ title, slug: uniqueSlug(title, takenSlugs), status: "draft" }),
    onSuccess: (course) => {
      invalidate();
      setNewOpen(false);
      setNewTitle("");
      toast.success("Curso creado en borrador.");
      void navigate({ to: "/admin/courses/$courseId", params: { courseId: course.id } });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateCourse(id, takenSlugs),
    onSuccess: () => {
      invalidate();
      toast.success("Curso duplicado como borrador.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      updateCourse(id, { status: archived ? "archived" : "draft" }),
    onSuccess: () => {
      invalidate();
      toast.success("Estado del curso actualizado.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCourse(id),
    onSuccess: () => {
      invalidate();
      setToDelete(null);
      toast.success("Curso eliminado.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por título o slug…"
            className="pl-9"
            aria-label="Buscar cursos"
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as CourseStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40" aria-label="Filtrar por estado">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="published">Publicado</SelectItem>
            <SelectItem value="archived">Archivado</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={category}
          onValueChange={(value) => {
            setCategory(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48" aria-label="Filtrar por categoría">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
          <SelectTrigger className="w-52" aria-label="Ordenar">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated_desc">Última modificación</SelectItem>
            <SelectItem value="created_desc">Más recientes</SelectItem>
            <SelectItem value="title_asc">Título (A-Z)</SelectItem>
            <SelectItem value="price_desc">Precio (mayor)</SelectItem>
          </SelectContent>
        </Select>

        <Button className="ml-auto" onClick={() => setNewOpen(true)}>
          <Plus className="size-4" /> Nuevo curso
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : visible.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden md:table-cell">Categoría</TableHead>
                <TableHead className="hidden md:table-cell">Profesor</TableHead>
                <TableHead className="hidden lg:table-cell">Nivel</TableHead>
                <TableHead className="hidden lg:table-cell">Precio</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <Link
                      to="/admin/courses/$courseId"
                      params={{ courseId: course.id }}
                      className="font-medium hover:underline"
                    >
                      {course.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">/{course.slug}</p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        course.status === "published"
                          ? "default"
                          : course.status === "archived"
                            ? "outline"
                            : "secondary"
                      }
                    >
                      {courseStatusLabel[course.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {course.categories?.name ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {course.instructors?.name ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {courseLevelLabel[course.level]}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {formatPrice(course.price_cents, course.currency)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Acciones del curso">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to="/admin/courses/$courseId" params={{ courseId: course.id }}>
                            <Pencil className="size-4" /> Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateMutation.mutate(course.id)}>
                          <Copy className="size-4" /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            archiveMutation.mutate({
                              id: course.id,
                              archived: course.status !== "archived",
                            })
                          }
                        >
                          <Archive className="size-4" />
                          {course.status === "archived" ? "Desarchivar" : "Archivar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setToDelete(course)}
                        >
                          <Trash2 className="size-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="p-12 text-center text-sm text-muted-foreground">
            No hay cursos que coincidan con los filtros.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filtered.length} curso{filtered.length === 1 ? "" : "s"} · página {currentPage} de{" "}
          {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(currentPage + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo curso</DialogTitle>
          </DialogHeader>
          <Field label="Título" htmlFor="new-course-title" hint={`Slug: /${slugify(newTitle)}`}>
            <Input
              id="new-course-title"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="Introducción a la IA generativa"
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!newTitle.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate(newTitle.trim())}
            >
              Crear borrador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Eliminar curso"
        description={`Se eliminará "${toDelete?.title ?? ""}" junto con sus módulos, lecciones y recursos. Esta acción no se puede deshacer.`}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
      />
    </div>
  );
}
