import { z } from "zod";

export const LessonSectionPlanSchema = z.object({
  id: z.string().default(() => `sec-${Math.random().toString(36).substring(2, 7)}`),
  title: z.string().min(1, "El título de la sección es obligatorio"),
  purpose: z.string().min(1, "El propósito pedagógico es obligatorio"),
  targetBlockTypes: z.array(z.string()).default(["heading", "paragraph"]),
  keyPoints: z.array(z.string()).default([]),
});

export const LessonPlanSchema = z.object({
  title: z.string().min(1, "El título de la lección es obligatorio"),
  objectives: z.array(z.string()).min(1, "Debe incluir al menos un objetivo"),
  level: z.string().default("Intermedio"),
  estimatedDurationMinutes: z.number().default(20),
  sections: z.array(LessonSectionPlanSchema).min(1, "Debe incluir al menos una sección"),
  estimatedBlocksCount: z.number().default(6),
  recommendedResources: z.array(z.string()).optional(),
  quizIdeas: z.array(z.string()).optional(),
});

export type LessonPlanZod = z.infer<typeof LessonPlanSchema>;
export type LessonSectionPlanZod = z.infer<typeof LessonSectionPlanSchema>;
