import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Edit3, Trash2, FileText, Layers } from "lucide-react";

export interface CourseModuleItem {
  id: string;
  title: string;
  description?: string;
  lessons: Array<{ id: string; title: string; status: string }>;
}

interface CourseEditorProps {
  courseId: string;
  courseTitle: string;
  modules: CourseModuleItem[];
  onAddModule: () => void;
  onEditModule: (moduleId: string) => void;
  onDeleteModule: (moduleId: string) => void;
  onAddLesson: (moduleId: string) => void;
  onEditLesson: (lessonId: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  onReorderModules: (moduleIds: string[]) => void;
}

function SortableModuleCard({
  module,
  onEditModule,
  onDeleteModule,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
}: {
  module: CourseModuleItem;
  onEditModule: (id: string) => void;
  onDeleteModule: (id: string) => void;
  onAddLesson: (moduleId: string) => void;
  onEditLesson: (lessonId: string) => void;
  onDeleteLesson: (lessonId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: module.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-2xl border border-border bg-card p-4 space-y-4 shadow-xs"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <Layers className="size-5 text-primary" />
            <h3 className="font-display font-semibold text-base text-foreground">{module.title}</h3>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onAddLesson(module.id)}>
            <Plus className="size-4 mr-1" /> Lección
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onEditModule(module.id)}>
            <Edit3 className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDeleteModule(module.id)}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>

      {module.description && (
        <p className="text-xs text-muted-foreground pl-8">{module.description}</p>
      )}

      {/* Lesson list inside module */}
      <div className="pl-8 space-y-2">
        {module.lessons.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            No hay lecciones en este módulo.
          </p>
        ) : (
          module.lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="size-4 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium text-foreground truncate">{lesson.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-mono uppercase text-muted-foreground">
                  {lesson.status}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => onEditLesson(lesson.id)}
                >
                  Editar Contenido
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => onDeleteLesson(lesson.id)}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function CourseEditor({
  courseTitle,
  modules,
  onAddModule,
  onEditModule,
  onDeleteModule,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onReorderModules,
}: CourseEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = modules.findIndex((m) => m.id === active.id);
      const newIndex = modules.findIndex((m) => m.id === over.id);
      const reordered = [...modules];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      onReorderModules(reordered.map((m) => m.id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl">{courseTitle}</h2>
          <p className="text-xs text-muted-foreground">Estructura general de módulos y lecciones</p>
        </div>
        <Button onClick={onAddModule}>
          <Plus className="size-4 mr-1.5" /> Nuevo Módulo
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {modules.map((module) => (
              <SortableModuleCard
                key={module.id}
                module={module}
                onEditModule={onEditModule}
                onDeleteModule={onDeleteModule}
                onAddLesson={onAddLesson}
                onEditLesson={onEditLesson}
                onDeleteLesson={onDeleteLesson}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
