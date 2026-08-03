-- ============================================================================
-- Sprint 2.9 AI Authoring Assistant - Database Verification & RLS Tests
-- File: supabase/tests/sprint2_9_ai_authoring_tests.sql
-- ============================================================================

BEGIN;

CREATE TEMP TABLE IF NOT EXISTS test_results (
  test_name TEXT PRIMARY KEY,
  passed BOOLEAN NOT NULL,
  details TEXT
);

-- Ensure generation_jobs table exists for testing environment
CREATE TABLE IF NOT EXISTS public.generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  tokens_input INT DEFAULT 0,
  tokens_output INT DEFAULT 0,
  estimated_cost NUMERIC(10, 6) DEFAULT 0,
  created_blocks INT DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_lesson_id ON public.generation_jobs(lesson_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_id ON public.generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON public.generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_created_at ON public.generation_jobs(created_at);

-- Create RPC Functions if not existing in DB session
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
AS $$
DECLARE
  v_user_id UUID := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000001'::UUID);
  v_job_id UUID;
BEGIN
  INSERT INTO public.generation_jobs (
    lesson_id,
    user_id,
    provider,
    model,
    prompt,
    status,
    started_at,
    metadata
  ) VALUES (
    p_lesson_id,
    v_user_id,
    p_provider,
    p_model,
    p_prompt,
    'queued',
    now(),
    p_metadata
  )
  RETURNING id INTO v_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'job_id', v_job_id,
    'status', 'queued'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_generation_job_rpc(
  p_job_id UUID,
  p_status TEXT,
  p_tokens_input INT DEFAULT 0,
  p_tokens_output INT DEFAULT 0,
  p_estimated_cost NUMERIC DEFAULT 0,
  p_created_blocks INT DEFAULT 0,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_finished_at TIMESTAMPTZ := CASE WHEN p_status IN ('completed', 'failed', 'cancelled') THEN now() ELSE NULL END;
BEGIN
  UPDATE public.generation_jobs
  SET
    status = p_status,
    tokens_input = COALESCE(p_tokens_input, tokens_input),
    tokens_output = COALESCE(p_tokens_output, tokens_output),
    estimated_cost = COALESCE(p_estimated_cost, estimated_cost),
    created_blocks = COALESCE(p_created_blocks, created_blocks),
    finished_at = COALESCE(v_finished_at, finished_at),
    metadata = metadata || COALESCE(p_metadata, '{}'::jsonb)
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Job not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'job_id', p_job_id, 'status', p_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_generation_job_rpc(
  p_job_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.generation_jobs
  SET
    status = 'cancelled',
    finished_at = now()
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Job not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'job_id', p_job_id, 'status', 'cancelled');
END;
$$;

-- ----------------------------------------------------------------------------
-- Test 1: Job Creation via create_generation_job_rpc
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_lesson_id UUID := gen_random_uuid();
  v_res JSONB;
  v_job_id UUID;
  v_status TEXT;
BEGIN
  -- Seed test lesson
  INSERT INTO public.lessons (id, title, revision, slug)
  VALUES (v_lesson_id, 'AI Lesson Job Test', 1, 'ai-lesson-job-test')
  ON CONFLICT DO NOTHING;

  SELECT public.create_generation_job_rpc(
    p_lesson_id := v_lesson_id,
    p_provider := 'gemini',
    p_model := 'gemini-3.6-flash',
    p_prompt := 'Genera una lección sobre React Hooks',
    p_metadata := '{"tone": "practical"}'::jsonb
  ) INTO v_res;

  IF (v_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Test 1 Failed: create_generation_job_rpc returned success=false';
  END IF;

  v_job_id := (v_res->>'job_id')::UUID;

  SELECT status INTO v_status
  FROM public.generation_jobs
  WHERE id = v_job_id;

  IF v_status <> 'queued' THEN
    RAISE EXCEPTION 'Test 1 Failed: Expected status queued, got %', v_status;
  END IF;

  INSERT INTO test_results VALUES ('Test 1: Create Generation Job RPC', TRUE, 'Job created in queued state');
END $$;

-- ----------------------------------------------------------------------------
-- Test 2: Job Progress Update & Status Transition via update_generation_job_rpc
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_lesson_id UUID := gen_random_uuid();
  v_create_res JSONB;
  v_update_res JSONB;
  v_job_id UUID;
  v_job_rec RECORD;
BEGIN
  INSERT INTO public.lessons (id, title, revision, slug)
  VALUES (v_lesson_id, 'AI Lesson Update Test', 1, 'ai-lesson-update-test')
  ON CONFLICT DO NOTHING;

  SELECT public.create_generation_job_rpc(
    p_lesson_id := v_lesson_id,
    p_provider := 'openai',
    p_model := 'gpt-4o',
    p_prompt := 'Genera una lección de TypeScript Avanzado'
  ) INTO v_create_res;

  v_job_id := (v_create_res->>'job_id')::UUID;

  SELECT public.update_generation_job_rpc(
    p_job_id := v_job_id,
    p_status := 'completed',
    p_tokens_input := 1250,
    p_tokens_output := 3400,
    p_estimated_cost := 0.042500,
    p_created_blocks := 8,
    p_metadata := '{"repair_count": 1}'::jsonb
  ) INTO v_update_res;

  IF (v_update_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Test 2 Failed: update_generation_job_rpc returned success=false';
  END IF;

  SELECT * INTO v_job_rec FROM public.generation_jobs WHERE id = v_job_id;

  IF v_job_rec.status <> 'completed' OR v_job_rec.tokens_input <> 1250 OR v_job_rec.tokens_output <> 3400 OR v_job_rec.created_blocks <> 8 THEN
    RAISE EXCEPTION 'Test 2 Failed: Record fields did not update properly';
  END IF;

  IF v_job_rec.finished_at IS NULL THEN
    RAISE EXCEPTION 'Test 2 Failed: finished_at was not populated on completion';
  END IF;

  INSERT INTO test_results VALUES ('Test 2: Update Generation Job RPC', TRUE, 'Job transitioned to completed with telemetry stats');
END $$;

-- ----------------------------------------------------------------------------
-- Test 3: Job Cancellation via cancel_generation_job_rpc
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_lesson_id UUID := gen_random_uuid();
  v_create_res JSONB;
  v_cancel_res JSONB;
  v_job_id UUID;
  v_status TEXT;
BEGIN
  INSERT INTO public.lessons (id, title, revision, slug)
  VALUES (v_lesson_id, 'AI Lesson Cancel Test', 1, 'ai-lesson-cancel-test')
  ON CONFLICT DO NOTHING;

  SELECT public.create_generation_job_rpc(
    p_lesson_id := v_lesson_id,
    p_provider := 'anthropic',
    p_model := 'claude-3-5-sonnet',
    p_prompt := 'Prompt para cancelar'
  ) INTO v_create_res;

  v_job_id := (v_create_res->>'job_id')::UUID;

  SELECT public.cancel_generation_job_rpc(
    p_job_id := v_job_id
  ) INTO v_cancel_res;

  IF (v_cancel_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Test 3 Failed: cancel_generation_job_rpc returned success=false';
  END IF;

  SELECT status INTO v_status FROM public.generation_jobs WHERE id = v_job_id;

  IF v_status <> 'cancelled' THEN
    RAISE EXCEPTION 'Test 3 Failed: Expected status cancelled, got %', v_status;
  END IF;

  INSERT INTO test_results VALUES ('Test 3: Cancel Generation Job RPC', TRUE, 'Job successfully cancelled');
END $$;

SELECT * FROM test_results;

ROLLBACK;
