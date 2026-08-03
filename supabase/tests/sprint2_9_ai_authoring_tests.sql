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

-- ----------------------------------------------------------------------------
-- Test 1: Verify Table and Index Structure
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_rls_enabled BOOLEAN;
  v_idx_count INT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'generation_jobs'
  ) INTO v_table_exists;

  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'Test 1 Failed: public.generation_jobs table does not exist';
  END IF;

  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE oid = 'public.generation_jobs'::regclass;

  IF NOT v_rls_enabled THEN
    RAISE EXCEPTION 'Test 1 Failed: RLS is not enabled on public.generation_jobs';
  END IF;

  SELECT COUNT(*) INTO v_idx_count
  FROM pg_indexes
  WHERE tablename = 'generation_jobs' AND schemaname = 'public';

  IF v_idx_count < 4 THEN
    RAISE EXCEPTION 'Test 1 Failed: Expected at least 4 indexes on generation_jobs, found %', v_idx_count;
  END IF;

  INSERT INTO test_results VALUES ('Test 1: Schema & Indexes Verification', TRUE, 'generation_jobs table, RLS and indexes verified');
END $$;

-- ----------------------------------------------------------------------------
-- Test 2: Function Permissions & Grants Verification
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_anon_can_create BOOLEAN;
  v_auth_can_update BOOLEAN;
BEGIN
  -- Verify anon cannot execute create_generation_job_rpc
  SELECT has_function_privilege('anon', 'public.create_generation_job_rpc(UUID, TEXT, TEXT, TEXT, JSONB)', 'EXECUTE')
  INTO v_anon_can_create;

  IF v_anon_can_create THEN
    RAISE EXCEPTION 'Test 2 Failed: anon role has EXECUTE on create_generation_job_rpc';
  END IF;

  -- Verify authenticated cannot directly execute update_generation_job_rpc
  SELECT has_function_privilege('authenticated', 'public.update_generation_job_rpc(UUID, TEXT, INT, INT, NUMERIC, INT, INT, INT, TEXT, TEXT, JSONB)', 'EXECUTE')
  INTO v_auth_can_update;

  IF v_auth_can_update THEN
    RAISE EXCEPTION 'Test 2 Failed: authenticated role has EXECUTE on update_generation_job_rpc (should be service_role only)';
  END IF;

  INSERT INTO test_results VALUES ('Test 2: Function Permissions & Grants', TRUE, 'RPC execute privileges strictly enforced');
END $$;

-- ----------------------------------------------------------------------------
-- Test 3: Job Lifecycle & State Transitions via RPCs
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_course_id UUID := gen_random_uuid();
  v_lesson_id UUID := gen_random_uuid();
  v_instructor_id UUID := gen_random_uuid();
  v_create_res JSONB;
  v_update_res JSONB;
  v_cancel_res JSONB;
  v_job_id UUID;
  v_status TEXT;
  v_sanitized_prompt TEXT;
  v_error_caught BOOLEAN := FALSE;
