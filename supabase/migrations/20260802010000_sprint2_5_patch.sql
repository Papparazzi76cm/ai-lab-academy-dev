-- Migration: Sprint 2.5 Security and Progression Control Patch
-- Provides server-side lesson access enforcement, RLS for lesson blocks, and update_lesson_progress_rpc validation.

-- 1. Helper function to verify lesson access server-side
CREATE OR REPLACE FUNCTION public.can_user_access_lesson(
  p_user_id UUID,
  p_lesson_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_course_id UUID;
  v_module_id UUID;
  v_lesson_status public.lesson_status;
  v_is_free_preview BOOLEAN;
  v_progression_mode TEXT;
  v_is_admin BOOLEAN := false;
  v_is_owner BOOLEAN := false;
  v_is_enrolled BOOLEAN := false;
  v_prev_lesson_id UUID;
  v_prev_completed BOOLEAN;
  v_target_module_pos INT;
  v_uncompleted_in_prior BOOLEAN;
BEGIN
  -- Fetch lesson info
  SELECT course_id, module_id, status, is_free_preview
  INTO v_course_id, v_module_id, v_lesson_status, v_is_free_preview
  FROM public.lessons
  WHERE id = p_lesson_id;

  IF v_course_id IS NULL THEN
    RETURN false;
  END IF;

  -- Admin or Instructor Owner check
  IF p_user_id IS NOT NULL THEN
    IF private.has_role(p_user_id, 'admin') THEN
      v_is_admin := true;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.courses c
      JOIN public.instructors i ON i.id = c.instructor_id
      WHERE c.id = v_course_id AND i.user_id = p_user_id
    ) INTO v_is_owner;
  END IF;

  IF v_is_admin OR v_is_owner THEN
    RETURN true;
  END IF;

  -- Must be published for students
  IF v_lesson_status IS NULL OR v_lesson_status != 'published'::public.lesson_status THEN
    RETURN false;
  END IF;

  -- Enrollment check
  IF p_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE user_id = p_user_id AND course_id = v_course_id AND status = 'active'
    ) INTO v_is_enrolled;
  END IF;

  -- Non-enrolled users can only access free previews
  IF NOT v_is_enrolled THEN
    RETURN COALESCE(v_is_free_preview, false);
  END IF;

  -- Course progression mode check
  SELECT COALESCE(progression_mode, 'FREE') INTO v_progression_mode
  FROM public.courses
  WHERE id = v_course_id;

  IF v_progression_mode = 'FREE' OR v_progression_mode IS NULL THEN
    RETURN true;
  ELSIF v_progression_mode = 'LINEAR' THEN
    -- Find immediately preceding lesson in course
    WITH ordered_lessons AS (
      SELECT l.id,
             ROW_NUMBER() OVER (ORDER BY m.position ASC, l.position ASC) as rn
      FROM public.lessons l
      JOIN public.modules m ON m.id = l.module_id
      WHERE l.course_id = v_course_id AND l.status = 'published'::public.lesson_status
    ),
    target_rn AS (
      SELECT rn FROM ordered_lessons WHERE id = p_lesson_id
    )
    SELECT ol.id INTO v_prev_lesson_id
    FROM ordered_lessons ol, target_rn tr
    WHERE ol.rn = tr.rn - 1;

    -- If no previous lesson (first lesson), access granted
    IF v_prev_lesson_id IS NULL THEN
      RETURN true;
    END IF;

    SELECT completed INTO v_prev_completed
    FROM public.lesson_progress
    WHERE user_id = p_user_id AND lesson_id = v_prev_lesson_id;

    RETURN COALESCE(v_prev_completed, false);

  ELSIF v_progression_mode = 'FLEXIBLE' THEN
    -- Find target module position
    SELECT position INTO v_target_module_pos
    FROM public.modules
    WHERE id = v_module_id;

    -- Check if any lesson in a module with smaller position is incomplete
    SELECT EXISTS (
      SELECT 1
      FROM public.lessons l
      JOIN public.modules m ON m.id = l.module_id
      LEFT JOIN public.lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = p_user_id
      WHERE l.course_id = v_course_id
        AND l.status = 'published'::public.lesson_status
        AND m.position < v_target_module_pos
        AND COALESCE(lp.completed, false) = false
    ) INTO v_uncompleted_in_prior;

    RETURN NOT v_uncompleted_in_prior;
  END IF;

  RETURN true;
