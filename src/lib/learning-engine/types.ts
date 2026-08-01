export type ProgressionMode = "FREE" | "LINEAR" | "FLEXIBLE";

export type LessonStatus = "not_started" | "in_progress" | "completed";

export interface LessonProgressRecord {
  id?: string;
  userId: string;
  courseId: string;
  lessonId: string;
  status: LessonStatus;
  completed: boolean;
  startedAt?: string | null;
  completedAt?: string | null;
  lastPosition: number;
  secondsSpent: number;
  updatedAt?: string;
}

export interface ModuleProgressRecord {
  id?: string;
  userId: string;
  moduleId: string;
  courseId: string;
  completedLessons: number;
  totalLessons: number;
  percentage: number;
  completedAt?: string | null;
  updatedAt?: string;
}

export interface CourseProgressRecord {
  id?: string;
  userId: string;
  courseId: string;
  completedModules: number;
  totalModules: number;
  completedLessons: number;
  totalLessons: number;
  percentage: number;
  completedAt?: string | null;
  lastLessonId?: string | null;
  updatedAt?: string;
}

export type LearningEventType =
  | "lesson_start"
  | "lesson_complete"
  | "lesson_abandon"
  | "lesson_resume"
  | "module_complete"
  | "course_complete"
  | "time_tracked"
  | "lesson_progress_update";

export interface LearningEventRecord {
  id?: string;
  userId: string;
  courseId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
  eventType: LearningEventType | string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface AccessCheckResult {
  canAccess: boolean;
  reason?: string;
  requiredLessonId?: string;
  requiredLessonTitle?: string;
  requiredModuleId?: string;
  requiredModuleTitle?: string;
}

export interface MinimalLesson {
  id: string;
  title: string;
  slug: string;
  position: number;
  moduleId: string;
  isFreePreview?: boolean;
}

export interface MinimalModule {
  id: string;
  title: string;
  slug: string;
  position: number;
  lessons: MinimalLesson[];
}

export interface MinimalCourseCurriculum {
  id: string;
  title: string;
  progressionMode: ProgressionMode;
  modules: MinimalModule[];
}

export interface ActiveCourseItem {
  courseId: string;
  title: string;
  slug: string;
  coverUrl?: string | null;
  percentage: number;
  completedLessons: number;
  totalLessons: number;
  lastLessonId?: string | null;
  lastLessonTitle?: string | null;
  lastLessonSlug?: string | null;
  lastModuleSlug?: string | null;
  updatedAt: string;
}

export interface CompletedCourseItem {
  courseId: string;
  title: string;
  slug: string;
  coverUrl?: string | null;
  completedAt: string;
  totalLessons: number;
}

export interface DashboardProgressStats {
  activeCoursesCount: number;
  completedCoursesCount: number;
  totalHoursStudied: number;
  completedLessonsCount: number;
  timeThisWeekMinutes: number;
  lastActivityAt: string | null;
  activeCourses: ActiveCourseItem[];
  completedCourses: CompletedCourseItem[];
}

export interface CertificateDraft {
  courseId: string;
  courseTitle: string;
  studentName: string;
  completedAt: string;
  certificateCode: string;
}
