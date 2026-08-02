-- ============================================================================
-- SPRINT 2.6 — QUIZZES INTERACTIVOS Y EVALUACIÓN
-- ============================================================================

-- 1. ENUMS & EXTENSIONS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quiz_status') THEN
    CREATE TYPE public.quiz_status AS ENUM ('draft', 'published', 'archived');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quiz_question_type') THEN
    CREATE TYPE public.quiz_question_type AS ENUM ('single_choice', 'multiple_choice', 'true_false');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quiz_attempt_status') THEN
    CREATE TYPE public.quiz_attempt_status AS ENUM ('in_progress', 'submitted', 'expired', 'cancelled');
  END IF;
END $$;

-- 2. CREATE / UPDATE TABLES

-- Quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status public.quiz_status NOT NULL DEFAULT 'draft',
  passing_score INT NOT NULL DEFAULT 70 CHECK (passing_score >= 0 AND passing_score <= 100),
  max_attempts INT NULL DEFAULT NULL,
  time_limit_minutes INT NULL DEFAULT NULL,
  shuffle_questions BOOLEAN NOT NULL DEFAULT false,
  shuffle_answers BOOLEAN NOT NULL DEFAULT false,
  show_correct_answers BOOLEAN NOT NULL DEFAULT true,
  show_explanations BOOLEAN NOT NULL DEFAULT true,
  required_for_completion BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all columns exist on quizzes if created previously
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quizzes' AND column_name='course_id') THEN
    ALTER TABLE public.quizzes ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quizzes' AND column_name='status') THEN
    ALTER TABLE public.quizzes ADD COLUMN status public.quiz_status NOT NULL DEFAULT 'draft';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quizzes' AND column_name='passing_score') THEN
    ALTER TABLE public.quizzes ADD COLUMN passing_score INT NOT NULL DEFAULT 70 CHECK (passing_score >= 0 AND passing_score <= 100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quizzes' AND column_name='max_attempts') THEN
    ALTER TABLE public.quizzes ADD COLUMN max_attempts INT NULL DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quizzes' AND column_name='time_limit_minutes') THEN
    ALTER TABLE public.quizzes ADD COLUMN time_limit_minutes INT NULL DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quizzes' AND column_name='shuffle_questions') THEN
    ALTER TABLE public.quizzes ADD COLUMN shuffle_questions BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quizzes' AND column_name='shuffle_answers') THEN
    ALTER TABLE public.quizzes ADD COLUMN shuffle_answers BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quizzes' AND column_name='show_correct_answers') THEN
    ALTER TABLE public.quizzes ADD COLUMN show_correct_answers BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quizzes' AND column_name='show_explanations') THEN
    ALTER TABLE public.quizzes ADD COLUMN show_explanations BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quizzes' AND column_name='required_for_completion') THEN
    ALTER TABLE public.quizzes ADD COLUMN required_for_completion BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quizzes' AND column_name='created_by') THEN
    ALTER TABLE public.quizzes ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quizzes' AND column_name='updated_at') THEN
    ALTER TABLE public.quizzes ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- Quiz Questions table
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'single_choice' CHECK (type IN ('single_choice', 'multiple_choice', 'true_false')),
  question_text TEXT NOT NULL,
  explanation TEXT,
  points INT NOT NULL DEFAULT 1 CHECK (points > 0),
  position INT NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT true,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_questions' AND column_name='question_text') THEN
    ALTER TABLE public.quiz_questions ADD COLUMN question_text TEXT NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_questions' AND column_name='required') THEN
    ALTER TABLE public.quiz_questions ADD COLUMN required BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_questions' AND column_name='settings_json') THEN
    ALTER TABLE public.quiz_questions ADD COLUMN settings_json JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_questions' AND column_name='updated_at') THEN
    ALTER TABLE public.quiz_questions ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- Quiz Answers table
CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quiz Attempts table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL DEFAULT 1,
  status public.quiz_attempt_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NULL,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  total_points NUMERIC(7,2) NOT NULL DEFAULT 0,
  earned_points NUMERIC(7,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_quiz_attempt UNIQUE (quiz_id, user_id, attempt_number)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_attempts' AND column_name='attempt_number') THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN attempt_number INT NOT NULL DEFAULT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_attempts' AND column_name='status') THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN status public.quiz_attempt_status NOT NULL DEFAULT 'in_progress';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_attempts' AND column_name='started_at') THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN started_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_attempts' AND column_name='submitted_at') THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN submitted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_attempts' AND column_name='expires_at') THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN expires_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_attempts' AND column_name='percentage') THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN percentage NUMERIC(5,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_attempts' AND column_name='total_points') THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN total_points NUMERIC(7,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_attempts' AND column_name='earned_points') THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN earned_points NUMERIC(7,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_attempts' AND column_name='updated_at') THEN
    ALTER TABLE public.quiz_attempts ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- Quiz Attempt Answers table
CREATE TABLE IF NOT EXISTS public.quiz_attempt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_answer_ids UUID[] NOT NULL DEFAULT '{}',
  is_correct BOOLEAN NULL,
  points_earned NUMERIC(7,2) NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_attempt_question UNIQUE (attempt_id, question_id)
);


