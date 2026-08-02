-- Migration: Sprint 2.6 Robustness & Security Patch
-- Restores Learning Engine Sprint 2.5 with mandatory quiz checks, RPC security, persistent shuffling, lock concurrency, expiration handling, model constraints, and transactional progress integration.

-- 1. Model Constraints & Schema Alterations
ALTER TABLE public.quizzes ALTER COLUMN course_id SET NOT NULL;

ALTER TABLE public.quizzes DROP CONSTRAINT IF EXISTS check_max_attempts;
ALTER TABLE public.quizzes ADD CONSTRAINT check_max_attempts CHECK (max_attempts IS NULL OR max_attempts > 0);

ALTER TABLE public.quizzes DROP CONSTRAINT IF EXISTS check_time_limit_minutes;
ALTER TABLE public.quizzes ADD CONSTRAINT check_time_limit_minutes CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0);

ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS shuffled_question_ids JSONB NULL;
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS shuffled_answer_ids_map JSONB NULL;
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS last_visited_index INT NOT NULL DEFAULT 0;

-- Unique active attempt per user and quiz
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_quiz_attempt ON public.quiz_attempts (user_id, quiz_id) WHERE status = 'in_progress';

-- 2. Helper: check if instructor owns course of quiz
CREATE OR REPLACE FUNCTION public.quiz_is_course_instructor(p_quiz_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_course_id UUID;
BEGIN
  IF v_user_id IS NULL THEN RETURN false; END IF;
  SELECT course_id INTO v_course_id FROM public.quizzes WHERE id = p_quiz_id;
  IF v_course_id IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.courses c
    JOIN public.instructors i ON i.id = c.instructor_id
    WHERE c.id = v_course_id AND i.user_id = v_user_id
  );
END;
$$;

-- 3. publish_quiz_rpc with strict model validations
CREATE OR REPLACE FUNCTION public.publish_quiz_rpc(p_quiz_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_quiz RECORD;
  v_q RECORD;
  v_total_points INT := 0;
  v_questions_count INT := 0;
  v_ans_count INT;
  v_correct_count INT;
  v_incorrect_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id;
  IF v_quiz.id IS NULL THEN
    RAISE EXCEPTION 'Cuestionario no encontrado';
  END IF;

  IF NOT (public.has_role(v_user_id, 'admin') OR public.quiz_is_course_instructor(p_quiz_id)) THEN
    RAISE EXCEPTION 'No tienes permiso para publicar este cuestionario';
  END IF;

  -- Validate module_id belongs to course_id if specified
  IF v_quiz.module_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.modules WHERE id = v_quiz.module_id AND course_id = v_quiz.course_id) THEN
      RAISE EXCEPTION 'El módulo especificado no pertenece al curso seleccionado';
    END IF;
  END IF;

  -- Validate lesson_id belongs to course_id if specified
  IF v_quiz.lesson_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.lessons WHERE id = v_quiz.lesson_id AND course_id = v_quiz.course_id) THEN
      RAISE EXCEPTION 'La lección especificada no pertenece al curso seleccionado';
    END IF;
    IF v_quiz.module_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM public.lessons WHERE id = v_quiz.lesson_id AND module_id = v_quiz.module_id) THEN
        RAISE EXCEPTION 'La lección especificada no pertenece al módulo seleccionado';
      END IF;
    END IF;
  END IF;

  -- Check questions exist
  SELECT COUNT(*) INTO v_questions_count FROM public.quiz_questions WHERE quiz_id = p_quiz_id;
  IF v_questions_count = 0 THEN
    RAISE EXCEPTION 'El cuestionario no tiene preguntas activas para ser publicado';
  END IF;

  -- Validate each question & its options
  FOR v_q IN SELECT * FROM public.quiz_questions WHERE quiz_id = p_quiz_id ORDER BY position ASC LOOP
    IF TRIM(COALESCE(v_q.question_text, '')) = '' THEN
      RAISE EXCEPTION 'La pregunta en posición % tiene un enunciado vacío', v_q.position;
    END IF;

    IF v_q.points <= 0 THEN
      RAISE EXCEPTION 'La pregunta "%" debe tener un puntaje mayor a 0', v_q.question_text;
    END IF;

    v_total_points := v_total_points + v_q.points;

    -- Validate answers count & content
    SELECT COUNT(*),
           COUNT(*) FILTER (WHERE is_correct = true),
           COUNT(*) FILTER (WHERE is_correct = false)
    INTO v_ans_count, v_correct_count, v_incorrect_count
    FROM public.quiz_answers
    WHERE question_id = v_q.id;

    -- Check empty answer text
    IF EXISTS (SELECT 1 FROM public.quiz_answers WHERE question_id = v_q.id AND TRIM(COALESCE(answer_text, '')) = '') THEN
      RAISE EXCEPTION 'La pregunta "%" contiene una respuesta con texto vacío', v_q.question_text;
    END IF;

    IF v_q.type = 'single_choice' THEN
      IF v_ans_count < 2 THEN
        RAISE EXCEPTION 'La pregunta "%" requiere al menos 2 opciones', v_q.question_text;
      END IF;
      IF v_correct_count <> 1 THEN
        RAISE EXCEPTION 'La pregunta "%" debe tener exactamente 1 respuesta correcta', v_q.question_text;
      END IF;
    ELSIF v_q.type = 'multiple_choice' THEN
      IF v_ans_count < 2 THEN
        RAISE EXCEPTION 'La pregunta "%" requiere al menos 2 opciones', v_q.question_text;
      END IF;
      IF v_correct_count < 1 THEN
        RAISE EXCEPTION 'La pregunta "%" debe tener al menos 1 respuesta correcta', v_q.question_text;
      END IF;
      IF v_incorrect_count < 1 THEN
        RAISE EXCEPTION 'La pregunta "%" de opción múltiple debe tener al menos 1 respuesta incorrecta', v_q.question_text;
      END IF;
    ELSIF v_q.type = 'true_false' THEN
      IF v_ans_count <> 2 THEN
        RAISE EXCEPTION 'La pregunta de Verdadero/Falso "%" debe tener exactamente 2 opciones', v_q.question_text;
      END IF;
      IF v_correct_count <> 1 THEN
        RAISE EXCEPTION 'La pregunta "%" debe tener exactamente 1 respuesta correcta', v_q.question_text;
      END IF;
    END IF;
  END LOOP;

  -- Update status to published
  UPDATE public.quizzes
  SET status = 'published', updated_at = now()
  WHERE id = p_quiz_id;

  RETURN json_build_object(
    'success', true,
    'quiz_id', p_quiz_id,
    'questions_count', v_questions_count,
    'total_points', v_total_points
  );
