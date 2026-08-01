import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FlatLessonItem } from "./useLessonPlayer";

interface LessonNavigationProps {
  courseSlug: string;
  prevLesson: FlatLessonItem | null;
  nextLesson: FlatLessonItem | null;
}

export function LessonNavigation({ courseSlug, prevLesson, nextLesson }: LessonNavigationProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Previous Lesson Button */}
      <Button
        variant="outline"
        disabled={!prevLesson}
        onClick={() => {
          if (prevLesson) {
            navigate({
              to: "/academy/course/$courseSlug/module/$moduleSlug/lesson/$lessonSlug",
              params: {
                courseSlug,
                moduleSlug: prevLesson.moduleSlug,
                lessonSlug: prevLesson.slug,
              },
            });
          }
        }}
        className="w-full sm:w-auto"
        aria-label={
          prevLesson
            ? `Ir a lección anterior: ${prevLesson.title}`
            : "Lección anterior no disponible"
        }
      >
        <ArrowLeft className="mr-2 size-4" />
        <span className="truncate">
          {prevLesson ? `Anterior: ${prevLesson.title}` : "Anterior"}
        </span>
      </Button>

      {/* Next Lesson Button */}
      <Button
        variant="outline"
        disabled={!nextLesson}
        onClick={() => {
          if (nextLesson) {
            navigate({
              to: "/academy/course/$courseSlug/module/$moduleSlug/lesson/$lessonSlug",
              params: {
                courseSlug,
                moduleSlug: nextLesson.moduleSlug,
                lessonSlug: nextLesson.slug,
              },
            });
          }
        }}
        className="w-full sm:w-auto"
        aria-label={
          nextLesson
            ? `Ir a siguiente lección: ${nextLesson.title}`
            : "Siguiente lección no disponible"
        }
      >
        <span className="truncate">
          {nextLesson ? `Siguiente: ${nextLesson.title}` : "Siguiente"}
        </span>
        <ArrowRight className="ml-2 size-4" />
      </Button>
    </div>
  );
}
