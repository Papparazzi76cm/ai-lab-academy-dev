-- ============================================================================
-- SPRINT 2.7 — CERTIFICADOS, CREDENCIALES Y VERIFICACIÓN PÚBLICA
-- ============================================================================

-- 1. SEQUENCE FOR CERTIFICATE NUMBER
CREATE SEQUENCE IF NOT EXISTS public.certificate_number_seq START WITH 1 INCREMENT BY 1;

-- 2. TABLES

-- certificate_templates
CREATE TABLE IF NOT EXISTS public.certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  background_url TEXT NULL,
  logo_url TEXT NULL,
  signature_name TEXT NULL,
  signature_title TEXT NULL,
  signature_image_url TEXT NULL,
  primary_color TEXT NOT NULL DEFAULT '#0f172a',
  secondary_color TEXT NOT NULL DEFAULT '#2563eb',
  layout_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- certificates
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number TEXT UNIQUE NOT NULL,
  verification_code TEXT UNIQUE NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.certificate_templates(id) ON DELETE SET NULL,
  student_name_snapshot TEXT NOT NULL,
  course_title_snapshot TEXT NOT NULL,
  instructor_name_snapshot TEXT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'replaced')),
  revoked_at TIMESTAMPTZ NULL,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revocation_reason TEXT NULL,
  pdf_path TEXT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- certificate_events
