import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourseForm } from "@/components/admin/CourseForm";
import { CourseCurriculum } from "@/components/admin/CourseCurriculum";
import { adminCategoriesQuery, adminCourseQuery, adminInstructorsQuery } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/courses/$courseId")({
  head: () => ({
    meta: [
      { title: "Editar curso — NeuraLab" },
      { name: "description", content: "Edita los datos, módulos, lecciones y recursos del curso." },
      { property: "og:title", content: "Editar curso — NeuraLab" },
      { property: "og:description", content: "Editor de cursos del CMS de NeuraLab." },
    ],
  }),
  component: AdminCourseEditor,
});

function AdminCourseEditor() {
  const { courseId } = Route.useParams();
  const { data: course, isLoading, isError } = useQuery(adminCourseQuery(courseId));
  const { data: categories = [] } = useQuery(adminCategoriesQuery());
  const { data: instructors = [] } = useQuery(adminInstructorsQuery());

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">No se ha encontrado el curso.</p>
        <Button className="mt-4" variant="outline" asChild>
          <Link to="/admin/courses">Volver a cursos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/courses">
            <ArrowLeft className="size-4" /> Cursos
          </Link>
        </Button>
        <h2 className="font-display text-xl font-semibold">{course.title}</h2>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="curriculum">Temario</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-6">
          <CourseForm course={course} categories={categories} instructors={instructors} />
        </TabsContent>
        <TabsContent value="curriculum" className="mt-6">
          <CourseCurriculum course={course} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
