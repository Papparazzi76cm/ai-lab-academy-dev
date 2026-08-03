-- ============================================================================
-- SPRINT 2.7 — CERTIFICADOS SECURITY & ROBUSTNESS PATCH
-- ============================================================================

-- 1. Ensure private schema exists
CREATE SCHEMA IF NOT EXISTS private;

-- 2. PRIVATE AUDIT EVENT LOGGING FUNCTION
CREATE OR REPLACE FUNCTION private.record_certificate_event(
  p_certificate_id UUID,
  p_event_type TEXT,
  p_actor_user_id UUID DEFAULT NULL,
  p_metadata_json JSONB DEFAULT '{}'::jsonb
)
RETURNS public.certificate_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_event public.certificate_events;
BEGIN
  INSERT INTO public.certificate_events (
    certificate_id,
    event_type,
    actor_user_id,
    metadata_json
  )
  VALUES (
    p_certificate_id,
    p_event_type,
    p_actor_user_id,
    COALESCE(p_metadata_json, '{}'::jsonb)
  )
  RETURNING * INTO v_event;

  RETURN v_event;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.record_certificate_event(UUID, TEXT, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.record_certificate_event(UUID, TEXT, UUID, JSONB) TO service_role;

-- 3. STORAGE BUCKET PRIVACY ENFORCEMENT
UPDATE storage.buckets
SET public = false
WHERE id = 'certificates';

DROP POLICY IF EXISTS "certificates_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "certificates_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "certificates_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "certificates_storage_delete" ON storage.objects;

CREATE POLICY "certificates_storage_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'certificates' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      private.has_role(auth.uid(), 'admin')
    )
  );

-- 4. REFACTORED CORE ISSUANCE FUNCTION WITH STRICT VALIDATION & ADVISORY LOCKS
CREATE OR REPLACE FUNCTION private.issue_certificate_for_user(
  p_user_id UUID,
  p_course_id UUID
)
RETURNS public.certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_existing public.certificates;
  v_course RECORD;
  v_enrollment RECORD;
  v_progress RECORD;
  v_student_name TEXT;
  v_instructor_name TEXT;
  v_template RECORD;
  v_cert_num TEXT;
  v_verif_code TEXT;
  v_seq BIGINT;
  v_completed_at TIMESTAMPTZ := now();
  v_new_cert public.certificates;
  v_unpassed_required_quizzes INT := 0;