END;
$$;

-- 4. Learning Engine Sync Helper for Quiz Completions
CREATE OR REPLACE FUNCTION public.sync_quiz_completion_progress(p_user_id UUID, p_quiz_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_quiz RECORD;
  v_all_passed BOOLEAN;
  v_now TIMESTAMPTZ := now();
  v_total_module_lessons INT;
  v_completed_module_lessons INT;
  v_module_percentage NUMERIC(5,2);
  v_total_course_lessons INT;
  v_completed_course_lessons INT;
  v_total_course_modules INT;
  v_completed_course_modules INT;
  v_course_percentage NUMERIC(5,2);
  v_unpassed_mod_quizzes INT;
  v_unpassed_course_quizzes INT;
BEGIN
  SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id;
  IF v_quiz.id IS NULL THEN RETURN; END IF;

  -- If quiz is linked to a lesson, check if all required quizzes for that lesson are now passed
  IF v_quiz.lesson_id IS NOT NULL THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.lesson_id = v_quiz.lesson_id
        AND q.status = 'published'
        AND q.required_for_completion = true
        AND NOT EXISTS (
          SELECT 1 FROM public.quiz_attempts qa
          WHERE qa.quiz_id = q.id
            AND qa.user_id = p_user_id
            AND qa.status = 'submitted'
            AND qa.passed = true
        )
    ) INTO v_all_passed;

    IF v_all_passed THEN
      -- Upsert lesson completion
      INSERT INTO public.lesson_progress (
        user_id, course_id, lesson_id, status, completed, completed_at, updated_at
      )
      VALUES (
        p_user_id, v_quiz.course_id, v_quiz.lesson_id, 'completed', true, v_now, v_now
      )
      ON CONFLICT (user_id, lesson_id) DO UPDATE SET
        status = 'completed',
        completed = true,
        completed_at = COALESCE(lesson_progress.completed_at, v_now),
        updated_at = v_now;

      -- Record learning event idempotently
      IF NOT EXISTS (
        SELECT 1 FROM public.learning_events
        WHERE user_id = p_user_id AND lesson_id = v_quiz.lesson_id AND event_type = 'lesson_complete'
      ) THEN
        INSERT INTO public.learning_events (user_id, course_id, module_id, lesson_id, event_type, metadata)
        VALUES (p_user_id, v_quiz.course_id, v_quiz.module_id, v_quiz.lesson_id, 'lesson_complete', jsonb_build_object('trigger', 'quiz_passed'));
      END IF;
    END IF;
  END IF;

  -- Recalculate module progress if quiz belongs to a course
  IF v_quiz.module_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_total_module_lessons
    FROM public.lessons WHERE module_id = v_quiz.module_id AND status = 'published'::lesson_status;

    SELECT COUNT(*) INTO v_completed_module_lessons
    FROM public.lesson_progress lp
    JOIN public.lessons l ON l.id = lp.lesson_id
    WHERE lp.user_id = p_user_id AND l.module_id = v_quiz.module_id AND lp.completed = true;

    SELECT COUNT(*) INTO v_unpassed_mod_quizzes
    FROM public.quizzes q
    WHERE q.module_id = v_quiz.module_id AND q.lesson_id IS NULL AND q.status = 'published' AND q.required_for_completion = true
      AND NOT EXISTS (
        SELECT 1 FROM public.quiz_attempts qa
        WHERE qa.quiz_id = q.id AND qa.user_id = p_user_id AND qa.status = 'submitted' AND qa.passed = true
      );

    IF v_total_module_lessons > 0 THEN
      v_module_percentage := ROUND((v_completed_module_lessons::numeric / v_total_module_lessons::numeric) * 100, 2);
    ELSE
      v_module_percentage := 0;
    END IF;

    INSERT INTO public.module_progress (
      user_id, module_id, course_id, completed_lessons, total_lessons, percentage, completed_at, updated_at
    )
    VALUES (
      p_user_id, v_quiz.module_id, v_quiz.course_id, v_completed_module_lessons, v_total_module_lessons, v_module_percentage,
      CASE WHEN v_completed_module_lessons = v_total_module_lessons AND v_unpassed_mod_quizzes = 0 AND v_total_module_lessons > 0 THEN v_now ELSE NULL END,
      v_now
    )
    ON CONFLICT (user_id, module_id) DO UPDATE SET
      completed_lessons = EXCLUDED.completed_lessons,
      total_lessons = EXCLUDED.total_lessons,
      percentage = EXCLUDED.percentage,
      completed_at = EXCLUDED.completed_at,
      updated_at = v_now;
  END IF;

  -- Recalculate course progress
  SELECT COUNT(*) INTO v_total_course_lessons
  FROM public.lessons WHERE course_id = v_quiz.course_id AND status = 'published'::lesson_status;

  SELECT COUNT(*) INTO v_completed_course_lessons
  FROM public.lesson_progress lp
  JOIN public.lessons l ON l.id = lp.lesson_id
  WHERE lp.user_id = p_user_id AND l.course_id = v_quiz.course_id AND lp.completed = true;

  SELECT COUNT(*) INTO v_total_course_modules
  FROM public.modules WHERE course_id = v_quiz.course_id AND status = 'published'::lesson_status;

  SELECT COUNT(*) INTO v_completed_course_modules
  FROM public.module_progress mp
  WHERE mp.user_id = p_user_id AND mp.course_id = v_quiz.course_id AND mp.percentage = 100;

  SELECT COUNT(*) INTO v_unpassed_course_quizzes
  FROM public.quizzes q
  WHERE q.course_id = v_quiz.course_id AND q.status = 'published' AND q.required_for_completion = true
    AND NOT EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      WHERE qa.quiz_id = q.id AND qa.user_id = p_user_id AND qa.status = 'submitted' AND qa.passed = true
    );

  IF v_total_course_lessons > 0 THEN
    v_course_percentage := ROUND((v_completed_course_lessons::numeric / v_total_course_lessons::numeric) * 100, 2);
  ELSE
    v_course_percentage := 0;
  END IF;

  INSERT INTO public.course_progress (
    user_id, course_id, completed_modules, total_modules, completed_lessons, total_lessons,
    percentage, completed_at, last_lesson_id, updated_at
  )
  VALUES (
    p_user_id, v_quiz.course_id, v_completed_course_modules, v_total_course_modules,
    v_completed_course_lessons, v_total_course_lessons, v_course_percentage,
    CASE WHEN v_course_percentage = 100 AND v_unpassed_course_quizzes = 0 THEN v_now ELSE NULL END,
    v_quiz.lesson_id, v_now
  )
  ON CONFLICT (user_id, course_id) DO UPDATE SET
    completed_modules = EXCLUDED.completed_modules,
    total_modules = EXCLUDED.total_modules,
    completed_lessons = EXCLUDED.completed_lessons,
    total_lessons = EXCLUDED.total_lessons,
    percentage = EXCLUDED.percentage,
    completed_at = CASE WHEN EXCLUDED.percentage = 100 AND v_unpassed_course_quizzes = 0 THEN v_now ELSE NULL END,
    updated_at = v_now;

  UPDATE public.enrollments
  SET progress_percent = v_course_percentage,
      completed_at = CASE WHEN v_course_percentage = 100 AND v_unpassed_course_quizzes = 0 THEN COALESCE(completed_at, v_now) ELSE NULL END,
      updated_at = v_now
  WHERE user_id = p_user_id AND course_id = v_quiz.course_id;

  IF v_course_percentage = 100 AND v_unpassed_course_quizzes = 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.learning_events
      WHERE user_id = p_user_id AND course_id = v_quiz.course_id AND event_type = 'course_complete'
    ) THEN
      INSERT INTO public.learning_events (user_id, course_id, event_type, metadata)
      VALUES (p_user_id, v_quiz.course_id, 'course_complete', jsonb_build_object('completed_at', v_now));
    END IF;
  END IF;