CREATE TABLE IF NOT EXISTS public.certificate_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('issued', 'downloaded', 'verified', 'revoked', 'reissued', 'pdf_generated')),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES & CONSTRAINTS
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_active_user_course 
  ON public.certificates(user_id, course_id) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_certificates_verification_code ON public.certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_certificates_certificate_number ON public.certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_certificates_user_issued ON public.certificates(user_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_course_issued ON public.certificates(course_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON public.certificates(status);

CREATE INDEX IF NOT EXISTS idx_certificate_events_cert_date ON public.certificate_events(certificate_id, created_at DESC);

-- 3. DEFAULT TEMPLATE INSERTION
INSERT INTO public.certificate_templates (
  name, is_default, status, primary_color, secondary_color, layout_json
)
SELECT 
  'Plantilla Oficial AI Lab Academy',
  true,
  'active',
  '#0f172a',
  '#2563eb',
  '{
    "orientation": "landscape",
    "showLogo": true,
    "showQr": true,
    "showSignature": true,
    "issuerName": "AI Lab Academy",
    "titleText": "Certificado de Finalización",
    "bodyText": "Por haber completado satisfactoriamente el programa formativo de"
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.certificate_templates WHERE is_default = true
);

-- 4. STORAGE BUCKET setup
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('certificates', 'certificates', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- 5. HELPER: Generate Cryptographically Unpredictable Verification Code
CREATE OR REPLACE FUNCTION private.generate_verification_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  result TEXT := '';
  i INT;
  rand_val INT;
BEGIN
  FOR i IN 1..16 LOOP
    IF i IN (5, 9, 13) THEN
      result := result || '-';
    END IF;
    -- floor(random() * 32) + 1
    rand_val := floor(random() * 32)::int + 1;
    result := result || substr(chars, rand_val, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- 6. PRIVATE CORE ISSUANCE FUNCTION
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
  -- 1. Check idempotency: Return active certificate if exists
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

  -- 3. Verify Enrollment
  SELECT * INTO v_enrollment
  FROM public.enrollments
  WHERE user_id = p_user_id AND course_id = p_course_id;

  IF v_enrollment.id IS NULL THEN
    RAISE EXCEPTION 'El usuario no posee una inscripción en este curso';
  END IF;

  -- 4. Check Learning Engine Progress
  SELECT * INTO v_progress
  FROM public.course_progress
  WHERE user_id = p_user_id AND course_id = p_course_id;

  IF v_progress.id IS NULL OR v_progress.percentage < 100 THEN
    RAISE EXCEPTION 'El curso no se encuentra completado al 100%%';
  END IF;

  -- 5. Verify all required quizzes are passed
  SELECT COUNT(*) INTO v_unpassed_required_quizzes
  FROM public.quizzes q
  WHERE q.course_id = p_course_id
    AND q.status = 'published'
    AND q.required_for_completion = true
    AND NOT EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      WHERE qa.quiz_id = q.id
        AND qa.user_id = p_user_id
        AND qa.passed = true
    );

  IF v_unpassed_required_quizzes > 0 THEN
    RAISE EXCEPTION 'Existen evaluaciones obligatorias pendientes de aprobación';
  END IF;

  -- 6. Fetch Student Full Name Snapshot
  SELECT COALESCE(NULLIF(trim(p.full_name), ''), NULLIF(trim(p.email), ''))
  INTO v_student_name
  FROM public.profiles p
  WHERE p.id = p_user_id;

  IF v_student_name IS NULL OR v_student_name = '' OR v_student_name LIKE '%@%' THEN
    -- Try auth metadata fallback if profile full name was blank
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

  -- 8. Select Template (Active Course template OR Global Default template)
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

  -- 11. Record Event
  INSERT INTO public.certificate_events (certificate_id, event_type, actor_user_id, metadata_json)
  VALUES (v_new_cert.id, 'issued', p_user_id, jsonb_build_object('certificate_number', v_cert_num));

  RETURN v_new_cert;
END;
$$;

-- 7. PUBLIC RPC: ISSUE CERTIFICATE
CREATE OR REPLACE FUNCTION public.issue_course_certificate_rpc(
  p_course_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_cert public.certificates;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  v_cert := private.issue_certificate_for_user(v_user_id, p_course_id);

  RETURN row_to_json(v_cert);
END;
$$;

-- 8. PUBLIC RPC: VERIFY CERTIFICATE
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

-- 9. ADMIN RPC: REVOKE CERTIFICATE
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

  INSERT INTO public.certificate_events (certificate_id, event_type, actor_user_id, metadata_json)
  VALUES (p_certificate_id, 'revoked', v_user_id, jsonb_build_object('reason', v_reason));

  RETURN row_to_json(v_cert);
END;
$$;

-- 10. ADMIN RPC: REISSUE CERTIFICATE
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

  -- Record events
  INSERT INTO public.certificate_events (certificate_id, event_type, actor_user_id, metadata_json)
  VALUES (p_certificate_id, 'reissued', v_user_id, jsonb_build_object('new_certificate_id', v_new_cert.id));

  INSERT INTO public.certificate_events (certificate_id, event_type, actor_user_id, metadata_json)
  VALUES (v_new_cert.id, 'reissued', v_user_id, jsonb_build_object('old_certificate_id', p_certificate_id));

  RETURN row_to_json(v_new_cert);
END;
$$;

-- 11. ROW LEVEL SECURITY POLICIES

ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_events ENABLE ROW LEVEL SECURITY;

-- certificate_templates RLS
DROP POLICY IF EXISTS "certificate_templates_select" ON public.certificate_templates;
CREATE POLICY "certificate_templates_select" ON public.certificate_templates
  FOR SELECT
  USING (
    private.has_role(auth.uid(), 'admin') OR
    (status = 'active' AND (is_default = true OR course_id IS NOT NULL))
  );

DROP POLICY IF EXISTS "certificate_templates_admin_manage" ON public.certificate_templates;
CREATE POLICY "certificate_templates_admin_manage" ON public.certificate_templates
  FOR ALL
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- certificates RLS
DROP POLICY IF EXISTS "certificates_select" ON public.certificates;
CREATE POLICY "certificates_select" ON public.certificates
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    private.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.courses c
      JOIN public.instructors i ON i.id = c.instructor_id
      WHERE c.id = certificates.course_id AND i.user_id = auth.uid()
    )
  );

-- certificate_events RLS
DROP POLICY IF EXISTS "certificate_events_select" ON public.certificate_events;
CREATE POLICY "certificate_events_select" ON public.certificate_events
  FOR SELECT
  USING (
    private.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.certificates c
      WHERE c.id = certificate_events.certificate_id AND c.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.certificates c
      JOIN public.courses cr ON cr.id = c.course_id
      JOIN public.instructors i ON i.id = cr.instructor_id
      WHERE c.id = certificate_events.certificate_id AND i.user_id = auth.uid()
    )
  );

-- Storage bucket certificates policy
DROP POLICY IF EXISTS "certificates_storage_select" ON storage.objects;
CREATE POLICY "certificates_storage_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'certificates' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      private.has_role(auth.uid(), 'admin')
    )
  );

-- Revoke function execution from public
REVOKE EXECUTE ON FUNCTION private.generate_verification_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.issue_certificate_for_user(UUID, UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.verify_certificate_rpc(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_course_certificate_rpc(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_certificate_rpc(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reissue_certificate_rpc(UUID) TO authenticated;