-- 3. HELPER FUNCTIONS FOR SECURITY & INSTRUCTOR CHECKS
CREATE OR REPLACE FUNCTION public.quiz_is_course_instructor(p_quiz_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.quizzes q
    JOIN public.courses c ON c.id = q.course_id
    JOIN public.instructors i ON i.id = c.instructor_id
    WHERE q.id = p_quiz_id AND i.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.question_is_course_instructor(p_question_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.quiz_questions qq
    JOIN public.quizzes q ON q.id = qq.quiz_id
    JOIN public.courses c ON c.id = q.course_id
    JOIN public.instructors i ON i.id = c.instructor_id
    WHERE qq.id = p_question_id AND i.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.quiz_is_enrolled_student(p_quiz_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.quizzes q
    JOIN public.enrollments e ON e.course_id = q.course_id
    WHERE q.id = p_quiz_id
      AND e.user_id = auth.uid()
      AND e.status = 'active'::enrollment_status
  );
$$;


-- 4. ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempt_answers ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_answers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempt_answers TO authenticated;

GRANT SELECT ON public.quizzes TO anon;
GRANT SELECT ON public.quiz_questions TO anon;

-- Clean existing policies on quiz tables
DROP POLICY IF EXISTS "Quizzes read policy" ON public.quizzes;
DROP POLICY IF EXISTS "Quizzes manage policy" ON public.quizzes;
DROP POLICY IF EXISTS "Quizzes public read" ON public.quizzes;
DROP POLICY IF EXISTS "Admins manage quizzes" ON public.quizzes;

CREATE POLICY "Quizzes read policy" ON public.quizzes
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.quiz_is_course_instructor(id)
  OR (status = 'published' AND public.quiz_is_enrolled_student(id))
);

CREATE POLICY "Quizzes write policy" ON public.quizzes
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.quiz_is_course_instructor(id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.courses c
    JOIN public.instructors i ON i.id = c.instructor_id
    WHERE c.id = course_id AND i.user_id = auth.uid()
  )
);

-- Questions Policies
DROP POLICY IF EXISTS "Questions read policy" ON public.quiz_questions;
DROP POLICY IF EXISTS "Questions write policy" ON public.quiz_questions;
DROP POLICY IF EXISTS "Questions public read" ON public.quiz_questions;
DROP POLICY IF EXISTS "Admins manage questions" ON public.quiz_questions;

CREATE POLICY "Questions read policy" ON public.quiz_questions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = quiz_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.quiz_is_course_instructor(q.id)
        OR (q.status = 'published' AND public.quiz_is_enrolled_student(q.id))
      )
  )
);

CREATE POLICY "Questions write policy" ON public.quiz_questions
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.question_is_course_instructor(id)
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = quiz_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.quiz_is_course_instructor(q.id)
      )
  )
);

-- Answers Policies: CRITICAL: Students CANNOT SELECT quiz_answers directly via REST to prevent leaking is_correct!
DROP POLICY IF EXISTS "Answers read policy" ON public.quiz_answers;
DROP POLICY IF EXISTS "Answers write policy" ON public.quiz_answers;
DROP POLICY IF EXISTS "Options public read" ON public.quiz_options;
DROP POLICY IF EXISTS "Admins manage options" ON public.quiz_options;

CREATE POLICY "Answers read policy" ON public.quiz_answers
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.question_is_course_instructor(question_id)
);

CREATE POLICY "Answers write policy" ON public.quiz_answers
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.question_is_course_instructor(question_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.question_is_course_instructor(question_id)
);

-- Attempts Policies
DROP POLICY IF EXISTS "Attempts read policy" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Attempts write policy" ON public.quiz_attempts;

CREATE POLICY "Attempts read policy" ON public.quiz_attempts
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.quiz_is_course_instructor(quiz_id)
);

CREATE POLICY "Attempts write policy" ON public.quiz_attempts
FOR ALL TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);

-- Attempt Answers Policies
DROP POLICY IF EXISTS "Attempt answers read policy" ON public.quiz_attempt_answers;
DROP POLICY IF EXISTS "Attempt answers write policy" ON public.quiz_attempt_answers;

CREATE POLICY "Attempt answers read policy" ON public.quiz_attempt_answers
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa
    WHERE qa.id = attempt_id
      AND (
        qa.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR public.quiz_is_course_instructor(qa.quiz_id)
      )
  )
);

