import { Link } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface LessonBreadcrumbsProps {
  courseTitle: string;
  courseSlug: string;
  moduleTitle: string;
  lessonTitle: string;
}

export function LessonBreadcrumbs({
  courseTitle,
  courseSlug,
  moduleTitle,
  lessonTitle,
}: LessonBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb">
      <Breadcrumb>
        <BreadcrumbList className="text-xs font-medium text-muted-foreground">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/courses" className="flex items-center gap-1 hover:text-foreground">
                <Home className="size-3.5" />
                Academia
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="size-3.5" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link
                to="/courses/$slug"
                params={{ slug: courseSlug }}
                className="hover:text-foreground"
              >
                {courseTitle}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="size-3.5" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <span className="text-foreground">{moduleTitle}</span>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="size-3.5" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage className="font-semibold text-foreground">{lessonTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </nav>
  );
}