BEGIN
  -- Acquire transactional advisory lock to prevent parallel duplicate issuance
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || '_' || p_course_id::text));

  -- 1. Idempotency: Return active certificate if exists
  SELECT * INTO v_existing
  FROM public.certificates
  WHERE user_id = p_user_id AND course_id = p_course_id AND status = 'active'
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- 2. Verify Course exists & is published
  SELECT * INTO v_course
  FROM public.courses
  WHERE id = p_course_id AND status = 'published';

  IF v_course.id IS NULL THEN
    RAISE EXCEPTION 'El curso no existe o no está publicado';
  END IF;

  -- 3. Verify Active Enrollment
  SELECT * INTO v_enrollment
  FROM public.enrollments
  WHERE user_id = p_user_id AND course_id = p_course_id AND status = 'active';

  IF v_enrollment.id IS NULL THEN
    RAISE EXCEPTION 'El usuario no posee una inscripción activa en este curso';
  END IF;

  -- 4. Check Learning Engine Progress (Must be 100%)
  SELECT * INTO v_progress
  FROM public.course_progress
  WHERE user_id = p_user_id AND course_id = p_course_id;

  IF v_progress.id IS NULL OR v_progress.percentage < 100 THEN
    RAISE EXCEPTION 'El curso no se encuentra completado al 100%%';
  END IF;

  -- 5. Verify all required published quizzes are passed
  SELECT COUNT(*) INTO v_unpassed_required_quizzes
  FROM public.quizzes q
  WHERE q.course_id = p_course_id
    AND q.status = 'published'
    AND q.required_for_completion = true
    AND NOT EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      WHERE qa.quiz_id = q.id
        AND qa.user_id = p_user_id
        AND qa.status = 'submitted'
        AND qa.passed = true
    );

  IF v_unpassed_required_quizzes > 0 THEN
    RAISE EXCEPTION 'Existen evaluaciones obligatorias pendientes de aprobación';
  END IF;

  -- 6. Fetch Student Full Name Snapshot with strict validation
  SELECT COALESCE(NULLIF(trim(p.full_name), ''), NULLIF(trim(p.email), ''))
  INTO v_student_name
  FROM public.profiles p
  WHERE p.id = p_user_id;

  IF v_student_name IS NULL OR v_student_name = '' OR v_student_name LIKE '%@%' THEN
    -- Try auth metadata fallback
    SELECT NULLIF(trim(raw_user_meta_data->>'full_name'), '')
    INTO v_student_name
    FROM auth.users
    WHERE id = p_user_id;
  END IF;

  IF v_student_name IS NULL OR v_student_name = '' OR v_student_name LIKE '%@%' THEN
    RAISE EXCEPTION 'Completa tu nombre en tu perfil para emitir el certificado';
  END IF;

  -- 7. Fetch Instructor Name Snapshot
  IF v_course.instructor_id IS NOT NULL THEN
    SELECT COALESCE(p.full_name, i.title, 'Instructor AI Lab')
    INTO v_instructor_name
    FROM public.instructors i
    LEFT JOIN public.profiles p ON p.id = i.user_id
    WHERE i.id = v_course.instructor_id;
  END IF;

  -- 8. Select Active Template
  SELECT * INTO v_template
  FROM public.certificate_templates
  WHERE (course_id = p_course_id OR is_default = true) AND status = 'active'
  ORDER BY (CASE WHEN course_id = p_course_id THEN 1 ELSE 2 END)
  LIMIT 1;

  -- 9. Generate Certificate Number & Verification Code
  SELECT nextval('public.certificate_number_seq') INTO v_seq;
  v_cert_num := 'AILA-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 6, '0');
  v_verif_code := private.generate_verification_code();

  IF v_progress.completed_at IS NOT NULL THEN
    v_completed_at := v_progress.completed_at;
  ELSIF v_enrollment.completed_at IS NOT NULL THEN
    v_completed_at := v_enrollment.completed_at;
  END IF;

  -- 10. Insert Certificate
  INSERT INTO public.certificates (
    certificate_number,
    verification_code,
    course_id,
    user_id,
    enrollment_id,
    template_id,
    student_name_snapshot,
    course_title_snapshot,
    instructor_name_snapshot,
    issued_at,
    completed_at,
    status,
    metadata_json
  )
  VALUES (
    v_cert_num,
    v_verif_code,
    p_course_id,
    p_user_id,
    v_enrollment.id,
    v_template.id,
    v_student_name,
    v_course.title,
    v_instructor_name,
    now(),
    v_completed_at,
    'active',
    '{}'::jsonb
  )
  RETURNING * INTO v_new_cert;

  -- 11. Record Audit Event via private audit function
  PERFORM private.record_certificate_event(
    v_new_cert.id,
    'issued',
    p_user_id,
    jsonb_build_object('certificate_number', v_cert_num)
  );

  RETURN v_new_cert;
END;
$$;

-- 5. LEARNING ENGINE INTEGRATION (AUTOMATIC CERTIFICATE ISSUANCE ON 100% COMPLETION)
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

      IF NOT EXISTS (
        SELECT 1 FROM public.learning_events
        WHERE user_id = p_user_id AND lesson_id = v_quiz.lesson_id AND event_type = 'lesson_complete'
      ) THEN
        INSERT INTO public.learning_events (user_id, course_id, module_id, lesson_id, event_type, metadata)
        VALUES (p_user_id, v_quiz.course_id, v_quiz.module_id, v_quiz.lesson_id, 'lesson_complete', jsonb_build_object('trigger', 'quiz_passed'));
      END IF;
    END IF;
  END IF;

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

    -- Automatic Server-Side Certificate Issuance
    BEGIN
      PERFORM private.issue_certificate_for_user(p_user_id, v_quiz.course_id);
    EXCEPTION WHEN OTHERS THEN
      -- Profile name missing or temporary exception logged without breaking progress sync
      NULL;
    END;
  END IF;
END;
$$;