END;
$$;

-- 5. Restore full Sprint 2.5 update_lesson_progress_rpc with mandatory quiz checks
CREATE OR REPLACE FUNCTION public.update_lesson_progress_rpc(
  p_lesson_id UUID,
  p_course_id UUID,
  p_completed BOOLEAN DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_seconds_spent INT DEFAULT 0,
  p_last_position INT DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_module_id UUID;
  v_is_completed BOOLEAN;
  v_status TEXT;
  v_total_module_lessons INT;
  v_completed_module_lessons INT;
  v_module_percentage NUMERIC(5,2);
  v_total_course_lessons INT;
  v_completed_course_lessons INT;
  v_total_course_modules INT;
  v_completed_course_modules INT;
  v_course_percentage NUMERIC(5,2);
  v_now TIMESTAMPTZ := now();
  v_result json;
  v_unpassed_lesson_quizzes INT;
  v_unpassed_mod_quizzes INT;
  v_unpassed_course_quizzes INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Check enrollment or admin/instructor active access
  IF NOT (
    public.has_role(v_user_id, 'admin') OR
    EXISTS (
      SELECT 1 FROM public.courses c
      JOIN public.instructors i ON i.id = c.instructor_id
      WHERE c.id = p_course_id AND i.user_id = v_user_id
    ) OR
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE user_id = v_user_id AND course_id = p_course_id AND status = 'active'::enrollment_status
    )
  ) THEN
    RAISE EXCEPTION 'No tienes inscripción activa en este curso.';
  END IF;

  -- Verify lesson exists & belongs to course
  SELECT module_id INTO v_module_id
  FROM public.lessons
  WHERE id = p_lesson_id AND course_id = p_course_id;

  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'Lección no pertenece al curso especificado.';
  END IF;

  -- Determine status and completed values
  IF p_completed IS TRUE THEN
    v_is_completed := true;
    v_status := 'completed';
  ELSIF p_status IS NOT NULL THEN
    v_status := p_status;
    v_is_completed := (p_status = 'completed');
  ELSE
    v_status := 'in_progress';
    v_is_completed := false;
  END IF;

  -- MANDATORY QUIZZES CHECK FOR LESSON COMPLETION
  IF v_is_completed THEN
    SELECT COUNT(*) INTO v_unpassed_lesson_quizzes
    FROM public.quizzes q
    WHERE q.lesson_id = p_lesson_id
      AND q.status = 'published'
      AND q.required_for_completion = true
      AND NOT EXISTS (
        SELECT 1 FROM public.quiz_attempts qa
        WHERE qa.quiz_id = q.id
          AND qa.user_id = v_user_id
          AND qa.status = 'submitted'
          AND qa.passed = true
      );

    IF v_unpassed_lesson_quizzes > 0 THEN
      RAISE EXCEPTION 'No puedes completar esta lección sin haber aprobado todos los cuestionarios obligatorios.';
    END IF;
  END IF;

  -- Upsert lesson_progress
  INSERT INTO public.lesson_progress (
    user_id, course_id, lesson_id, status, completed,
    started_at, completed_at, last_position, last_position_seconds,
    seconds_spent, time_spent_seconds, updated_at
  )
  VALUES (
    v_user_id, p_course_id, p_lesson_id, v_status, v_is_completed,
    v_now, CASE WHEN v_is_completed THEN v_now ELSE NULL END,
    p_last_position, p_last_position,
    GREATEST(p_seconds_spent, 0), GREATEST(p_seconds_spent, 0),
    v_now
  )
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET
    status = COALESCE(EXCLUDED.status, lesson_progress.status),
    completed = EXCLUDED.completed,
    completed_at = CASE
      WHEN EXCLUDED.completed THEN COALESCE(lesson_progress.completed_at, v_now)
      ELSE NULL
    END,
    last_position = GREATEST(EXCLUDED.last_position, lesson_progress.last_position),
    last_position_seconds = GREATEST(EXCLUDED.last_position_seconds, lesson_progress.last_position_seconds),
    seconds_spent = lesson_progress.seconds_spent + EXCLUDED.seconds_spent,
    time_spent_seconds = lesson_progress.time_spent_seconds + EXCLUDED.seconds_spent,
    updated_at = v_now;

  -- Calculate Module Progress
  SELECT COUNT(*) INTO v_total_module_lessons
  FROM public.lessons
  WHERE module_id = v_module_id AND status = 'published'::lesson_status;

  SELECT COUNT(*) INTO v_completed_module_lessons
  FROM public.lesson_progress lp
  JOIN public.lessons l ON l.id = lp.lesson_id
  WHERE lp.user_id = v_user_id AND l.module_id = v_module_id AND lp.completed = true;

  SELECT COUNT(*) INTO v_unpassed_mod_quizzes
  FROM public.quizzes q
  WHERE q.module_id = v_module_id AND q.lesson_id IS NULL AND q.status = 'published' AND q.required_for_completion = true
    AND NOT EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      WHERE qa.quiz_id = q.id AND qa.user_id = v_user_id AND qa.status = 'submitted' AND qa.passed = true
    );

  IF v_total_module_lessons > 0 THEN
    v_module_percentage := ROUND((v_completed_module_lessons::numeric / v_total_module_lessons::numeric) * 100, 2);
  ELSE
    v_module_percentage := 0;
  END IF;

  INSERT INTO public.module_progress (
    user_id, module_id, course_id, completed_lessons, total_lessons, percentage, completed_at, updated_at
  )
  VALUES (
    v_user_id, v_module_id, p_course_id, v_completed_module_lessons, v_total_module_lessons, v_module_percentage,
    CASE WHEN v_completed_module_lessons = v_total_module_lessons AND v_unpassed_mod_quizzes = 0 AND v_total_module_lessons > 0 THEN v_now ELSE NULL END,
    v_now
  )
  ON CONFLICT (user_id, module_id) DO UPDATE SET
    completed_lessons = EXCLUDED.completed_lessons,
    total_lessons = EXCLUDED.total_lessons,
    percentage = EXCLUDED.percentage,
    completed_at = CASE WHEN EXCLUDED.completed_lessons = EXCLUDED.total_lessons AND v_unpassed_mod_quizzes = 0 THEN v_now ELSE NULL END,
    updated_at = v_now;

  -- Calculate Course Progress
  SELECT COUNT(*) INTO v_total_course_lessons
  FROM public.lessons
  WHERE course_id = p_course_id AND status = 'published'::lesson_status;

  SELECT COUNT(*) INTO v_completed_course_lessons
  FROM public.lesson_progress lp
  JOIN public.lessons l ON l.id = lp.lesson_id
  WHERE lp.user_id = v_user_id AND l.course_id = p_course_id AND lp.completed = true;

  SELECT COUNT(*) INTO v_total_course_modules
  FROM public.modules
  WHERE course_id = p_course_id AND status = 'published'::lesson_status;

  SELECT COUNT(*) INTO v_completed_course_modules
  FROM public.module_progress mp
  WHERE mp.user_id = v_user_id AND mp.course_id = p_course_id AND mp.percentage = 100;

  SELECT COUNT(*) INTO v_unpassed_course_quizzes
  FROM public.quizzes q
  WHERE q.course_id = p_course_id AND q.status = 'published' AND q.required_for_completion = true
    AND NOT EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      WHERE qa.quiz_id = q.id AND qa.user_id = v_user_id AND qa.status = 'submitted' AND qa.passed = true
    );

  IF v_total_course_lessons > 0 THEN
    v_course_percentage := ROUND((v_completed_course_lessons::numeric / v_total_course_lessons::numeric) * 100, 2);
  ELSE
    v_course_percentage := 0;
  END IF;

  INSERT INTO public.course_progress (
    user_id, course_id, completed_modules, total_modules, completed_lessons, total_lessons,
    percentage, completed_at, last_lesson_id, updated_at
  )
  VALUES (
    v_user_id, p_course_id, v_completed_course_modules, v_total_course_modules,
    v_completed_course_lessons, v_total_course_lessons, v_course_percentage,
    CASE WHEN v_course_percentage = 100 AND v_unpassed_course_quizzes = 0 THEN v_now ELSE NULL END, p_lesson_id, v_now
  )
  ON CONFLICT (user_id, course_id) DO UPDATE SET
    completed_modules = EXCLUDED.completed_modules,
    total_modules = EXCLUDED.total_modules,
    completed_lessons = EXCLUDED.completed_lessons,
    total_lessons = EXCLUDED.total_lessons,
    percentage = EXCLUDED.percentage,
    completed_at = CASE WHEN EXCLUDED.percentage = 100 AND v_unpassed_course_quizzes = 0 THEN v_now ELSE NULL END,
    last_lesson_id = EXCLUDED.last_lesson_id,
    updated_at = v_now;

  -- Sync enrollment progress_percent & last_lesson_id
  UPDATE public.enrollments
  SET progress_percent = v_course_percentage,
      last_lesson_id = p_lesson_id,
      completed_at = CASE WHEN v_course_percentage = 100 AND v_unpassed_course_quizzes = 0 THEN COALESCE(completed_at, v_now) ELSE NULL END,
      updated_at = v_now
  WHERE user_id = v_user_id AND course_id = p_course_id;

  -- Record learning events
  INSERT INTO public.learning_events (user_id, course_id, module_id, lesson_id, event_type, metadata)
  VALUES (
    v_user_id, p_course_id, v_module_id, p_lesson_id,
    CASE WHEN v_is_completed THEN 'lesson_complete' ELSE 'lesson_progress_update' END,
    jsonb_build_object(
      'seconds_spent', p_seconds_spent,
      'last_position', p_last_position,
      'course_percentage', v_course_percentage
    )
  );

  IF v_course_percentage = 100 AND v_unpassed_course_quizzes = 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.learning_events
      WHERE user_id = v_user_id AND course_id = p_course_id AND event_type = 'course_complete'
    ) THEN
      INSERT INTO public.learning_events (user_id, course_id, event_type, metadata)
      VALUES (
        v_user_id, p_course_id, 'course_complete',
        jsonb_build_object('completed_at', v_now)
      );
    END IF;
  END IF;

  SELECT json_build_object(
    'status', v_status,
    'completed', v_is_completed,
    'module_percentage', v_module_percentage,
    'course_percentage', v_course_percentage,
    'is_course_completed', (v_course_percentage = 100 AND v_unpassed_course_quizzes = 0)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 6. start_quiz_attempt_rpc with Lock, Resuming state, Persistent Randomization, Expiration Check
CREATE OR REPLACE FUNCTION public.start_quiz_attempt_rpc(p_quiz_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_quiz RECORD;
  v_active_attempt RECORD;
  v_attempt_number INT;
  v_expires_at TIMESTAMPTZ;
  v_new_attempt_id UUID;
  v_q_ids JSONB;
  v_ans_map JSONB := '{}'::jsonb;
  v_q RECORD;
  v_ans RECORD;
  v_shuffled_ans_ids JSONB;
  v_questions_arr JSONB := '[]'::jsonb;
  v_answers_arr JSONB;
  v_saved_answers JSONB := '{}'::jsonb;
  v_qa RECORD;
  v_sub_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id;
  IF v_quiz.id IS NULL THEN
    RAISE EXCEPTION 'Cuestionario no encontrado';
  END IF;

  IF v_quiz.status <> 'published' THEN
    RAISE EXCEPTION 'El cuestionario no está publicado';
  END IF;

  -- Acquire transaction lock to prevent concurrent attempt starts
  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text || '_' || p_quiz_id::text));

  -- Check existing active attempt
  SELECT * INTO v_active_attempt
  FROM public.quiz_attempts
  WHERE user_id = v_user_id AND quiz_id = p_quiz_id AND status = 'in_progress';

  IF v_active_attempt.id IS NOT NULL THEN
    -- Check if active attempt has expired
    IF v_active_attempt.expires_at IS NOT NULL AND now() > (v_active_attempt.expires_at + interval '5 seconds') THEN
      UPDATE public.quiz_attempts SET status = 'expired', updated_at = now() WHERE id = v_active_attempt.id;

      IF NOT EXISTS (
        SELECT 1 FROM public.learning_events
        WHERE user_id = v_user_id AND event_type = 'quiz_expired' AND (metadata->>'attempt_id')::uuid = v_active_attempt.id
      ) THEN
        INSERT INTO public.learning_events (user_id, course_id, event_type, metadata)
        VALUES (v_user_id, v_quiz.course_id, 'quiz_expired', jsonb_build_object('quiz_id', p_quiz_id, 'attempt_id', v_active_attempt.id));
      END IF;

      -- Reset active attempt variable
      v_active_attempt := NULL;
    END IF;
  END IF;

  -- If still active after expiration check: return active attempt with persisted order and saved answers
  IF v_active_attempt.id IS NOT NULL THEN
    v_q_ids := v_active_attempt.shuffled_question_ids;
    v_ans_map := v_active_attempt.shuffled_answer_ids_map;

    -- Fetch saved answers
    FOR v_qa IN SELECT question_id, selected_answer_ids FROM public.quiz_attempt_answers WHERE attempt_id = v_active_attempt.id LOOP
      v_saved_answers := jsonb_set(v_saved_answers, ARRAY[v_qa.question_id::text], to_jsonb(v_qa.selected_answer_ids));
    END LOOP;

    -- Build questions array matching persisted order
    IF v_q_ids IS NOT NULL AND jsonb_array_length(v_q_ids) > 0 THEN
      FOR i IN 0..(jsonb_array_length(v_q_ids) - 1) LOOP
        SELECT * INTO v_q FROM public.quiz_questions WHERE id = (v_q_ids->>i)::uuid;
        IF v_q.id IS NOT NULL THEN
          v_shuffled_ans_ids := v_ans_map->(v_q.id::text);
          v_answers_arr := '[]'::jsonb;

          IF v_shuffled_ans_ids IS NOT NULL AND jsonb_array_length(v_shuffled_ans_ids) > 0 THEN
            FOR j IN 0..(jsonb_array_length(v_shuffled_ans_ids) - 1) LOOP
              SELECT * INTO v_ans FROM public.quiz_answers WHERE id = (v_shuffled_ans_ids->>j)::uuid;
              IF v_ans.id IS NOT NULL THEN
                v_answers_arr := v_answers_arr || jsonb_build_object(
                  'id', v_ans.id,
                  'question_id', v_ans.question_id,
                  'answer_text', v_ans.answer_text,
                  'position', j
                );
              END IF;
            END LOOP;
          ELSE
            FOR v_ans IN SELECT * FROM public.quiz_answers WHERE question_id = v_q.id ORDER BY position ASC LOOP
              v_answers_arr := v_answers_arr || jsonb_build_object(
                'id', v_ans.id,
                'question_id', v_ans.question_id,
                'answer_text', v_ans.answer_text,
                'position', v_ans.position
              );
            END LOOP;
          END IF;

          v_questions_arr := v_questions_arr || jsonb_build_object(
            'id', v_q.id,
            'quiz_id', v_q.quiz_id,
            'type', v_q.type,
            'question_text', v_q.question_text,
            'points', v_q.points,
            'position', i,
            'answers', v_answers_arr
          );
        END IF;
      END LOOP;
    ELSE
      -- Fallback if no stored question order
      FOR v_q IN SELECT * FROM public.quiz_questions WHERE quiz_id = p_quiz_id ORDER BY position ASC LOOP
        v_answers_arr := '[]'::jsonb;
        FOR v_ans IN SELECT * FROM public.quiz_answers WHERE question_id = v_q.id ORDER BY position ASC LOOP
          v_answers_arr := v_answers_arr || jsonb_build_object(
            'id', v_ans.id,
            'question_id', v_ans.question_id,
            'answer_text', v_ans.answer_text,
            'position', v_ans.position
          );
        END LOOP;
        v_questions_arr := v_questions_arr || jsonb_build_object(
          'id', v_q.id,
          'quiz_id', v_q.quiz_id,
          'type', v_q.type,
          'question_text', v_q.question_text,
          'points', v_q.points,
          'position', v_q.position,
          'answers', v_answers_arr
        );
      END LOOP;
    END IF;

    RETURN json_build_object(
      'attempt', to_jsonb(v_active_attempt),
      'quiz', to_jsonb(v_quiz),
      'questions', v_questions_arr,
      'selected_answers', v_saved_answers
    );
  END IF;

  -- Verify max attempts limit
  SELECT COUNT(*) INTO v_sub_count
  FROM public.quiz_attempts
  WHERE user_id = v_user_id AND quiz_id = p_quiz_id AND status IN ('submitted', 'expired');

  IF v_quiz.max_attempts IS NOT NULL AND v_sub_count >= v_quiz.max_attempts THEN
    RAISE EXCEPTION 'Has alcanzado el límite máximo de intentos para este cuestionario (%/%)', v_sub_count, v_quiz.max_attempts;
  END IF;

  -- Create NEW attempt
  SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_attempt_number
  FROM public.quiz_attempts
  WHERE user_id = v_user_id AND quiz_id = p_quiz_id;

  IF v_quiz.time_limit_minutes IS NOT NULL THEN
    v_expires_at := now() + (v_quiz.time_limit_minutes || ' minutes')::interval;
  ELSE
    v_expires_at := NULL;
  END IF;

  -- Generate persistent shuffled question IDs and answer IDs map
  v_q_ids := '[]'::jsonb;
  v_ans_map := '{}'::jsonb;

  IF v_quiz.shuffle_questions THEN
    FOR v_q IN SELECT * FROM public.quiz_questions WHERE quiz_id = p_quiz_id ORDER BY random() LOOP
      v_q_ids := v_q_ids || to_jsonb(v_q.id::text);
    END LOOP;
  ELSE
    FOR v_q IN SELECT * FROM public.quiz_questions WHERE quiz_id = p_quiz_id ORDER BY position ASC LOOP
      v_q_ids := v_q_ids || to_jsonb(v_q.id::text);
    END LOOP;
  END IF;

  -- Generate answer order map for each question
  FOR i IN 0..(jsonb_array_length(v_q_ids) - 1) LOOP
    v_shuffled_ans_ids := '[]'::jsonb;
    IF v_quiz.shuffle_answers THEN
      FOR v_ans IN SELECT * FROM public.quiz_answers WHERE question_id = (v_q_ids->>i)::uuid ORDER BY random() LOOP
        v_shuffled_ans_ids := v_shuffled_ans_ids || to_jsonb(v_ans.id::text);
      END LOOP;
  ELSE
      FOR v_ans IN SELECT * FROM public.quiz_answers WHERE question_id = (v_q_ids->>i)::uuid ORDER BY position ASC LOOP
        v_shuffled_ans_ids := v_shuffled_ans_ids || to_jsonb(v_ans.id::text);
      END LOOP;
    END IF;
    v_ans_map := jsonb_set(v_ans_map, ARRAY[(v_q_ids->>i)], v_shuffled_ans_ids);
  END LOOP;

  INSERT INTO public.quiz_attempts (
    quiz_id, user_id, attempt_number, status, started_at, expires_at,
    shuffled_question_ids, shuffled_answer_ids_map
  )
  VALUES (
    p_quiz_id, v_user_id, v_attempt_number, 'in_progress', now(), v_expires_at,
    v_q_ids, v_ans_map
  )
  RETURNING id INTO v_new_attempt_id;

  SELECT * INTO v_active_attempt FROM public.quiz_attempts WHERE id = v_new_attempt_id;

  -- Build secure student questions output
  FOR i IN 0..(jsonb_array_length(v_q_ids) - 1) LOOP
    SELECT * INTO v_q FROM public.quiz_questions WHERE id = (v_q_ids->>i)::uuid;
    IF v_q.id IS NOT NULL THEN
      v_shuffled_ans_ids := v_ans_map->(v_q.id::text);
      v_answers_arr := '[]'::jsonb;

      FOR j IN 0..(jsonb_array_length(v_shuffled_ans_ids) - 1) LOOP
        SELECT * INTO v_ans FROM public.quiz_answers WHERE id = (v_shuffled_ans_ids->>j)::uuid;
        IF v_ans.id IS NOT NULL THEN
          v_answers_arr := v_answers_arr || jsonb_build_object(
            'id', v_ans.id,
            'question_id', v_ans.question_id,
            'answer_text', v_ans.answer_text,
            'position', j
          );
        END IF;
      END LOOP;

      v_questions_arr := v_questions_arr || jsonb_build_object(
        'id', v_q.id,
        'quiz_id', v_q.quiz_id,
        'type', v_q.type,
        'question_text', v_q.question_text,
        'points', v_q.points,
        'position', i,
        'answers', v_answers_arr
      );
    END IF;
  END LOOP;

  -- Log learning event idempotently
  INSERT INTO public.learning_events (user_id, course_id, event_type, metadata)
  VALUES (
    v_user_id, v_quiz.course_id, 'quiz_start',
    jsonb_build_object('quiz_id', p_quiz_id, 'attempt_id', v_new_attempt_id, 'attempt_number', v_attempt_number)
  );

  RETURN json_build_object(
    'attempt', to_jsonb(v_active_attempt),
    'quiz', to_jsonb(v_quiz),
    'questions', v_questions_arr,
    'selected_answers', '{}'::jsonb
  );
