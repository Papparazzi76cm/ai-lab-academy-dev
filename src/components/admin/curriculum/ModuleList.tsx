import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SortableList } from "@/components/admin/SortableList";
import {
  lessonStatusLabel,
  moduleDuration,
  type Lesson,
  type Module,
  type Resource,
} from "@/lib/admin-api";
import { formatDuration } from "@/lib/api";
import { LessonList } from "./LessonList";
import type { LessonWithResources, ModuleWithLessons } from "./useCurriculumMutations";

export function ModuleList({
  modules,
  onEditModule,
  onDeleteModule,
  onReorderModules,
  onAddLesson,
  onEditLesson,
  onDuplicateLesson,
  onDeleteLesson,
  onReorderLessons,
  onAddResource,
  onEditResource,
  onDeleteResource,
}: {
  modules: ModuleWithLessons[];
  onEditModule: (module: ModuleWithLessons) => void;
  onDeleteModule: (module: Module) => void;
  onReorderModules: (ids: string[]) => void;
  onAddLesson: (moduleId: string) => void;
  onEditLesson: (lesson: LessonWithResources) => void;
  onDuplicateLesson: (lesson: LessonWithResources) => void;
  onDeleteLesson: (lesson: Lesson) => void;
  onReorderLessons: (ids: string[]) => void;
  onAddResource: (lesson: LessonWithResources) => void;
  onEditResource: (resource: Resource) => void;
  onDeleteResource: (resource: Resource) => void;
}) {
  if (!modules.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Todavía no hay módulos.
      </div>
    );
  }

  return (
    <SortableList
      items={modules}
      getId={(module) => module.id}
      onReorder={onReorderModules}
      renderItem={(module) => (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
            <span className="font-semibold">{module.title}</span>
            <Badge variant={module.status === "published" ? "default" : "secondary"}>
              {lessonStatusLabel[module.status]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDuration(moduleDuration(module.lessons))}
            </span>
            <div className="ml-auto flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Editar módulo"
                onClick={() => onEditModule(module)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Eliminar módulo"
                onClick={() => onDeleteModule(module)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>

          <LessonList
            lessons={module.lessons}
            onEditLesson={onEditLesson}
            onDuplicateLesson={onDuplicateLesson}
            onDeleteLesson={onDeleteLesson}
            onReorderLessons={onReorderLessons}
            onAddResource={onAddResource}
            onEditResource={onEditResource}
            onDeleteResource={onDeleteResource}
          />

          <Button variant="outline" size="sm" onClick={() => onAddLesson(module.id)}>
            <Plus className="size-4" /> Añadir lección
          </Button>
        </div>
      )}
    />
  );
}