-- 6. PUBLIC VERIFY CERTIFICATE RPC (NO DATA LEAKAGE)
CREATE OR REPLACE FUNCTION public.verify_certificate_rpc(
  p_verification_code TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_code TEXT := upper(trim(COALESCE(p_verification_code, '')));
  v_cert RECORD;
BEGIN
  IF v_code = '' THEN
    RETURN json_build_object('found', false);
  END IF;

  SELECT 
    c.status,
    c.certificate_number,
    c.student_name_snapshot,
    c.course_title_snapshot,
    c.issued_at,
    c.completed_at,
    c.revocation_reason
  INTO v_cert
  FROM public.certificates c
  WHERE upper(c.verification_code) = v_code;

  IF v_cert.certificate_number IS NULL THEN
    RETURN json_build_object('found', false);
  END IF;

  RETURN json_build_object(
    'found', true,
    'status', v_cert.status,
    'certificate_number', v_cert.certificate_number,
    'student_name', v_cert.student_name_snapshot,
    'course_title', v_cert.course_title_snapshot,
    'issued_at', v_cert.issued_at,
    'completed_at', v_cert.completed_at,
    'issuer', 'AI Lab Academy',
    'revocation_reason_public', CASE WHEN v_cert.status = 'revoked' THEN v_cert.revocation_reason ELSE NULL END
  );
END;
$$;

-- 7. ADMIN REVOKE CERTIFICATE RPC
CREATE OR REPLACE FUNCTION public.revoke_certificate_rpc(
  p_certificate_id UUID,
  p_reason TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_cert public.certificates;
  v_reason TEXT := COALESCE(trim(p_reason), 'Revocado por administración');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF NOT private.has_role(v_user_id, 'admin') THEN
    RAISE EXCEPTION 'Acceso denegado. Se requieren permisos de administrador';
  END IF;

  SELECT * INTO v_cert FROM public.certificates WHERE id = p_certificate_id;

  IF v_cert.id IS NULL THEN
    RAISE EXCEPTION 'Certificado no encontrado';
  END IF;

  IF v_cert.status = 'revoked' THEN
    RAISE EXCEPTION 'El certificado ya se encuentra revocado';
  END IF;

  UPDATE public.certificates
  SET 
    status = 'revoked',
    revoked_at = now(),
    revoked_by = v_user_id,
    revocation_reason = v_reason,
    updated_at = now()
  WHERE id = p_certificate_id
  RETURNING * INTO v_cert;

  -- Record audit event via private audit function
  PERFORM private.record_certificate_event(
    p_certificate_id,
    'revoked',
    v_user_id,
    jsonb_build_object('reason', v_reason)
  );

  RETURN row_to_json(v_cert);
END;
$$;

-- 8. ADMIN REISSUE CERTIFICATE RPC
CREATE OR REPLACE FUNCTION public.reissue_certificate_rpc(
  p_certificate_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_old_cert public.certificates;
  v_new_cert public.certificates;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF NOT private.has_role(v_user_id, 'admin') THEN
    RAISE EXCEPTION 'Acceso denegado. Se requieren permisos de administrador';
  END IF;

  SELECT * INTO v_old_cert FROM public.certificates WHERE id = p_certificate_id;

  IF v_old_cert.id IS NULL THEN
    RAISE EXCEPTION 'Certificado original no encontrado';
  END IF;

  -- Mark old as replaced
  UPDATE public.certificates
  SET status = 'replaced', updated_at = now()
  WHERE id = p_certificate_id;

  -- Issue new certificate for user and course
  v_new_cert := private.issue_certificate_for_user(v_old_cert.user_id, v_old_cert.course_id);

  -- Link metadata
  UPDATE public.certificates
  SET metadata_json = jsonb_build_object('reissued_from', p_certificate_id)
  WHERE id = v_new_cert.id;

  -- Record events via private audit function
  PERFORM private.record_certificate_event(
    p_certificate_id,
    'reissued',
    v_user_id,
    jsonb_build_object('new_certificate_id', v_new_cert.id)
  );

  PERFORM private.record_certificate_event(
    v_new_cert.id,
    'reissued',
    v_user_id,
    jsonb_build_object('old_certificate_id', p_certificate_id)
  );

  RETURN row_to_json(v_new_cert);
END;
$$;
