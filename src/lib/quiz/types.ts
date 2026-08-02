import { z } from "zod";

export type QuestionType = "single_choice" | "multiple_choice" | "true_false";
export type QuizStatus = "draft" | "published" | "archived";
export type AttemptStatus = "in_progress" | "submitted" | "expired" | "cancelled";

export interface Quiz {
  id: string;
  course_id: string;
  module_id?: string | null;
  lesson_id?: string | null;
  title: string;
  description?: string | null;
  status: QuizStatus;
  passing_score: number;
  max_attempts?: number | null;
  time_limit_minutes?: number | null;
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  show_correct_answers: boolean;
  show_explanations: boolean;
  required_for_completion: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;

  // Optional joined data
  questions_count?: number;
  course_title?: string;
  module_title?: string;
  lesson_title?: string;
}

// Student Answer representation (Strictly DOES NOT expose is_correct)
export interface StudentQuizAnswer {
  id: string;
  question_id: string;
  answer_text: string;
  position: number;
}

// Student Question representation (Strictly DOES NOT expose explanation or correct answers)
export interface StudentQuizQuestion {
  id: string;
  quiz_id: string;
  type: QuestionType;
  question_text: string;
  points: number;
  position: number;
  answers: StudentQuizAnswer[];
}

// Admin Answer representation (Includes is_correct for instructor/CMS authoring)
export interface AdminQuizAnswer {
  id: string;
  question_id: string;
  answer_text: string;
  is_correct: boolean;
  position: number;
  created_at?: string;
  updated_at?: string;
}

// Admin Question representation
export interface AdminQuizQuestion {
  id: string;
  quiz_id: string;
  type: QuestionType;
  question_text: string;
  explanation?: string | null;
  points: number;
  position: number;
  required?: boolean;
  settings_json?: Record<string, unknown>;
  answers?: AdminQuizAnswer[];
  created_at?: string;
  updated_at?: string;
}

// Alias for generic quiz answer / question in admin CMS
export type QuizAnswer = AdminQuizAnswer;
export type QuizQuestion = AdminQuizQuestion;

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  attempt_number: number;
  status: AttemptStatus;
  started_at: string;
  submitted_at?: string | null;
  expires_at?: string | null;
  score: number;
  percentage: number;
  passed: boolean;
  total_points: number;
  earned_points: number;
  shuffled_question_ids?: string[] | null;
  shuffled_answer_ids_map?: Record<string, string[]> | null;
  created_at: string;
  updated_at: string;
}

export interface QuizAttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_answer_ids: string[];
  is_correct?: boolean | null;
  points_earned?: number | null;
  answered_at: string;
}

export interface StartAttemptPayload {
  attempt: QuizAttempt;
  quiz: Quiz;
  questions: StudentQuizQuestion[];
  selected_answers?: Record<string, string[]>;
  current_question_index?: number;
}

export interface QuestionResultDetail {
  question_id: string;
  question_text: string;
  type: QuestionType;
  points: number;
  points_earned: number;
  is_correct: boolean;
  explanation?: string | null;
  answers: Array<{
    id: string;
    answer_text: string;
    position: number;
    is_correct?: boolean | null;
    selected: boolean;
  }>;
}

export interface SubmitAttemptResult {
  success: boolean;
  status?: AttemptStatus;
  reason?: string;
  attempt_id: string;
  passed: boolean;
  score: number;
  percentage: number;
  earned_points: number;
  total_points: number;
  passing_score: number;
  show_correct_answers: boolean;
  show_explanations: boolean;
  details: QuestionResultDetail[];
}

export interface StudentAttemptStat {
  id: string;
  user_id: string;
  user_email?: string;
  attempt_number: number;
  status: AttemptStatus;
  score: number;
  percentage: number;
  passed: boolean;
  started_at: string;
  submitted_at?: string;
}

export interface QuizStatistics {
  quiz_id: string;
  quiz_title: string;
  total_students: number;
  attempts_started: number;
  attempts_completed: number;
  passed_attempts: number;
  pass_rate: number;
  avg_score: number;
  score_distribution: {
    range_0_20: number;
    range_21_40: number;
    range_41_60: number;
    range_61_80: number;
    range_81_100: number;
  };
  student_attempts: StudentAttemptStat[];
}

// Validation schemas with Zod
export const QuizSettingsSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  description: z.string().optional().nullable(),
  course_id: z.string().uuid("Debes seleccionar un curso válido"),
  module_id: z.string().uuid().optional().nullable(),
  lesson_id: z.string().uuid().optional().nullable(),
  passing_score: z.number().min(0).max(100),
  max_attempts: z.number().min(1).optional().nullable(),
  time_limit_minutes: z.number().min(1).optional().nullable(),
  shuffle_questions: z.boolean().default(false),
  shuffle_answers: z.boolean().default(false),
  show_correct_answers: z.boolean().default(true),
  show_explanations: z.boolean().default(true),
  required_for_completion: z.boolean().default(false),
});

export const QuizAnswerSchema = z.object({
  id: z.string().optional(),
  answer_text: z.string().min(1, "El texto de la respuesta no puede estar vacío"),
  is_correct: z.boolean().default(false),
  position: z.number().default(0),
});

export const QuizQuestionSchema = z
  .object({
    id: z.string().optional(),
    type: z.enum(["single_choice", "multiple_choice", "true_false"]),
    question_text: z
      .string()
      .min(3, "El enunciado de la pregunta debe tener al menos 3 caracteres"),
    explanation: z.string().optional().nullable(),
    points: z.number().min(1, "Los puntos deben ser mayor a 0"),
    position: z.number().default(0),
    answers: z.array(QuizAnswerSchema),
  })
  .superRefine((data, ctx) => {
    if (data.type === "single_choice") {
      if (data.answers.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Una pregunta de selección única requiere al menos 2 opciones.",
          path: ["answers"],
        });
      }
      const correctCount = data.answers.filter((a) => a.is_correct).length;
      if (correctCount !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Debe haber exactamente 1 respuesta correcta.",
          path: ["answers"],
        });
      }
    } else if (data.type === "multiple_choice") {
      if (data.answers.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Una pregunta de opción múltiple requiere al menos 2 opciones.",
          path: ["answers"],
        });
      }
      const correctCount = data.answers.filter((a) => a.is_correct).length;
      if (correctCount < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Debe haber al menos 1 respuesta correcta.",
          path: ["answers"],
        });
      }
      const incorrectCount = data.answers.filter((a) => !a.is_correct).length;
      if (incorrectCount < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Una pregunta de opción múltiple debe tener al menos 1 respuesta incorrecta.",
          path: ["answers"],
        });
      }
    } else if (data.type === "true_false") {
      if (data.answers.length !== 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Una pregunta de Verdadero/Falso debe tener exactamente 2 opciones.",
          path: ["answers"],
        });
      }
      const correctCount = data.answers.filter((a) => a.is_correct).length;
      if (correctCount !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Debe haber exactamente 1 respuesta correcta (Verdadero o Falso).",
          path: ["answers"],
        });
      }
    }
  });

export type QuizSettingsFormValues = z.infer<typeof QuizSettingsSchema>;
export type QuizQuestionFormValues = z.infer<typeof QuizQuestionSchema>;