CREATE POLICY "Attempt answers write policy" ON public.quiz_attempt_answers
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa
    WHERE qa.id = attempt_id AND qa.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa
    WHERE qa.id = attempt_id AND qa.user_id = auth.uid()
  )
);


-- 5. RPC FUNCTIONS

-- Function 1: publish_quiz_rpc
CREATE OR REPLACE FUNCTION public.publish_quiz_rpc(p_quiz_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quiz RECORD;
  v_question RECORD;
  v_question_count INT;
  v_answer_count INT;
  v_correct_count INT;
  v_total_points INT := 0;
BEGIN
  -- Verify caller authority
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.quiz_is_course_instructor(p_quiz_id)) THEN
    RAISE EXCEPTION 'Acceso denegado: No tienes permisos para publicar este cuestionario.';
  END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El cuestionario no existe.';
  END IF;

  -- Verify questions exist
  SELECT COUNT(*) INTO v_question_count FROM public.quiz_questions WHERE quiz_id = p_quiz_id;
  IF v_question_count < 1 THEN
    RAISE EXCEPTION 'No se puede publicar un cuestionario sin preguntas.';
  END IF;

  -- Validate each question and answers
  FOR v_question IN SELECT * FROM public.quiz_questions WHERE quiz_id = p_quiz_id LOOP
    IF v_question.points <= 0 THEN
      RAISE EXCEPTION 'La pregunta "%" debe tener un puntaje mayor a cero.', v_question.question_text;
    END IF;

    v_total_points := v_total_points + v_question.points;

    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_correct = true)
    INTO v_answer_count, v_correct_count
    FROM public.quiz_answers
    WHERE question_id = v_question.id;

    IF v_question.type = 'single_choice' THEN
      IF v_answer_count < 2 THEN
        RAISE EXCEPTION 'La pregunta de selección única "%" debe tener al menos 2 opciones.', v_question.question_text;
      END IF;
      IF v_correct_count <> 1 THEN
        RAISE EXCEPTION 'La pregunta de selección única "%" debe tener exactamente 1 respuesta correcta.', v_question.question_text;
      END IF;
    ELSIF v_question.type = 'multiple_choice' THEN
      IF v_answer_count < 2 THEN
        RAISE EXCEPTION 'La pregunta de opción múltiple "%" debe tener al menos 2 opciones.', v_question.question_text;
      END IF;
      IF v_correct_count < 1 THEN
        RAISE EXCEPTION 'La pregunta de opción múltiple "%" debe tener al menos 1 respuesta correcta.', v_question.question_text;
      END IF;
    ELSIF v_question.type = 'true_false' THEN
      IF v_answer_count <> 2 THEN
        RAISE EXCEPTION 'La pregunta de Verdadero/Falso "%" debe tener exactamente 2 opciones.', v_question.question_text;
      END IF;
      IF v_correct_count <> 1 THEN
        RAISE EXCEPTION 'La pregunta de Verdadero/Falso "%" debe tener exactamente 1 respuesta correcta.', v_question.question_text;
      END IF;
    END IF;
  END LOOP;

  IF v_total_points <= 0 THEN
    RAISE EXCEPTION 'El puntaje total del cuestionario debe ser mayor a cero.';
  END IF;

  UPDATE public.quizzes
  SET status = 'published', updated_at = now()
  WHERE id = p_quiz_id;

  RETURN jsonb_build_object('success', true, 'status', 'published', 'total_points', v_total_points);
END;
$$;