BEGIN
  -- Seed test course and lesson
  INSERT INTO public.courses (id, title, slug, instructor_id)
  VALUES (v_course_id, 'Test Course', 'test-course-sprint29', v_instructor_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.lessons (id, course_id, title, revision, slug)
  VALUES (v_lesson_id, v_course_id, 'Test Lesson', 1, 'test-lesson-sprint29')
  ON CONFLICT DO NOTHING;

  -- Set auth context to instructor
  PERFORM set_config('request.jwt.claim.sub', v_instructor_id::text, true);

  -- Create Job
  SELECT public.create_generation_job_rpc(
    p_lesson_id := v_lesson_id,
    p_provider := 'gemini',
    p_model := 'gemini-3.6-flash',
    p_prompt := 'Aprender React con user@example.com y UUID 12345678-1234-1234-1234-123456789abc',
    p_metadata := '{"context": "test"}'::jsonb
  ) INTO v_create_res;

  IF (v_create_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Test 3 Failed: create_generation_job_rpc failed';
  END IF;

  v_job_id := (v_create_res->>'job_id')::UUID;

  -- Verify prompt sanitization in DB
  SELECT prompt INTO v_sanitized_prompt
  FROM public.generation_jobs
  WHERE id = v_job_id;

  IF v_sanitized_prompt LIKE '%user@example.com%' OR v_sanitized_prompt LIKE '%12345678-1234-1234-1234-123456789abc%' THEN
    RAISE EXCEPTION 'Test 3 Failed: Sensitive emails or UUIDs were not sanitized in prompt';
  END IF;

  -- Update to running
  SELECT public.update_generation_job_rpc(
    p_job_id := v_job_id,
    p_status := 'running'
  ) INTO v_update_res;

  -- Update to completed
  SELECT public.update_generation_job_rpc(
    p_job_id := v_job_id,
    p_status := 'completed',
    p_tokens_input := 100,
    p_tokens_output := 200,
    p_estimated_cost := 0.001,
    p_created_blocks := 5,
    p_repair_count := 0,
    p_duration_ms := 1200
  ) INTO v_update_res;

  SELECT status INTO v_status FROM public.generation_jobs WHERE id = v_job_id;
  IF v_status <> 'completed' THEN
    RAISE EXCEPTION 'Test 3 Failed: Job status expected completed, got %', v_status;
  END IF;

  -- Verify terminal transition prevention (cannot transition from completed to queued)
  BEGIN
    PERFORM public.update_generation_job_rpc(
      p_job_id := v_job_id,
      p_status := 'queued'
    );
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := TRUE;
  END;

  IF NOT v_error_caught THEN
    RAISE EXCEPTION 'Test 3 Failed: Terminal state transition to queued was not rejected';
  END IF;

  -- Verify completed job cancellation attempt (returns graceful fail/current status)
  SELECT public.cancel_generation_job_rpc(p_job_id := v_job_id) INTO v_cancel_res;
  IF (v_cancel_res->>'success')::boolean IS TRUE AND (v_cancel_res->>'status') = 'cancelled' THEN
    RAISE EXCEPTION 'Test 3 Failed: Completed job was incorrectly changed to cancelled';
  END IF;

  INSERT INTO test_results VALUES ('Test 3: Job Lifecycle & State Transitions', TRUE, 'Job creation, sanitization, updates and terminal state checks verified');
END $$;

-- ----------------------------------------------------------------------------
-- Test 4: Idempotent Cancellation
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_course_id UUID := gen_random_uuid();
  v_lesson_id UUID := gen_random_uuid();
  v_instructor_id UUID := gen_random_uuid();
  v_create_res JSONB;
  v_cancel1 JSONB;
  v_cancel2 JSONB;
  v_job_id UUID;
BEGIN
  INSERT INTO public.courses (id, title, slug, instructor_id)
  VALUES (v_course_id, 'Cancel Course', 'cancel-course-sprint29', v_instructor_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.lessons (id, course_id, title, revision, slug)
  VALUES (v_lesson_id, v_course_id, 'Cancel Lesson', 1, 'cancel-lesson-sprint29')
  ON CONFLICT DO NOTHING;

  PERFORM set_config('request.jwt.claim.sub', v_instructor_id::text, true);

  SELECT public.create_generation_job_rpc(
    p_lesson_id := v_lesson_id,
    p_provider := 'openai',
    p_model := 'gpt-4o',
    p_prompt := 'Lección para cancelar'
  ) INTO v_create_res;

  v_job_id := (v_create_res->>'job_id')::UUID;

  -- First cancel
  SELECT public.cancel_generation_job_rpc(p_job_id := v_job_id) INTO v_cancel1;
  IF (v_cancel1->>'status') <> 'cancelled' THEN
    RAISE EXCEPTION 'Test 4 Failed: First cancel call did not set status to cancelled';
  END IF;

  -- Second cancel (Idempotent)
  SELECT public.cancel_generation_job_rpc(p_job_id := v_job_id) INTO v_cancel2;
  IF (v_cancel2->>'success')::boolean IS NOT TRUE OR (v_cancel2->>'status') <> 'cancelled' THEN
    RAISE EXCEPTION 'Test 4 Failed: Second cancel call failed or did not return status cancelled';
  END IF;

  INSERT INTO test_results VALUES ('Test 4: Idempotent Cancellation', TRUE, 'Repeated cancel call handled idempotently');
END $$;

SELECT * FROM test_results;

ROLLBACK;
