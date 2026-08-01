import { syncLessonProgressRpc } from "./progress";
import { CertificateDraft } from "./types";

export interface CompleteLessonParams {
  userId: string;
  courseId: string;
  lessonId: string;
  courseTitle?: string;
  studentName?: string;
  secondsSpent?: number;
  lastPosition?: number;
}

export interface CompleteLessonResult {
  completed: boolean;
  status: string;
  modulePercentage: number;
  coursePercentage: number;
  isCourseCompleted: boolean;
  certificateDraft?: CertificateDraft | null;
}

/**
  Marks a lesson as completed, triggers module/course recalculation via RPC, and generates certificate draft if the course is 100% complete.
 */
export async function completeLesson(params: CompleteLessonParams): Promise<CompleteLessonResult> {
  const syncResult = await syncLessonProgressRpc({
    lessonId: params.lessonId,
    courseId: params.courseId,
    completed: true,
    status: "completed",
    secondsSpent: params.secondsSpent || 0,
    lastPosition: params.lastPosition || 0,
  });

  let certificateDraft: CertificateDraft | null = null;

  if (syncResult.isCourseCompleted) {
    const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    certificateDraft = {
      courseId: params.courseId,
      courseTitle: params.courseTitle || "Curso de AI Lab Academy",
      studentName: params.studentName || "Estudiante",
      completedAt: new Date().toISOString(),
      certificateCode: `AILA-CERT-${randomCode}`,
    };
  }

  return {
    completed: true,
    status: "completed",
    modulePercentage: syncResult.modulePercentage,
    coursePercentage: syncResult.coursePercentage,
    isCourseCompleted: syncResult.isCourseCompleted,
    certificateDraft,
  };
}

/**
  Toggles a lesson completion state (completed <-> in_progress).
 */
export async function toggleLessonCompletion(params: {
  userId: string;
  courseId: string;
  lessonId: string;
  currentlyCompleted: boolean;
  courseTitle?: string;
  studentName?: string;
}): Promise<CompleteLessonResult> {
  const targetCompleted = !params.currentlyCompleted;

  const syncResult = await syncLessonProgressRpc({
    lessonId: params.lessonId,
    courseId: params.courseId,
    completed: targetCompleted,
    status: targetCompleted ? "completed" : "in_progress",
  });

  let certificateDraft: CertificateDraft | null = null;
  if (syncResult.isCourseCompleted && targetCompleted) {
    const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    certificateDraft = {
      courseId: params.courseId,
      courseTitle: params.courseTitle || "Curso de AI Lab Academy",
      studentName: params.studentName || "Estudiante",
      completedAt: new Date().toISOString(),
      certificateCode: `AILA-CERT-${randomCode}`,
    };
  }

  return {
    completed: targetCompleted,
    status: targetCompleted ? "completed" : "in_progress",
    modulePercentage: syncResult.modulePercentage,
    coursePercentage: syncResult.coursePercentage,
    isCourseCompleted: syncResult.isCourseCompleted,
    certificateDraft,
  };
}