-- Function 2: start_quiz_attempt_rpc
CREATE OR REPLACE FUNCTION public.start_quiz_attempt_rpc(p_quiz_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_quiz RECORD;
  v_existing_attempt RECORD;
  v_attempt_count INT;
  v_attempt_number INT;
  v_expires_at TIMESTAMPTZ := NULL;
  v_new_attempt_id UUID;
  v_questions JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para realizar un cuestionario.';
  END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuestionario no encontrado.';
  END IF;

  IF v_quiz.status <> 'published' AND NOT (public.has_role(v_user_id, 'admin') OR public.quiz_is_course_instructor(p_quiz_id)) THEN
    RAISE EXCEPTION 'El cuestionario no se encuentra publicado.';
  END IF;

  -- Validate enrollment
  IF NOT (public.has_role(v_user_id, 'admin') OR public.quiz_is_course_instructor(p_quiz_id) OR public.quiz_is_enrolled_student(p_quiz_id)) THEN
    RAISE EXCEPTION 'Debes estar inscrito activamente en el curso para realizar este cuestionario.';
  END IF;

  -- Check existing active attempt
  SELECT * INTO v_existing_attempt
  FROM public.quiz_attempts
  WHERE quiz_id = p_quiz_id AND user_id = v_user_id AND status = 'in_progress'
  ORDER BY attempt_number DESC
  LIMIT 1;

  IF v_existing_attempt.id IS NOT NULL THEN
    -- Check if existing attempt expired
    IF v_existing_attempt.expires_at IS NOT NULL AND now() > (v_existing_attempt.expires_at + interval '5 seconds') THEN
      UPDATE public.quiz_attempts SET status = 'expired', updated_at = now() WHERE id = v_existing_attempt.id;
    ELSE
      -- Return active attempt and questions without is_correct
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'type', q.type,
          'question_text', q.question_text,
          'explanation', NULL,
          'points', q.points,
          'position', q.position,
          'answers', (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', a.id,
                'question_id', a.question_id,
                'answer_text', a.answer_text,
                'position', a.position
              ) ORDER BY CASE WHEN v_quiz.shuffle_answers THEN random() ELSE a.position END
            )
            FROM public.quiz_answers a
            WHERE a.question_id = q.id
          )
        ) ORDER BY CASE WHEN v_quiz.shuffle_questions THEN random() ELSE q.position END
      ) INTO v_questions
      FROM public.quiz_questions q
      WHERE q.quiz_id = p_quiz_id;

      RETURN jsonb_build_object(
        'attempt', to_jsonb(v_existing_attempt),
        'quiz', jsonb_build_object(
          'id', v_quiz.id,
          'course_id', v_quiz.course_id,
          'module_id', v_quiz.module_id,
          'lesson_id', v_quiz.lesson_id,
          'title', v_quiz.title,
          'description', v_quiz.description,
          'passing_score', v_quiz.passing_score,
          'max_attempts', v_quiz.max_attempts,
          'time_limit_minutes', v_quiz.time_limit_minutes,
          'shuffle_questions', v_quiz.shuffle_questions,
          'shuffle_answers', v_quiz.shuffle_answers,
          'show_correct_answers', v_quiz.show_correct_answers,
          'show_explanations', v_quiz.show_explanations,
          'required_for_completion', v_quiz.required_for_completion
        ),
        'questions', COALESCE(v_questions, '[]'::jsonb)
      );
    END IF;
  END IF;

  -- Check max_attempts limit
  SELECT COUNT(*) INTO v_attempt_count
  FROM public.quiz_attempts
  WHERE quiz_id = p_quiz_id AND user_id = v_user_id AND status IN ('submitted', 'expired');

  IF v_quiz.max_attempts IS NOT NULL AND v_attempt_count >= v_quiz.max_attempts THEN
    RAISE EXCEPTION 'Has alcanzado el número máximo de intentos (% de %) permitidos para este cuestionario.', v_attempt_count, v_quiz.max_attempts;
  END IF;

  v_attempt_number := v_attempt_count + 1;

  IF v_quiz.time_limit_minutes IS NOT NULL AND v_quiz.time_limit_minutes > 0 THEN
    v_expires_at := now() + (v_quiz.time_limit_minutes || ' minutes')::interval;
  END IF;

  INSERT INTO public.quiz_attempts (
    quiz_id,
    user_id,
    attempt_number,
    status,
    started_at,
    expires_at
  ) VALUES (
    p_quiz_id,
    v_user_id,
    v_attempt_number,
    'in_progress',
    now(),
    v_expires_at
  )
  RETURNING id INTO v_new_attempt_id;

  -- Record learning event
  INSERT INTO public.learning_events (user_id, course_id, lesson_id, event_type, metadata_json)
  VALUES (
    v_user_id,
    v_quiz.course_id,
    v_quiz.lesson_id,
    'quiz_started',
    jsonb_build_object('quiz_id', p_quiz_id, 'attempt_id', v_new_attempt_id, 'attempt_number', v_attempt_number)
  );

  -- Build questions and sanitized answers (without is_correct)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'type', q.type,
      'question_text', q.question_text,
      'explanation', NULL,
      'points', q.points,
      'position', q.position,
      'answers', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'question_id', a.question_id,
            'answer_text', a.answer_text,
            'position', a.position
          ) ORDER BY CASE WHEN v_quiz.shuffle_answers THEN random() ELSE a.position END
        )
        FROM public.quiz_answers a
        WHERE a.question_id = q.id
      )
    ) ORDER BY CASE WHEN v_quiz.shuffle_questions THEN random() ELSE q.position END
  ) INTO v_questions
  FROM public.quiz_questions q
  WHERE q.quiz_id = p_quiz_id;

  RETURN jsonb_build_object(
    'attempt', (SELECT to_jsonb(qa) FROM public.quiz_attempts qa WHERE qa.id = v_new_attempt_id),
    'quiz', jsonb_build_object(
      'id', v_quiz.id,
      'course_id', v_quiz.course_id,
      'module_id', v_quiz.module_id,
      'lesson_id', v_quiz.lesson_id,
      'title', v_quiz.title,
      'description', v_quiz.description,
      'passing_score', v_quiz.passing_score,
      'max_attempts', v_quiz.max_attempts,
      'time_limit_minutes', v_quiz.time_limit_minutes,
      'shuffle_questions', v_quiz.shuffle_questions,
      'shuffle_answers', v_quiz.shuffle_answers,
      'show_correct_answers', v_quiz.show_correct_answers,
      'show_explanations', v_quiz.show_explanations,
      'required_for_completion', v_quiz.required_for_completion
    ),
    'questions', COALESCE(v_questions, '[]'::jsonb)
  );
