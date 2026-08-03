-- Migration: Sprint 2.9 Patch — generation_jobs table, state machine RPCs, security & permissions

-- 1. Create public.generation_jobs table
CREATE TABLE IF NOT EXISTS public.generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  tokens_input INT DEFAULT 0,
  tokens_output INT DEFAULT 0,
  estimated_cost NUMERIC(10, 6) DEFAULT 0,
  created_blocks INT DEFAULT 0,
  error_code TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_generation_jobs_lesson_id ON public.generation_jobs(lesson_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_id ON public.generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON public.generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_created_at ON public.generation_jobs(created_at);

-- Enable RLS
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Instructors and admins can view generation jobs for their lessons"
  ON public.generation_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = generation_jobs.lesson_id
      AND (
        private.is_course_instructor(l.course_id)
        OR private.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

CREATE POLICY "Instructors and admins can insert generation jobs for their lessons"
  ON public.generation_jobs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = generation_jobs.lesson_id
      AND (
        private.is_course_instructor(l.course_id)
        OR private.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

CREATE POLICY "Instructors and admins can update generation jobs for their lessons"
  ON public.generation_jobs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = generation_jobs.lesson_id
      AND (
        private.is_course_instructor(l.course_id)
        OR private.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

-- 2. RPC: create_generation_job_rpc
CREATE OR REPLACE FUNCTION public.create_generation_job_rpc(
  p_lesson_id UUID,
  p_provider TEXT,
  p_model TEXT,
  p_prompt TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_course_id UUID;
  v_is_admin BOOLEAN;
  v_is_instructor BOOLEAN;
  v_job_id UUID;
  v_sanitized_prompt TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    -- Fallback for internal / system callers
    v_user_id := '00000000-0000-0000-0000-000000000001'::UUID;
  END IF;

  SELECT course_id INTO v_course_id
  FROM public.lessons
  WHERE id = p_lesson_id;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'LESSON_NOT_FOUND: Lesson % does not exist', p_lesson_id;
  END IF;

  v_is_admin := private.has_role(v_user_id, 'admin'::app_role);
  v_is_instructor := private.is_course_instructor(v_course_id, v_user_id);

  IF NOT (v_is_admin OR v_is_instructor OR v_user_id = '00000000-0000-0000-0000-000000000001'::UUID) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: User is not course instructor or admin';
  END IF;

  IF p_prompt IS NULL OR TRIM(p_prompt) = '' THEN
    RAISE EXCEPTION 'INVALID_PROMPT: Prompt cannot be empty';
  END IF;

  -- Basic sanitization of prompt (remove emails/uuids)
  v_sanitized_prompt := regexp_replace(p_prompt, '\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[REDACTED_EMAIL]', 'g');
  v_sanitized_prompt := regexp_replace(v_sanitized_prompt, '\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b', '[REDACTED_UUID]', 'gi');

  INSERT INTO public.generation_jobs (
    lesson_id,
    user_id,
    provider,
    model,
    prompt,
    status,
    started_at,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    p_lesson_id,
    v_user_id,
    p_provider,
    p_model,
    v_sanitized_prompt,
    'queued',
    now(),
    COALESCE(p_metadata, '{}'::jsonb),
    now(),
    now()
  )
  RETURNING id INTO v_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'job_id', v_job_id,
    'status', 'queued'
  );
END;
$$;

-- 3. RPC: update_generation_job_rpc (Strict State Machine & Sanitization)
CREATE OR REPLACE FUNCTION public.update_generation_job_rpc(
  p_job_id UUID,
  p_status TEXT,
  p_tokens_input INT DEFAULT 0,
  p_tokens_output INT DEFAULT 0,
  p_estimated_cost NUMERIC DEFAULT 0,
  p_created_blocks INT DEFAULT 0,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_current_status TEXT;
  v_finished_at TIMESTAMPTZ;
  v_sanitized_error_msg TEXT;
BEGIN
  -- Lock row and check existence
  SELECT status INTO v_current_status
  FROM public.generation_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Job not found');
  END IF;

  -- Validate allowed status values
  IF p_status NOT IN ('queued', 'running', 'completed', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATUS: Status % is not valid', p_status;
  END IF;

  -- Enforce state transition rules (no inverse transitions from terminal states)
  IF v_current_status IN ('completed', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION: Job % is already in terminal state %', p_job_id, v_current_status;
  END IF;

  IF v_current_status = 'queued' AND p_status NOT IN ('queued', 'running', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION: Cannot transition from queued to %', p_status;
  END IF;

  IF v_current_status = 'running' AND p_status NOT IN ('running', 'completed', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATE_TRANSITION: Cannot transition from running to %', p_status;
  END IF;

  v_finished_at := CASE WHEN p_status IN ('completed', 'failed', 'cancelled') THEN now() ELSE NULL END;

  -- Sanitize error message to prevent saving secrets / API keys
  IF p_error_message IS NOT NULL THEN
    v_sanitized_error_msg := regexp_replace(p_error_message, 'key=[^&\s]+', 'key=[REDACTED]', 'gi');
    v_sanitized_error_msg := regexp_replace(v_sanitized_error_msg, 'Bearer\s+[A-Za-z0-9._-]+', 'Bearer [REDACTED]', 'gi');
    v_sanitized_error_msg := regexp_replace(v_sanitized_error_msg, '\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[REDACTED_EMAIL]', 'g');
  END IF;

  UPDATE public.generation_jobs
  SET
    status = p_status,
    tokens_input = COALESCE(p_tokens_input, tokens_input),
    tokens_output = COALESCE(p_tokens_output, tokens_output),
    estimated_cost = COALESCE(p_estimated_cost, estimated_cost),
    created_blocks = COALESCE(p_created_blocks, created_blocks),
    error_code = COALESCE(p_error_code, error_code),
    error_message = COALESCE(v_sanitized_error_msg, error_message),
    finished_at = COALESCE(v_finished_at, finished_at),
    metadata = metadata || COALESCE(p_metadata, '{}'::jsonb),
    updated_at = now()
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'job_id', p_job_id,
    'status', p_status
  );
END;
$$;

-- 4. RPC: cancel_generation_job_rpc
CREATE OR REPLACE FUNCTION public.cancel_generation_job_rpc(
  p_job_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  SELECT status INTO v_current_status
  FROM public.generation_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Job not found');
  END IF;

  IF v_current_status IN ('completed', 'failed', 'cancelled') THEN
    RETURN jsonb_build_object('success', true, 'job_id', p_job_id, 'status', v_current_status, 'message', 'Job already in terminal state');
  END IF;

  UPDATE public.generation_jobs
  SET
    status = 'cancelled',
    finished_at = now(),
    updated_at = now()
  WHERE id = p_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'job_id', p_job_id,
    'status', 'cancelled'
  );
END;
$$;

-- Grants
REVOKE EXECUTE ON FUNCTION public.create_generation_job_rpc(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_generation_job_rpc(UUID, TEXT, INT, INT, NUMERIC, INT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_generation_job_rpc(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_generation_job_rpc(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_generation_job_rpc(UUID, TEXT, INT, INT, NUMERIC, INT, TEXT, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_generation_job_rpc(UUID) TO authenticated, service_role;
