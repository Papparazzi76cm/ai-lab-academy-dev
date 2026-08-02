import { supabase } from "@/integrations/supabase/client";
import {
  Quiz,
  QuizQuestion,
  QuizAnswer,
  QuizAttempt,
  QuizStatistics,
  StartAttemptPayload,
  SubmitAttemptResult,
  StudentAttemptStat,
} from "./types";

// CMS API FUNCTIONS

export async function fetchQuizzes(params?: {
  courseId?: string;
  status?: string;
}): Promise<Quiz[]> {
  let query = supabase.from("quizzes").select("*").order("created_at", { ascending: false });

  if (params?.courseId) {
    query = query.eq("course_id", params.courseId);
  }
  if (params?.status) {
    query = query.eq("status", params.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as unknown as Quiz[];
}

export async function fetchQuizDetail(
  quizId: string,
): Promise<{ quiz: Quiz; questions: QuizQuestion[] }> {
  const { data: quizData, error: quizError } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .single();

  if (quizError) throw new Error(quizError.message);

  const { data: questionsData, error: questionsError } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("position", { ascending: true });

  if (questionsError) throw new Error(questionsError.message);

  const questionIds = (questionsData || []).map((q) => q.id);
  let answersData: QuizAnswer[] = [];

  if (questionIds.length > 0) {
    const { data: aData, error: aError } = await supabase
      .from("quiz_answers")
      .select("*")
      .in("question_id", questionIds)
      .order("position", { ascending: true });

    if (!aError && aData) {
      answersData = aData as unknown as QuizAnswer[];
    }
  }

  const questions: QuizQuestion[] = (questionsData || []).map((q) => ({
    ...q,
    type: q.type as QuizQuestion["type"],
    answers: answersData.filter((a) => a.question_id === q.id),
  }));

  return { quiz: quizData as unknown as Quiz, questions };
}

export async function createQuiz(payload: Partial<Quiz>): Promise<Quiz> {
  const { data, error } = await supabase
    .from("quizzes")
    .insert([
      {
        course_id: payload.course_id,
        module_id: payload.module_id || null,
        lesson_id: payload.lesson_id || null,
        title: payload.title || "Nuevo Cuestionario",
        description: payload.description || null,
        status: payload.status || "draft",
        passing_score: payload.passing_score ?? 70,
        max_attempts: payload.max_attempts ?? null,
        time_limit_minutes: payload.time_limit_minutes ?? null,
        shuffle_questions: payload.shuffle_questions ?? false,
        shuffle_answers: payload.shuffle_answers ?? false,
        show_correct_answers: payload.show_correct_answers ?? true,
        show_explanations: payload.show_explanations ?? true,
        required_for_completion: payload.required_for_completion ?? false,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as Quiz;
}

export async function updateQuiz(quizId: string, payload: Partial<Quiz>): Promise<Quiz> {
  const { data, error } = await supabase
    .from("quizzes")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quizId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as Quiz;
}

export async function deleteQuiz(quizId: string): Promise<void> {
  const { error } = await supabase.from("quizzes").delete().eq("id", quizId);
  if (error) throw new Error(error.message);
}

export async function duplicateQuiz(quizId: string): Promise<Quiz> {
  const { quiz, questions } = await fetchQuizDetail(quizId);
  const newQuiz = await createQuiz({
    ...quiz,
    title: `${quiz.title} (Copia)`,
    status: "draft",
  });

  for (const q of questions) {
    const { data: newQ, error: qErr } = await supabase
      .from("quiz_questions")
      .insert([
        {
          quiz_id: newQuiz.id,
          type: q.type,
          question_text: q.question_text,
          explanation: q.explanation || null,
          points: q.points,
          position: q.position,
        },
      ])
      .select()
      .single();

    if (qErr || !newQ) continue;

    if (q.answers && q.answers.length > 0) {
      await supabase.from("quiz_answers").insert(
        q.answers.map((a) => ({
          question_id: newQ.id,
          answer_text: a.answer_text,
          is_correct: a.is_correct ?? false,
          position: a.position,
        })),
      );
    }
  }

  return newQuiz;
}

export async function saveQuestionWithAnswers(
  quizId: string,
  question: Partial<QuizQuestion> & { answers: Partial<QuizAnswer>[] },
): Promise<QuizQuestion> {
  let questionId = question.id;

  if (questionId) {
    const { error } = await supabase
      .from("quiz_questions")
      .update({
        type: question.type,
        question_text: question.question_text,
        explanation: question.explanation || null,
        points: question.points ?? 1,
        position: question.position ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", questionId);

    if (error) throw new Error(error.message);
  } else {
    const { data: newQ, error } = await supabase
      .from("quiz_questions")
      .insert([
        {
          quiz_id: quizId,
          type: question.type || "single_choice",
          question_text: question.question_text || "",
          explanation: question.explanation || null,
          points: question.points ?? 1,
          position: question.position ?? 0,
        },
      ])
      .select()
      .single();

    if (error || !newQ) throw new Error(error?.message || "Error al crear la pregunta");
    questionId = newQ.id;
  }

  // Replace answers
  if (question.id) {
    await supabase.from("quiz_answers").delete().eq("question_id", questionId);
  }

  if (question.answers && question.answers.length > 0) {
    const { error: aErr } = await supabase.from("quiz_answers").insert(
      question.answers.map((a, idx) => ({
        question_id: questionId!,
        answer_text: a.answer_text,
        is_correct: a.is_correct ?? false,
        position: a.position ?? idx,
      })),
    );
    if (aErr) throw new Error(aErr.message);
  }

  return fetchQuizDetail(quizId).then((r) => r.questions.find((q) => q.id === questionId)!);
}

export async function deleteQuestion(questionId: string): Promise<void> {
  const { error } = await supabase.from("quiz_questions").delete().eq("id", questionId);
  if (error) throw new Error(error.message);
}

export async function publishQuizRpc(
  quizId: string,
): Promise<{ success: boolean; total_points: number }> {
  const { data, error } = await supabase.rpc("publish_quiz_rpc", { p_quiz_id: quizId });
  if (error) throw new Error(error.message);
  return data as { success: boolean; total_points: number };
}

export async function getQuizStatisticsRpc(quizId: string): Promise<QuizStatistics> {
  const { data, error } = await supabase.rpc("get_quiz_statistics_rpc", { p_quiz_id: quizId });
  if (error) throw new Error(error.message);
  return data as unknown as QuizStatistics;
}

// STUDENT RPC EXECUTION FUNCTIONS

export async function startQuizAttemptRpc(quizId: string): Promise<StartAttemptPayload> {
  const { data, error } = await supabase.rpc("start_quiz_attempt_rpc", { p_quiz_id: quizId });
  if (error) throw new Error(error.message);
  return data as unknown as StartAttemptPayload;
}

export async function saveQuizAnswerRpc(
  attemptId: string,
  questionId: string,
  selectedAnswerIds: string[],
): Promise<{ success: boolean }> {
  const { data, error } = await supabase.rpc("save_quiz_answer_rpc", {
    p_attempt_id: attemptId,
    p_question_id: questionId,
    p_selected_answer_ids: selectedAnswerIds,
  });
  if (error) throw new Error(error.message);
  return data as { success: boolean };
}

export async function submitQuizAttemptRpc(attemptId: string): Promise<SubmitAttemptResult> {
  const { data, error } = await supabase.rpc("submit_quiz_attempt_rpc", {
    p_attempt_id: attemptId,
  });
  if (error) throw new Error(error.message);
  return data as unknown as SubmitAttemptResult;
}

export async function fetchStudentAttempts(userId?: string): Promise<QuizAttempt[]> {
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*, quizzes(title, course_id, passing_score)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as unknown as QuizAttempt[];
}
