-- Migration: Sprint 2.5 Learning Engine (Motor de Aprendizaje)
-- Tables for progression mode, lesson/module/course progress, learning events, RLS, and RPCs.

-- 1. Add progression_mode to public.courses
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS progression_mode TEXT NOT NULL DEFAULT 'FREE'
CHECK (progression_mode IN ('FREE', 'LINEAR', 'FLEXIBLE'));

-- 2. Ensure public.lesson_progress table structure
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completed BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_position INT NOT NULL DEFAULT 0,
  last_position_seconds INT NOT NULL DEFAULT 0,
  seconds_spent INT NOT NULL DEFAULT 0,
  time_spent_seconds INT NOT NULL DEFAULT 0,
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lesson_progress_user_lesson_unique UNIQUE (user_id, lesson_id)
);

-- Indexes for lesson_progress
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_course ON public.lesson_progress(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_lesson ON public.lesson_progress(user_id, lesson_id);

-- 3. Create public.module_progress table
CREATE TABLE IF NOT EXISTS public.module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  completed_lessons INT NOT NULL DEFAULT 0,
  total_lessons INT NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT module_progress_user_module_unique UNIQUE (user_id, module_id)
);

-- Indexes for module_progress
CREATE INDEX IF NOT EXISTS idx_module_progress_user_module ON public.module_progress(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_user_course ON public.module_progress(user_id, course_id);

-- 4. Create public.course_progress table
CREATE TABLE IF NOT EXISTS public.course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  completed_modules INT NOT NULL DEFAULT 0,
  total_modules INT NOT NULL DEFAULT 0,
  completed_lessons INT NOT NULL DEFAULT 0,
  total_lessons INT NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  last_lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT course_progress_user_course_unique UNIQUE (user_id, course_id)
);

-- Index for course_progress
CREATE INDEX IF NOT EXISTS idx_course_progress_user_course ON public.course_progress(user_id, course_id);

-- 5. Create public.learning_events table
CREATE TABLE IF NOT EXISTS public.learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for learning_events
CREATE INDEX IF NOT EXISTS idx_learning_events_user_type ON public.learning_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_learning_events_user_course ON public.learning_events(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_created_at ON public.learning_events(created_at DESC);

-- Enable RLS on all progress & analytics tables
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for lesson_progress
DROP POLICY IF EXISTS "Users can view own lesson progress" ON public.lesson_progress;
CREATE POLICY "Users can view own lesson progress"
  ON public.lesson_progress FOR SELECT
  USING (
    auth.uid() = user_id OR
    private.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.courses c
      JOIN public.instructors i ON i.id = c.instructor_id
      WHERE c.id = lesson_progress.course_id AND i.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own lesson progress" ON public.lesson_progress;
CREATE POLICY "Users can insert own lesson progress"
  ON public.lesson_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own lesson progress" ON public.lesson_progress;
CREATE POLICY "Users can update own lesson progress"
  ON public.lesson_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. RLS Policies for module_progress
DROP POLICY IF EXISTS "Users can view own module progress" ON public.module_progress;
CREATE POLICY "Users can view own module progress"
  ON public.module_progress FOR SELECT
  USING (
    auth.uid() = user_id OR
    private.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.courses c
      JOIN public.instructors i ON i.id = c.instructor_id
      WHERE c.id = module_progress.course_id AND i.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own module progress" ON public.module_progress;
CREATE POLICY "Users can insert own module progress"
  ON public.module_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own module progress" ON public.module_progress;
CREATE POLICY "Users can update own module progress"
  ON public.module_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8. RLS Policies for course_progress
DROP POLICY IF EXISTS "Users can view own course progress" ON public.course_progress;
CREATE POLICY "Users can view own course progress"
  ON public.course_progress FOR SELECT
  USING (
    auth.uid() = user_id OR
    private.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.courses c
      JOIN public.instructors i ON i.id = c.instructor_id
      WHERE c.id = course_progress.course_id AND i.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own course progress" ON public.course_progress;
CREATE POLICY "Users can insert own course progress"
  ON public.course_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own course progress" ON public.course_progress;
CREATE POLICY "Users can update own course progress"
  ON public.course_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 9. RLS Policies for learning_events
DROP POLICY IF EXISTS "Users can view own learning events" ON public.learning_events;
CREATE POLICY "Users can view own learning events"
  ON public.learning_events FOR SELECT
  USING (
    auth.uid() = user_id OR
    private.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Users can insert own learning events" ON public.learning_events;
CREATE POLICY "Users can insert own learning events"
  ON public.learning_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 10. RPC: update_lesson_progress_rpc
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Verify lesson exists & belongs to course
  SELECT module_id INTO v_module_id
  FROM public.lessons
  WHERE id = p_lesson_id AND course_id = p_course_id;

  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'Lección o curso no válido';
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

  -- Sync enrollment progress_percent & last_lesson_id
  UPDATE public.enrollments
  SET progress_percent = v_course_percentage,
      last_lesson_id = p_lesson_id,
      completed_at = CASE WHEN v_course_percentage = 100 THEN COALESCE(completed_at, v_now) ELSE NULL END,
      updated_at = v_now
  WHERE user_id = v_user_id AND course_id = p_course_id;

  -- Record learning event
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

-- 11. RPC: record_learning_event_rpc
CREATE OR REPLACE FUNCTION public.record_learning_event_rpc(
  p_event_type TEXT,
  p_course_id UUID DEFAULT NULL,
  p_module_id UUID DEFAULT NULL,
  p_lesson_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_event_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  INSERT INTO public.learning_events (user_id, course_id, module_id, lesson_id, event_type, metadata)
  VALUES (v_user_id, p_course_id, p_module_id, p_lesson_id, p_event_type, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;
