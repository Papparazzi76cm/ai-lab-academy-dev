import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CourseSidebar, type CourseWithModules } from "./CourseSidebar";
import type { LessonProgressStatus } from "./useLessonProgress";

interface MobileCourseSidebarProps {
  course: CourseWithModules;
  activeLessonId?: string;
  activeModuleSlug?: string;
  statuses: Record<string, LessonProgressStatus>;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  currentIndex: number;
  isEnrolled?: boolean;
}

export function MobileCourseSidebar({
  course,
  activeLessonId,
  activeModuleSlug,
  statuses,
  completedCount,
  totalCount,
  progressPercent,
  currentIndex,
  isEnrolled = false,
}: MobileCourseSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border bg-card px-4 py-3 lg:hidden">
      <div className="flex items-center justify-between">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Menu className="size-4" />
              <span>Ver temario ({progressPercent}%)</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto sm:w-96">
            <SheetHeader className="mb-4 text-left">
              <SheetTitle className="font-display text-lg font-bold">Temario del curso</SheetTitle>
            </SheetHeader>
            <CourseSidebar
              course={course}
              activeLessonId={activeLessonId}
              activeModuleSlug={activeModuleSlug}
              statuses={statuses}
              completedCount={completedCount}
              totalCount={totalCount}
              progressPercent={progressPercent}
              isEnrolled={isEnrolled}
              onSelectLesson={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="text-xs font-medium text-muted-foreground">
          Lección {currentIndex + 1} de {totalCount}
        </div>
      </div>
    </div>
  );
}
