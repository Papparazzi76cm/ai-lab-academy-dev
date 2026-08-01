import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { courseQuery, lessonQuery } from "@/lib/api";
import { slugify } from "@/lib/admin-api";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const Route = createFileRoute("/learn/$courseSlug/$lessonSlug")({
  component: LearnRedirectPage,
});

function LearnRedirectPage() {
  const { courseSlug, lessonSlug } = Route.useParams();
  const navigate = useNavigate();

  const { data: course, isLoading: isCourseLoading } = useQuery(courseQuery(courseSlug));
  const { data: current, isLoading: isLessonLoading } = useQuery(
    lessonQuery(courseSlug, lessonSlug),
  );

  useEffect(() => {
    if (!isCourseLoading && !isLessonLoading && course && current?.lesson) {
      const parentModule = course.modules?.find((m) => m.id === current.lesson.module_id);
      const moduleSlug = parentModule ? slugify(parentModule.title) : "modulo";

      navigate({
        to: "/academy/course/$courseSlug/module/$moduleSlug/lesson/$lessonSlug",
        params: {
          courseSlug,
          moduleSlug,
          lessonSlug,
        },
        replace: true,
      });
    }
  }, [course, current, courseSlug, lessonSlug, isCourseLoading, isLessonLoading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="aspect-video w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