END;
$$;


-- Function 3: save_quiz_answer_rpc
CREATE OR REPLACE FUNCTION public.save_quiz_answer_rpc(
  p_attempt_id UUID,
  p_question_id UUID,
  p_selected_answer_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_attempt RECORD;
  v_question RECORD;
  v_quiz RECORD;
  v_invalid_answers INT;
  v_cardinality INT := cardinality(p_selected_answer_ids);
BEGIN
  SELECT * INTO v_attempt FROM public.quiz_attempts WHERE id = p_attempt_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intento de cuestionario no encontrado.';
  END IF;

  IF v_attempt.user_id <> v_user_id THEN
    RAISE EXCEPTION 'Acceso denegado: No eres el propietario de este intento.';
  END IF;

  IF v_attempt.status <> 'in_progress' THEN
    RAISE EXCEPTION 'El intento ya no está en progreso.';
  END IF;

  -- Expiration check with 10s grace period for network latency
  IF v_attempt.expires_at IS NOT NULL AND now() > (v_attempt.expires_at + interval '10 seconds') THEN
    UPDATE public.quiz_attempts SET status = 'expired', updated_at = now() WHERE id = p_attempt_id;
    INSERT INTO public.learning_events (user_id, course_id, event_type, metadata_json)
    SELECT v_user_id, q.course_id, 'quiz_expired', jsonb_build_object('attempt_id', p_attempt_id)
    FROM public.quizzes q WHERE q.id = v_attempt.quiz_id;

    RAISE EXCEPTION 'El tiempo del intento ha expirado.';
  END IF;

  SELECT * INTO v_question FROM public.quiz_questions WHERE id = p_question_id;
  IF NOT FOUND OR v_question.quiz_id <> v_attempt.quiz_id THEN
    RAISE EXCEPTION 'La pregunta no pertenece a este cuestionario.';
  END IF;

  -- Validate answer selection cardinality
  IF v_question.type IN ('single_choice', 'true_false') AND v_cardinality > 1 THEN
    RAISE EXCEPTION 'Solo puedes seleccionar una opción para este tipo de pregunta.';
  END IF;

  -- Validate answer IDs belong to question
  IF v_cardinality > 0 THEN
    SELECT COUNT(*) INTO v_invalid_answers
    FROM unnest(p_selected_answer_ids) AS aid
    WHERE aid NOT IN (SELECT id FROM public.quiz_answers WHERE question_id = p_question_id);

    IF v_invalid_answers > 0 THEN
      RAISE EXCEPTION 'Una o varias opciones seleccionadas no son válidas para esta pregunta.';
    END IF;
  END IF;

  -- Upsert answer
  INSERT INTO public.quiz_attempt_answers (
    attempt_id,
    question_id,
    selected_answer_ids,
    answered_at
  ) VALUES (
    p_attempt_id,
    p_question_id,
    COALESCE(p_selected_answer_ids, '{}'),
    now()
  )
  ON CONFLICT (attempt_id, question_id)
  DO UPDATE SET
    selected_answer_ids = EXCLUDED.selected_answer_ids,
    answered_at = now(),
    updated_at = now();

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_attempt.quiz_id;

  INSERT INTO public.learning_events (user_id, course_id, lesson_id, event_type, metadata_json)
  VALUES (
    v_user_id,
    v_quiz.course_id,
    v_quiz.lesson_id,
    'quiz_answer_saved',
    jsonb_build_object('attempt_id', p_attempt_id, 'question_id', p_question_id)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;


-- Function 4: submit_quiz_attempt_rpc
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt_rpc(p_attempt_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_attempt RECORD;
  v_quiz RECORD;
  v_question RECORD;
  v_selected_ids UUID[];
  v_correct_ids UUID[];
  v_is_correct BOOLEAN;
  v_points_earned NUMERIC(7,2);
  v_total_earned NUMERIC(7,2) := 0;
  v_total_points NUMERIC(7,2) := 0;
  v_percentage NUMERIC(5,2) := 0;
  v_passed BOOLEAN := false;
  v_details JSONB := '[]'::jsonb;
  v_user_answers JSONB;
BEGIN
  SELECT * INTO v_attempt FROM public.quiz_attempts WHERE id = p_attempt_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intento no encontrado.';
  END IF;

  IF v_attempt.user_id <> v_user_id THEN
    RAISE EXCEPTION 'Acceso denegado: No eres el propietario de este intento.';
  END IF;

  IF v_attempt.status <> 'in_progress' THEN
    RAISE EXCEPTION 'El intento ya ha sido enviado o finalizado.';
  END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_attempt.quiz_id;

  -- Check expiration
  IF v_attempt.expires_at IS NOT NULL AND now() > (v_attempt.expires_at + interval '10 seconds') THEN
    UPDATE public.quiz_attempts SET status = 'expired', updated_at = now() WHERE id = p_attempt_id;

    INSERT INTO public.learning_events (user_id, course_id, event_type, metadata_json)
    VALUES (v_user_id, v_quiz.course_id, 'quiz_expired', jsonb_build_object('attempt_id', p_attempt_id));
  END IF;

  -- Grade every question in quiz
  FOR v_question IN SELECT * FROM public.quiz_questions WHERE quiz_id = v_quiz.id ORDER BY position ASC LOOP
    v_total_points := v_total_points + v_question.points;

    SELECT selected_answer_ids INTO v_selected_ids
    FROM public.quiz_attempt_answers
    WHERE attempt_id = p_attempt_id AND question_id = v_question.id;

    v_selected_ids := COALESCE(v_selected_ids, '{}');

    SELECT array_agg(id ORDER BY id) INTO v_correct_ids
    FROM public.quiz_answers
    WHERE question_id = v_question.id AND is_correct = true;

    v_correct_ids := COALESCE(v_correct_ids, '{}');

    -- Grading rule logic
    IF v_question.type IN ('single_choice', 'true_false') THEN
      IF cardinality(v_selected_ids) = 1 AND cardinality(v_correct_ids) = 1 AND v_selected_ids[1] = v_correct_ids[1] THEN
        v_is_correct := true;
        v_points_earned := v_question.points;
      ELSE
        v_is_correct := false;
        v_points_earned := 0;
      END IF;
    ELSIF v_question.type = 'multiple_choice' THEN
      -- Strict set equality for multiple choice
      IF v_selected_ids <@ v_correct_ids AND v_correct_ids <@ v_selected_ids AND cardinality(v_selected_ids) = cardinality(v_correct_ids) THEN
        v_is_correct := true;
        v_points_earned := v_question.points;
      ELSE
        v_is_correct := false;
        v_points_earned := 0;
      END IF;
    ELSE
      v_is_correct := false;
      v_points_earned := 0;
    END IF;

    v_total_earned := v_total_earned + v_points_earned;

    -- Update or insert graded answer
    INSERT INTO public.quiz_attempt_answers (
      attempt_id,
      question_id,
      selected_answer_ids,
      is_correct,
      points_earned,
      answered_at
    ) VALUES (
      p_attempt_id,
      v_question.id,
      v_selected_ids,
      v_is_correct,
      v_points_earned,
      now()
    )
    ON CONFLICT (attempt_id, question_id)
    DO UPDATE SET
      is_correct = EXCLUDED.is_correct,
      points_earned = EXCLUDED.points_earned,
      updated_at = now();

    -- Build feedback details
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'answer_text', a.answer_text,
        'position', a.position,
        'is_correct', CASE WHEN v_quiz.show_correct_answers THEN a.is_correct ELSE NULL END,
        'selected', a.id = ANY(v_selected_ids)
      ) ORDER BY a.position ASC
    ) INTO v_user_answers
    FROM public.quiz_answers a
    WHERE a.question_id = v_question.id;

    v_details := v_details || jsonb_build_array(
      jsonb_build_object(
        'question_id', v_question.id,
        'question_text', v_question.question_text,
        'type', v_question.type,
        'points', v_question.points,
        'points_earned', v_points_earned,
        'is_correct', v_is_correct,
        'explanation', CASE WHEN v_quiz.show_explanations THEN v_question.explanation ELSE NULL END,
        'answers', v_user_answers
      )
    );
  END LOOP;

  IF v_total_points > 0 THEN
    v_percentage := round((v_total_earned / v_total_points * 100.0)::numeric, 2);
  ELSE
    v_percentage := 0;
  END IF;

  v_passed := (v_percentage >= v_quiz.passing_score);

  UPDATE public.quiz_attempts
  SET
    status = 'submitted',
    submitted_at = now(),
    earned_points = v_total_earned,
    total_points = v_total_points,
    score = v_percentage,
    percentage = v_percentage,
    passed = v_passed,
    updated_at = now()
  WHERE id = p_attempt_id;

  -- Record submission events
  INSERT INTO public.learning_events (user_id, course_id, lesson_id, event_type, metadata_json)
  VALUES (
    v_user_id,
    v_quiz.course_id,
    v_quiz.lesson_id,
    'quiz_submitted',
    jsonb_build_object('attempt_id', p_attempt_id, 'score', v_percentage, 'passed', v_passed)
  );

  IF v_passed THEN
    INSERT INTO public.learning_events (user_id, course_id, lesson_id, event_type, metadata_json)
    VALUES (v_user_id, v_quiz.course_id, v_quiz.lesson_id, 'quiz_passed', jsonb_build_object('attempt_id', p_attempt_id, 'score', v_percentage));

    -- Update lesson_progress automatically if quiz is associated to a lesson and required
    IF v_quiz.lesson_id IS NOT NULL AND v_quiz.required_for_completion THEN
      INSERT INTO public.lesson_progress (
        user_id,
        lesson_id,
        course_id,
        completed,
        status,
        completed_at,
        updated_at
      ) VALUES (
        v_user_id,
        v_quiz.lesson_id,
        v_quiz.course_id,
        true,
        'completed',
        now(),
        now()
      )
      ON CONFLICT (user_id, lesson_id)
      DO UPDATE SET
        completed = true,
        status = 'completed',
        completed_at = COALESCE(public.lesson_progress.completed_at, now()),
        updated_at = now();
    END IF;
  ELSE
    INSERT INTO public.learning_events (user_id, course_id, lesson_id, event_type, metadata_json)
    VALUES (v_user_id, v_quiz.course_id, v_quiz.lesson_id, 'quiz_failed', jsonb_build_object('attempt_id', p_attempt_id, 'score', v_percentage));
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'attempt_id', p_attempt_id,
    'passed', v_passed,
    'score', v_percentage,
    'percentage', v_percentage,
    'earned_points', v_total_earned,
    'total_points', v_total_points,
    'passing_score', v_quiz.passing_score,
    'show_correct_answers', v_quiz.show_correct_answers,
    'show_explanations', v_quiz.show_explanations,
    'details', v_details
  );