END;
$$;

-- 7. save_quiz_answer_rpc with Expiration Check
CREATE OR REPLACE FUNCTION public.save_quiz_answer_rpc(
  p_attempt_id UUID,
  p_question_id UUID,
  p_selected_answer_ids UUID[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_attempt RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT * INTO v_attempt FROM public.quiz_attempts WHERE id = p_attempt_id AND user_id = v_user_id;
  IF v_attempt.id IS NULL THEN
    RAISE EXCEPTION 'Intento no encontrado o no pertenece al usuario';
  END IF;

  IF v_attempt.status <> 'in_progress' THEN
    RETURN json_build_object('success', false, 'status', v_attempt.status, 'reason', 'El intento no está en progreso.');
  END IF;

  -- Check expiration gracefully
  IF v_attempt.expires_at IS NOT NULL AND now() > (v_attempt.expires_at + interval '5 seconds') THEN
    UPDATE public.quiz_attempts SET status = 'expired', updated_at = now() WHERE id = p_attempt_id;

    IF NOT EXISTS (
      SELECT 1 FROM public.learning_events
      WHERE user_id = v_user_id AND event_type = 'quiz_expired' AND (metadata->>'attempt_id')::uuid = p_attempt_id
    ) THEN
      INSERT INTO public.learning_events (user_id, event_type, metadata)
      VALUES (v_user_id, 'quiz_expired', jsonb_build_object('attempt_id', p_attempt_id, 'quiz_id', v_attempt.quiz_id));
    END IF;

    RETURN json_build_object(
      'success', false,
      'status', 'expired',
      'reason', 'El tiempo límite del cuestionario ha expirado.'
    );
  END IF;

  -- Upsert answer selection
  INSERT INTO public.quiz_attempt_answers (
    attempt_id, question_id, selected_answer_ids, answered_at
  )
  VALUES (
    p_attempt_id, p_question_id, p_selected_answer_ids, now()
  )
  ON CONFLICT (attempt_id, question_id) DO UPDATE SET
    selected_answer_ids = EXCLUDED.selected_answer_ids,
    answered_at = now();

  UPDATE public.quiz_attempts SET updated_at = now() WHERE id = p_attempt_id;

  RETURN json_build_object('success', true);
END;
$$;

-- 8. submit_quiz_attempt_rpc with Expiration Check & Transactional Progress Sync
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt_rpc(p_attempt_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_attempt RECORD;
  v_quiz RECORD;
  v_q RECORD;
  v_ans RECORD;
  v_user_ans RECORD;
  v_correct_ids UUID[];
  v_selected_ids UUID[];
  v_is_correct BOOLEAN;
  v_earned_points INT;
  v_total_earned_points INT := 0;
  v_total_quiz_points INT := 0;
  v_score NUMERIC(5,2);
  v_passed BOOLEAN;
  v_now TIMESTAMPTZ := now();
  v_details JSONB := '[]'::jsonb;
  v_ans_details JSONB;
  v_shuffled_ans_ids JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT * INTO v_attempt FROM public.quiz_attempts WHERE id = p_attempt_id AND user_id = v_user_id;
  IF v_attempt.id IS NULL THEN
    RAISE EXCEPTION 'Intento de cuestionario no encontrado';
  END IF;

  IF v_attempt.status = 'submitted' THEN
    RAISE EXCEPTION 'Este intento ya ha sido enviado previamente';
  END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_attempt.quiz_id;

  -- Check expiration
  IF v_attempt.expires_at IS NOT NULL AND now() > (v_attempt.expires_at + interval '5 seconds') THEN
    UPDATE public.quiz_attempts SET status = 'expired', updated_at = now() WHERE id = p_attempt_id;

    IF NOT EXISTS (
      SELECT 1 FROM public.learning_events
      WHERE user_id = v_user_id AND event_type = 'quiz_expired' AND (metadata->>'attempt_id')::uuid = p_attempt_id
    ) THEN
      INSERT INTO public.learning_events (user_id, course_id, event_type, metadata)
      VALUES (v_user_id, v_quiz.course_id, 'quiz_expired', jsonb_build_object('quiz_id', v_quiz.id, 'attempt_id', p_attempt_id));
    END IF;

    RETURN json_build_object(
      'success', false,
      'status', 'expired',
      'reason', 'El tiempo límite del cuestionario ha expirado.'
    );
  END IF;

  -- Grade each question
  FOR v_q IN SELECT * FROM public.quiz_questions WHERE quiz_id = v_quiz.id ORDER BY position ASC LOOP
    v_total_quiz_points := v_total_quiz_points + v_q.points;

    -- Get correct answer IDs for question
    SELECT array_agg(id) INTO v_correct_ids FROM public.quiz_answers WHERE question_id = v_q.id AND is_correct = true;
    IF v_correct_ids IS NULL THEN v_correct_ids := '{}'; END IF;

    -- Get user selected answer IDs
    SELECT selected_answer_ids INTO v_selected_ids FROM public.quiz_attempt_answers WHERE attempt_id = p_attempt_id AND question_id = v_q.id;
    IF v_selected_ids IS NULL THEN v_selected_ids := '{}'; END IF;

    -- Check correctness
    v_is_correct := (v_selected_ids <@ v_correct_ids AND v_correct_ids <@ v_selected_ids AND array_length(v_selected_ids, 1) = array_length(v_correct_ids, 1));

    IF v_is_correct THEN
      v_earned_points := v_q.points;
    ELSE
      v_earned_points := 0;
    END IF;

    v_total_earned_points := v_total_earned_points + v_earned_points;

    -- Update attempt answer record
    INSERT INTO public.quiz_attempt_answers (
      attempt_id, question_id, selected_answer_ids, is_correct, points_earned, answered_at
    )
    VALUES (
      p_attempt_id, v_q.id, v_selected_ids, v_is_correct, v_earned_points, v_now
    )
    ON CONFLICT (attempt_id, question_id) DO UPDATE SET
      is_correct = EXCLUDED.is_correct,
      points_earned = EXCLUDED.points_earned,
      answered_at = v_now;

    -- Build details for response
    v_ans_details := '[]'::jsonb;
    FOR v_ans IN SELECT * FROM public.quiz_answers WHERE question_id = v_q.id ORDER BY position ASC LOOP
      v_ans_details := v_ans_details || jsonb_build_object(
        'id', v_ans.id,
        'answer_text', v_ans.answer_text,
        'position', v_ans.position,
        'is_correct', CASE WHEN v_quiz.show_correct_answers THEN v_ans.is_correct ELSE NULL END,
        'selected', (v_ans.id = ANY(v_selected_ids))
      );
    END LOOP;

    v_details := v_details || jsonb_build_object(
      'question_id', v_q.id,
      'question_text', v_q.question_text,
      'type', v_q.type,
      'points', v_q.points,
      'points_earned', v_earned_points,
      'is_correct', v_is_correct,
      'explanation', CASE WHEN v_quiz.show_explanations THEN v_q.explanation ELSE NULL END,
      'answers', v_ans_details
    );
  END LOOP;

  -- Calculate percentage & passing status
  IF v_total_quiz_points > 0 THEN
    v_score := ROUND((v_total_earned_points::numeric / v_total_quiz_points::numeric) * 100, 2);
  ELSE
    v_score := 0;
  END IF;

  v_passed := (v_score >= v_quiz.passing_score);

  -- Update attempt state
  UPDATE public.quiz_attempts
  SET status = 'submitted',
      submitted_at = v_now,
      score = v_score,
      percentage = v_score,
      passed = v_passed,
      total_points = v_total_quiz_points,
      earned_points = v_total_earned_points,
      updated_at = v_now
  WHERE id = p_attempt_id;

  -- Record learning event
  INSERT INTO public.learning_events (user_id, course_id, event_type, metadata)
  VALUES (
    v_user_id, v_quiz.course_id,
    CASE WHEN v_passed THEN 'quiz_pass' ELSE 'quiz_fail' END,
    jsonb_build_object(
      'quiz_id', v_quiz.id,
      'attempt_id', p_attempt_id,
      'score', v_score,
      'passed', v_passed
    )
  );

  -- TRANSACTIONAL INTEGRATION WITH LEARNING ENGINE
  IF v_passed THEN
    PERFORM public.sync_quiz_completion_progress(v_user_id, v_quiz.id);
  END IF;

  RETURN json_build_object(
    'success', true,
    'status', 'submitted',
    'attempt_id', p_attempt_id,
    'passed', v_passed,
    'score', v_score,
    'percentage', v_score,
    'earned_points', v_total_earned_points,
    'total_points', v_total_quiz_points,
    'passing_score', v_quiz.passing_score,
    'show_correct_answers', v_quiz.show_correct_answers,
    'show_explanations', v_quiz.show_explanations,
    'details', v_details
  );
END;
$$;

-- 9. get_quiz_statistics_rpc (Admin & Course Instructor)
CREATE OR REPLACE FUNCTION public.get_quiz_statistics_rpc(p_quiz_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_quiz RECORD;
  v_total_students INT := 0;
  v_started INT := 0;
  v_completed INT := 0;
  v_passed INT := 0;
  v_pass_rate NUMERIC(5,2) := 0;
  v_avg_score NUMERIC(5,2) := 0;
  v_r0_20 INT := 0;
  v_r21_40 INT := 0;
  v_r41_60 INT := 0;
  v_r61_80 INT := 0;
  v_r81_100 INT := 0;
  v_attempts_json JSONB := '[]'::jsonb;
  v_att RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id;
  IF v_quiz.id IS NULL THEN
    RAISE EXCEPTION 'Cuestionario no encontrado';
  END IF;

  IF NOT (public.has_role(v_user_id, 'admin') OR public.quiz_is_course_instructor(p_quiz_id)) THEN
    RAISE EXCEPTION 'No tienes permiso para ver estadísticas de este cuestionario';
  END IF;

  SELECT COUNT(DISTINCT user_id) INTO v_total_students FROM public.enrollments WHERE course_id = v_quiz.course_id;
  SELECT COUNT(DISTINCT user_id) INTO v_started FROM public.quiz_attempts WHERE quiz_id = p_quiz_id;
  SELECT COUNT(*) INTO v_completed FROM public.quiz_attempts WHERE quiz_id = p_quiz_id AND status = 'submitted';
  SELECT COUNT(*) INTO v_passed FROM public.quiz_attempts WHERE quiz_id = p_quiz_id AND status = 'submitted' AND passed = true;

  IF v_completed > 0 THEN
    v_pass_rate := ROUND((v_passed::numeric / v_completed::numeric) * 100, 2);
    SELECT ROUND(AVG(score), 2) INTO v_avg_score FROM public.quiz_attempts WHERE quiz_id = p_quiz_id AND status = 'submitted';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE score BETWEEN 0 AND 20),
    COUNT(*) FILTER (WHERE score BETWEEN 20.01 AND 40),
    COUNT(*) FILTER (WHERE score BETWEEN 40.01 AND 60),
    COUNT(*) FILTER (WHERE score BETWEEN 60.01 AND 80),
    COUNT(*) FILTER (WHERE score BETWEEN 80.01 AND 100)
  INTO v_r0_20, v_r21_40, v_r41_60, v_r61_80, v_r81_100
  FROM public.quiz_attempts
  WHERE quiz_id = p_quiz_id AND status = 'submitted';

  FOR v_att IN
    SELECT qa.*, u.email as user_email
    FROM public.quiz_attempts qa
    LEFT JOIN auth.users u ON u.id = qa.user_id
    WHERE qa.quiz_id = p_quiz_id
    ORDER BY qa.created_at DESC
  LOOP
    v_attempts_json := v_attempts_json || jsonb_build_object(
      'id', v_att.id,
      'user_id', v_att.user_id,
      'user_email', COALESCE(v_att.user_email, 'Estudiante'),
      'attempt_number', v_att.attempt_number,
      'status', v_att.status,
      'score', v_att.score,
      'percentage', v_att.percentage,
      'passed', v_att.passed,
      'started_at', v_att.started_at,
      'submitted_at', v_att.submitted_at
    );
  END LOOP;

  RETURN json_build_object(
    'quiz_id', p_quiz_id,
    'quiz_title', v_quiz.title,
    'total_students', v_total_students,
    'attempts_started', v_started,
    'attempts_completed', v_completed,
    'passed_attempts', v_passed,
    'pass_rate', v_pass_rate,
    'avg_score', v_avg_score,
    'score_distribution', jsonb_build_object(
      'range_0_20', v_r0_20,
      'range_21_40', v_r21_40,
      'range_41_60', v_r41_60,
      'range_61_80', v_r61_80,
      'range_81_100', v_r81_100
    ),
    'student_attempts', v_attempts_json
  );
END;
$$;

-- 10. Strict RPC Permissions (Requirement 11)
REVOKE EXECUTE ON FUNCTION public.publish_quiz_rpc(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_quiz_completion_progress(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_lesson_progress_rpc(UUID, UUID, BOOLEAN, TEXT, INT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.start_quiz_attempt_rpc(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.save_quiz_answer_rpc(UUID, UUID, UUID[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_quiz_attempt_rpc(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_quiz_statistics_rpc(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.publish_quiz_rpc(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_quiz_completion_progress(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_lesson_progress_rpc(UUID, UUID, BOOLEAN, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_quiz_attempt_rpc(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_quiz_answer_rpc(UUID, UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt_rpc(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_statistics_rpc(UUID) TO authenticated;
