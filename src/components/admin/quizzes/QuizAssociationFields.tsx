import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CourseOption {
  id: string;
  title: string;
}

interface ModuleOption {
  id: string;
  title: string;
}

interface LessonOption {
  id: string;
  title: string;
}

interface QuizAssociationFieldsProps {
  courses: CourseOption[];
  modules: ModuleOption[];
  lessons: LessonOption[];
  selectedCourseId: string;
  selectedModuleId?: string | null;
  selectedLessonId?: string | null;
  onSelectCourse: (courseId: string) => void;
  onSelectModule: (moduleId: string | null) => void;
  onSelectLesson: (lessonId: string | null) => void;
  courseError?: string | undefined;
}

export function QuizAssociationFields({
  courses,
  modules,
  lessons,
  selectedCourseId,
  selectedModuleId,
  selectedLessonId,
  onSelectCourse,
  onSelectModule,
  onSelectLesson,
  courseError,
}: QuizAssociationFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-2">
        <Label>Curso Asociado *</Label>
        <Select value={selectedCourseId || ""} onValueChange={onSelectCourse}>
          <SelectTrigger id="course-select-trigger">
            <SelectValue placeholder="Selecciona curso" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {courseError && <p className="text-xs text-destructive">{courseError}</p>}
      </div>

      <div className="space-y-2">
        <Label>Módulo (Opcional)</Label>
        <Select
          value={selectedModuleId || "none"}
          onValueChange={(val) => onSelectModule(val === "none" ? null : val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sin módulo específico" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin módulo específico</SelectItem>
            {modules.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Lección (Opcional)</Label>
        <Select
          value={selectedLessonId || "none"}
          onValueChange={(val) => onSelectLesson(val === "none" ? null : val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sin lección específica" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin lección específica</SelectItem>
            {lessons.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