END;
$$;


-- Function 5: get_quiz_statistics_rpc
CREATE OR REPLACE FUNCTION public.get_quiz_statistics_rpc(p_quiz_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quiz RECORD;
  v_total_students INT := 0;
  v_attempts_started INT := 0;
  v_attempts_completed INT := 0;
  v_passed_attempts INT := 0;
  v_pass_rate NUMERIC(5,2) := 0;
  v_avg_score NUMERIC(5,2) := 0;
  v_score_distribution JSONB;
  v_student_attempts JSONB;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.quiz_is_course_instructor(p_quiz_id)) THEN
    RAISE EXCEPTION 'Acceso denegado: No tienes permisos para ver las estadísticas de este cuestionario.';
  END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuestionario no encontrado.';
  END IF;

  SELECT COUNT(DISTINCT user_id), COUNT(*), COUNT(*) FILTER (WHERE status = 'submitted'), COUNT(*) FILTER (WHERE status = 'submitted' AND passed = true)
  INTO v_total_students, v_attempts_started, v_attempts_completed, v_passed_attempts
  FROM public.quiz_attempts
  WHERE quiz_id = p_quiz_id;

  IF v_attempts_completed > 0 THEN
    v_pass_rate := round((v_passed_attempts::numeric / v_attempts_completed * 100.0), 2);

    SELECT round(AVG(percentage)::numeric, 2)
    INTO v_avg_score
    FROM public.quiz_attempts
    WHERE quiz_id = p_quiz_id AND status = 'submitted';
  END IF;

  -- Score distribution bins [0-20, 21-40, 41-60, 61-80, 81-100]
  SELECT jsonb_build_object(
    'range_0_20', COUNT(*) FILTER (WHERE percentage >= 0 AND percentage <= 20),
    'range_21_40', COUNT(*) FILTER (WHERE percentage > 20 AND percentage <= 40),
    'range_41_60', COUNT(*) FILTER (WHERE percentage > 40 AND percentage <= 60),
    'range_61_80', COUNT(*) FILTER (WHERE percentage > 60 AND percentage <= 80),
    'range_81_100', COUNT(*) FILTER (WHERE percentage > 80 AND percentage <= 100)
  ) INTO v_score_distribution
  FROM public.quiz_attempts
  WHERE quiz_id = p_quiz_id AND status = 'submitted';

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', qa.id,
      'user_id', qa.user_id,
      'user_email', u.email,
      'attempt_number', qa.attempt_number,
      'status', qa.status,
      'score', qa.score,
      'percentage', qa.percentage,
      'passed', qa.passed,
      'started_at', qa.started_at,
      'submitted_at', qa.submitted_at
    ) ORDER BY qa.created_at DESC
  ) INTO v_student_attempts
  FROM public.quiz_attempts qa
  LEFT JOIN auth.users u ON u.id = qa.user_id
  WHERE qa.quiz_id = p_quiz_id;

  RETURN jsonb_build_object(
    'quiz_id', p_quiz_id,
    'quiz_title', v_quiz.title,
    'total_students', v_total_students,
    'attempts_started', v_attempts_started,
    'attempts_completed', v_attempts_completed,
    'passed_attempts', v_passed_attempts,
    'pass_rate', v_pass_rate,
    'avg_score', v_avg_score,
    'score_distribution', COALESCE(v_score_distribution, '{}'::jsonb),
    'student_attempts', COALESCE(v_student_attempts, '[]'::jsonb)
  );
