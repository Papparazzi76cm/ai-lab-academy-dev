import { ChevronDown, Copy, GripVertical, Paperclip, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SortableList } from "@/components/admin/SortableList";
import {
  lessonStatusLabel,
  resourceKindLabel,
  resourceKinds,
  type Lesson,
  type Resource,
  type ResourceKind,
} from "@/lib/admin-api";
import { formatDuration } from "@/lib/api";
import type { LessonWithResources } from "./useCurriculumMutations";

export function LessonList({
  lessons,
  onEditLesson,
  onDuplicateLesson,
  onDeleteLesson,
  onReorderLessons,
  onAddResource,
  onEditResource,
  onDeleteResource,
}: {
  lessons: LessonWithResources[];
  onEditLesson: (lesson: LessonWithResources) => void;
  onDuplicateLesson: (lesson: LessonWithResources) => void;
  onDeleteLesson: (lesson: Lesson) => void;
  onReorderLessons: (ids: string[]) => void;
  onAddResource: (lesson: LessonWithResources) => void;
  onEditResource: (resource: Resource) => void;
  onDeleteResource: (resource: Resource) => void;
}) {
  if (!lessons.length) {
    return <p className="text-sm text-muted-foreground">Sin lecciones todavía.</p>;
  }

  return (
    <SortableList
      items={lessons}
      getId={(lesson) => lesson.id}
      onReorder={onReorderLessons}
      renderItem={(lesson) => (
        <LessonRow
          lesson={lesson}
          onEdit={() => onEditLesson(lesson)}
          onDuplicate={() => onDuplicateLesson(lesson)}
          onDelete={() => onDeleteLesson(lesson)}
          onAddResource={() => onAddResource(lesson)}
          onEditResource={onEditResource}
          onDeleteResource={onDeleteResource}
        />
      )}
    />
  );
}

function LessonRow({
  lesson,
  onEdit,
  onDuplicate,
  onDelete,
  onAddResource,
  onEditResource,
  onDeleteResource,
}: {
  lesson: LessonWithResources;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddResource: () => void;
  onEditResource: (resource: Resource) => void;
  onDeleteResource: (resource: Resource) => void;
}) {
  return (
    <Collapsible className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center gap-2">
        <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
        <span className="truncate text-sm font-medium">{lesson.title}</span>
        <Badge variant={lesson.status === "published" ? "default" : "secondary"}>
          {lessonStatusLabel[lesson.status]}
        </Badge>
        {lesson.is_free_preview ? <Badge variant="outline">Gratis</Badge> : null}
        <span className="text-xs text-muted-foreground">
          {formatDuration(lesson.duration_minutes)}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Ver recursos">
              <Paperclip className="size-4" />
              <ChevronDown className="size-3" />
            </Button>
          </CollapsibleTrigger>
          <Button variant="ghost" size="icon" aria-label="Editar lección" onClick={onEdit}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Duplicar lección" onClick={onDuplicate}>
            <Copy className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Eliminar lección" onClick={onDelete}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <CollapsibleContent className="mt-3 space-y-2 border-t border-border pt-3">
        {lesson.resources.length ? (
          <ul className="space-y-2">
            {lesson.resources.map((resource) => (
              <li key={resource.id} className="flex items-center gap-2 text-sm">
                <Badge variant="outline">
                  {resourceKindLabel[resource.kind as ResourceKind] ?? resource.kind}
                </Badge>
                <span className="truncate">{resource.title}</span>
                <div className="ml-auto flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Editar recurso"
                    onClick={() =>
                      onEditResource({
                        ...resource,
                        kind: (resourceKinds as readonly string[]).includes(resource.kind)
                          ? resource.kind
                          : "link",
                      })
                    }
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Eliminar recurso"
                    onClick={() => onDeleteResource(resource)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Sin recursos.</p>
        )}
        <Button variant="outline" size="sm" onClick={onAddResource}>
          <Plus className="size-4" /> Añadir recurso
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
