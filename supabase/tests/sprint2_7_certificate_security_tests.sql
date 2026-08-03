-- ============================================================================
-- SPRINT 2.7 — CERTIFICATE SECURITY & ISOLATION TESTS
-- ============================================================================

BEGIN;

-- 1. Setup Mock Users
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'student1@test.com', '{"full_name": "Juan Perez"}'::jsonb),
  ('00000000-0000-0000-0000-000000000002', 'student2@test.com', '{"full_name": ""}'::jsonb),
  ('00000000-0000-0000-0000-000000000003', 'instructor1@test.com', '{"full_name": "Prof. Carlos"}'::jsonb),
  ('00000000-0000-0000-0000-000000000004', 'admin1@test.com', '{"full_name": "Admin System"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'student1@test.com', 'Juan Perez'),
  ('00000000-0000-0000-0000-000000000002', 'student2@test.com', ''), -- Blank profile name
  ('00000000-0000-0000-0000-000000000003', 'instructor1@test.com', 'Prof. Carlos'),
  ('00000000-0000-0000-0000-000000000004', 'admin1@test.com', 'Admin System')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'student'),
  ('00000000-0000-0000-0000-000000000002', 'student'),
  ('00000000-0000-0000-0000-000000000003', 'instructor'),
  ('00000000-0000-0000-0000-000000000004', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.instructors (id, user_id, title)
VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Profesor Senior')
ON CONFLICT (id) DO NOTHING;

-- 2. Setup Mock Course
INSERT INTO public.courses (id, title, slug, status, instructor_id)
VALUES ('20000000-0000-0000-0000-000000000001', 'Curso de IA Avanzada', 'curso-ia-avanzada', 'published', '10000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.enrollments (id, user_id, course_id, status)
VALUES 
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'active'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'active')
ON CONFLICT (id) DO NOTHING;

-- TEST 1: Incomplete course student cannot issue certificate
DO $$
DECLARE
  v_failed boolean := false;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  BEGIN
    PERFORM public.issue_course_certificate_rpc('20000000-0000-0000-0000-000000000001');
  EXCEPTION WHEN OTHERS THEN
    v_failed := true;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION 'ASSERTION FAILED: Incomplete course student was able to issue certificate!';
  END IF;
END $$;

-- Set progress = 100 for student1 and student2
INSERT INTO public.course_progress (user_id, course_id, percentage, completed_lessons, total_lessons)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 100, 5, 5),
  ('00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 100, 5, 5)
ON CONFLICT (user_id, course_id) DO UPDATE SET percentage = 100;

-- TEST 2: Student2 with blank profile name cannot issue certificate
DO $$
DECLARE
  v_failed boolean := false;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  BEGIN
    PERFORM public.issue_course_certificate_rpc('20000000-0000-0000-0000-000000000001');
  EXCEPTION WHEN OTHERS THEN
    v_failed := true;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION 'ASSERTION FAILED: Student with blank profile name was able to issue certificate!';
  END IF;
END $$;

-- TEST 3: Completed student1 issues certificate successfully
DO $$
DECLARE
  v_res json;
  v_verif_code text;
  v_cert_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  v_res := public.issue_course_certificate_rpc('20000000-0000-0000-0000-000000000001');
  
  v_verif_code := v_res->>'verification_code';
  v_cert_id := (v_res->>'id')::uuid;

  IF v_verif_code IS NULL OR v_verif_code = '' THEN
    RAISE EXCEPTION 'ASSERTION FAILED: Verification code missing in issued certificate';
  END IF;
END $$;

-- TEST 4: Idempotent call returns same certificate without duplication
DO $$
DECLARE
  v_res1 json;
  v_res2 json;
  v_count int;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  v_res1 := public.issue_course_certificate_rpc('20000000-0000-0000-0000-000000000001');
  v_res2 := public.issue_course_certificate_rpc('20000000-0000-0000-0000-000000000001');

  IF (v_res1->>'id') != (v_res2->>'id') THEN
    RAISE EXCEPTION 'ASSERTION FAILED: Idempotent call created duplicate certificate!';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.certificates
  WHERE user_id = '00000000-0000-0000-0000-000000000001' AND course_id = '20000000-0000-0000-0000-000000000001' AND status = 'active';

  IF v_count != 1 THEN
    RAISE EXCEPTION 'ASSERTION FAILED: Found % active certificates instead of 1', v_count;
  END IF;
END $$;

-- TEST 5: Public verification RPC with anonymous call
DO $$
DECLARE
  v_code text;
  v_verif json;
  v_invalid json;
BEGIN
  SELECT verification_code INTO v_code FROM public.certificates WHERE user_id = '00000000-0000-0000-0000-000000000001' LIMIT 1;
  
  -- Simulate anonymous user
  PERFORM set_config('request.jwt.claim.sub', '', true);

  v_verif := public.verify_certificate_rpc(v_code);
  IF (v_verif->>'found')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'ASSERTION FAILED: Public verification failed for valid code!';
  END IF;

  -- Ensure strict privacy: no user_id, pdf_path, or private emails
  IF v_verif->>'user_id' IS NOT NULL OR v_verif->>'pdf_path' IS NOT NULL OR v_verif->>'email' IS NOT NULL THEN
    RAISE EXCEPTION 'ASSERTION FAILED: Public verification leaked private data!';
  END IF;

  v_invalid := public.verify_certificate_rpc('INVALID-CODE-9999');
  IF (v_invalid->>'found')::boolean IS TRUE THEN
    RAISE EXCEPTION 'ASSERTION FAILED: Invalid code returned found = true!';
  END IF;
END $$;

-- TEST 6: Student cannot revoke certificate
DO $$
DECLARE
  v_cert_id uuid;
  v_failed boolean := false;
BEGIN
  SELECT id INTO v_cert_id FROM public.certificates LIMIT 1;
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

  BEGIN
    PERFORM public.revoke_certificate_rpc(v_cert_id, 'Prueba no autorizada');
  EXCEPTION WHEN OTHERS THEN
    v_failed := true;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION 'ASSERTION FAILED: Student was able to revoke certificate!';
  END IF;
END $$;

-- TEST 7: Admin can revoke certificate & public verification reflects revocation reason
DO $$
DECLARE
  v_cert_id uuid;
  v_code text;
  v_rev json;
  v_verif json;
BEGIN
  SELECT id, verification_code INTO v_cert_id, v_code FROM public.certificates LIMIT 1;
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);

  v_rev := public.revoke_certificate_rpc(v_cert_id, 'Certificado cancelado por pruebas');
  IF v_rev->>'status' != 'revoked' THEN
    RAISE EXCEPTION 'ASSERTION FAILED: Admin revocation failed!';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '', true);
  v_verif := public.verify_certificate_rpc(v_code);
  IF v_verif->>'status' != 'revoked' OR v_verif->>'revocation_reason_public' != 'Certificado cancelado por pruebas' THEN
    RAISE EXCEPTION 'ASSERTION FAILED: Revoked status or public revocation reason missing in verify_certificate_rpc';
  END IF;
END $$;

ROLLBACK;