END;
$$;

-- 2. Update RLS on public.lesson_blocks to enforce can_user_access_lesson
DROP POLICY IF EXISTS "Users can view published lesson blocks" ON public.lesson_blocks;
DROP POLICY IF EXISTS "Users can view accessible lesson blocks" ON public.lesson_blocks;

CREATE POLICY "Users can view accessible lesson blocks"
  ON public.lesson_blocks FOR SELECT
  USING (public.can_user_access_lesson(auth.uid(), lesson_id));

-- 3. RPC: get_accessible_lesson_content_rpc
CREATE OR REPLACE FUNCTION public.get_accessible_lesson_content_rpc(
  p_lesson_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_can_access BOOLEAN;
  v_lesson_record json;
  v_blocks_record json;
BEGIN
  v_can_access := public.can_user_access_lesson(v_user_id, p_lesson_id);

  IF NOT v_can_access THEN
    RETURN json_build_object(
      'can_access', false,
      'reason', 'No tienes acceso permitido a esta lección'
    );
  END IF;

  SELECT row_to_json(l) INTO v_lesson_record
  FROM public.lessons l
  WHERE l.id = p_lesson_id;

  SELECT COALESCE(json_agg(row_to_json(b) ORDER BY b.position ASC), '[]'::json) INTO v_blocks_record
  FROM public.lesson_blocks b
  WHERE b.lesson_id = p_lesson_id;

  RETURN json_build_object(
    'can_access', true,
    'lesson', v_lesson_record,
    'blocks', v_blocks_record
  );
END;
$$;

-- 4. RPC: update_lesson_progress_rpc with strict validation
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
  v_sanitized_seconds INT;
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
  v_can_access BOOLEAN;
BEGIN
  -- 1. Ensure user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- 2. Verify lesson belongs to course and fetch module_id
  SELECT module_id INTO v_module_id
  FROM public.lessons
  WHERE id = p_lesson_id AND course_id = p_course_id;

  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'Lección o curso no válido';
  END IF;

  -- 3. Check access rights
  v_can_access := public.can_user_access_lesson(v_user_id, p_lesson_id);
  IF NOT v_can_access THEN
    RAISE EXCEPTION 'No tienes permiso ni inscripción activa para actualizar progreso en esta lección';
  END IF;

  -- 4. Validate and sanitize status
  IF p_status IS NOT NULL AND p_status NOT IN ('not_started', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'Estado de progreso no válido: %', p_status;
  END IF;

  -- 5. Validate and sanitize seconds_spent (reject negative, cap at 24 hours per update)
  IF p_seconds_spent < 0 THEN
    RAISE EXCEPTION 'Segundos de estudio no pueden ser negativos';
  END IF;
  v_sanitized_seconds := LEAST(p_seconds_spent, 86400);

  -- Determine completion & status
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

  -- 6. Atomic Upsert into lesson_progress
  INSERT INTO public.lesson_progress (
    user_id, course_id, lesson_id, status, completed,
    started_at, completed_at, last_position, last_position_seconds,
    seconds_spent, time_spent_seconds, updated_at
  )
  VALUES (
    v_user_id, p_course_id, p_lesson_id, v_status, v_is_completed,
    v_now, CASE WHEN v_is_completed THEN v_now ELSE NULL END,
    GREATEST(p_last_position, 0), GREATEST(p_last_position, 0),
    v_sanitized_seconds, v_sanitized_seconds,
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
    seconds_spent = lesson_progress.seconds_spent + v_sanitized_seconds,
    time_spent_seconds = lesson_progress.time_spent_seconds + v_sanitized_seconds,
    updated_at = v_now;

  -- 7. Calculate Module Progress
  SELECT COUNT(*) INTO v_total_module_lessons
  FROM public.lessons
  WHERE module_id = v_module_id AND status = 'published'::public.lesson_status;

  SELECT COUNT(*) INTO v_completed_module_lessons
  FROM public.lesson_progress lp
  JOIN public.lessons l ON l.id = lp.lesson_id
  WHERE lp.user_id = v_user_id AND l.module_id = v_module_id AND lp.completed = true;

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
    CASE WHEN v_completed_module_lessons = v_total_module_lessons AND v_total_module_lessons > 0 THEN v_now ELSE NULL END,
    v_now
  )
  ON CONFLICT (user_id, module_id) DO UPDATE SET
    completed_lessons = EXCLUDED.completed_lessons,
    total_lessons = EXCLUDED.total_lessons,
    percentage = EXCLUDED.percentage,
    completed_at = EXCLUDED.completed_at,
    updated_at = v_now;

  -- 8. Calculate Course Progress
  SELECT COUNT(*) INTO v_total_course_lessons
  FROM public.lessons
  WHERE course_id = p_course_id AND status = 'published'::public.lesson_status;

  SELECT COUNT(*) INTO v_completed_course_lessons
  FROM public.lesson_progress lp
  JOIN public.lessons l ON l.id = lp.lesson_id
  WHERE lp.user_id = v_user_id AND l.course_id = p_course_id AND lp.completed = true;

  SELECT COUNT(*) INTO v_total_course_modules
  FROM public.modules
  WHERE course_id = p_course_id AND status = 'published'::public.lesson_status;

  SELECT COUNT(*) INTO v_completed_course_modules
  FROM public.module_progress mp
  WHERE mp.user_id = v_user_id AND mp.course_id = p_course_id AND mp.percentage = 100;

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
    CASE WHEN v_course_percentage = 100 THEN v_now ELSE NULL END, p_lesson_id, v_now
  )
  ON CONFLICT (user_id, course_id) DO UPDATE SET
    completed_modules = EXCLUDED.completed_modules,
    total_modules = EXCLUDED.total_modules,
    completed_lessons = EXCLUDED.completed_lessons,
    total_lessons = EXCLUDED.total_lessons,
    percentage = EXCLUDED.percentage,
    completed_at = EXCLUDED.completed_at,
    last_lesson_id = EXCLUDED.last_lesson_id,
    updated_at = v_now;

  -- 9. Sync enrollment progress_percent
  UPDATE public.enrollments
  SET progress_percent = v_course_percentage,
      last_lesson_id = p_lesson_id,
      completed_at = CASE WHEN v_course_percentage = 100 THEN COALESCE(completed_at, v_now) ELSE NULL END,
      updated_at = v_now
  WHERE user_id = v_user_id AND course_id = p_course_id;

  -- 10. Record learning event
  INSERT INTO public.learning_events (user_id, course_id, module_id, lesson_id, event_type, metadata)
  VALUES (
    v_user_id, p_course_id, v_module_id, p_lesson_id,
    CASE WHEN v_is_completed THEN 'lesson_complete' ELSE 'lesson_progress_update' END,
    jsonb_build_object(
      'seconds_spent', v_sanitized_seconds,
      'last_position', p_last_position,
      'course_percentage', v_course_percentage
    )
  );

  IF v_course_percentage = 100 THEN
    INSERT INTO public.learning_events (user_id, course_id, event_type, metadata)
    VALUES (
      v_user_id, p_course_id, 'course_complete',
      jsonb_build_object('completed_at', v_now)
    );
  END IF;

  SELECT json_build_object(
    'status', v_status,
    'completed', v_is_completed,
    'module_percentage', v_module_percentage,
    'course_percentage', v_course_percentage,
    'is_course_completed', (v_course_percentage = 100)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