END;
$$;


-- Function 6: UPDATE update_lesson_progress_rpc to enforce required quizzes
CREATE OR REPLACE FUNCTION public.update_lesson_progress_rpc(
  p_lesson_id UUID,
  p_course_id UUID,
  p_completed BOOLEAN,
  p_status TEXT,
  p_seconds_spent INT DEFAULT 0,
  p_last_position INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_req_quiz_id UUID;
  v_quiz_passed BOOLEAN;
  v_module_id UUID;
  v_total_lessons INT := 0;
  v_completed_lessons INT := 0;
  v_module_percentage NUMERIC(5,2) := 0;
  v_course_total_lessons INT := 0;
  v_course_completed_lessons INT := 0;
  v_course_percentage NUMERIC(5,2) := 0;
  v_is_course_completed BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado.';
  END IF;

  -- If student is trying to mark lesson as completed, verify if a required quiz exists for this lesson
  IF p_completed = true THEN
    SELECT id INTO v_req_quiz_id
    FROM public.quizzes
    WHERE lesson_id = p_lesson_id AND required_for_completion = true AND status = 'published'
    LIMIT 1;

    IF v_req_quiz_id IS NOT NULL THEN
      SELECT passed INTO v_quiz_passed
      FROM public.quiz_attempts
      WHERE quiz_id = v_req_quiz_id AND user_id = v_user_id AND status = 'submitted' AND passed = true
      ORDER BY score DESC
      LIMIT 1;

      IF v_quiz_passed IS NOT TRUE THEN
        RAISE EXCEPTION 'No puedes completar esta lección sin haber aprobado el cuestionario obligatorio.';
      END IF;
    END IF;
  END IF;

  -- Upsert lesson progress
  INSERT INTO public.lesson_progress (
    user_id,
    lesson_id,
    course_id,
    completed,
    status,
    completed_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_lesson_id,
    p_course_id,
    p_completed,
    COALESCE(p_status, CASE WHEN p_completed THEN 'completed' ELSE 'in_progress' END),
    CASE WHEN p_completed THEN now() ELSE NULL END,
    now()
  )
  ON CONFLICT (user_id, lesson_id)
  DO UPDATE SET
    completed = EXCLUDED.completed,
    status = EXCLUDED.status,
    completed_at = CASE WHEN EXCLUDED.completed THEN COALESCE(public.lesson_progress.completed_at, now()) ELSE NULL END,
    updated_at = now();

  -- Recalculate module and course metrics
  SELECT module_id INTO v_module_id FROM public.lessons WHERE id = p_lesson_id;

  IF v_module_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_total_lessons FROM public.lessons WHERE module_id = v_module_id;
    SELECT COUNT(*) INTO v_completed_lessons
    FROM public.lesson_progress lp
    JOIN public.lessons l ON l.id = lp.lesson_id
    WHERE l.module_id = v_module_id AND lp.user_id = v_user_id AND lp.completed = true;

    IF v_total_lessons > 0 THEN
      v_module_percentage := round((v_completed_lessons::numeric / v_total_lessons * 100.0), 2);
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_course_total_lessons FROM public.lessons WHERE course_id = p_course_id;
  SELECT COUNT(*) INTO v_course_completed_lessons
  FROM public.lesson_progress
  WHERE course_id = p_course_id AND user_id = v_user_id AND completed = true;

  IF v_course_total_lessons > 0 THEN
    v_course_percentage := round((v_course_completed_lessons::numeric / v_course_total_lessons * 100.0), 2);
    IF v_course_completed_lessons >= v_course_total_lessons THEN
      v_is_course_completed := true;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'completed', p_completed,
    'status', COALESCE(p_status, 'in_progress'),
    'modulePercentage', v_module_percentage,
    'coursePercentage', v_course_percentage,
    'isCourseCompleted', v_is_course_completed
  );
END;
$$;
