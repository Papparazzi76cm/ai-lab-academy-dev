-- 1. Certificates: owner/admin only
DROP POLICY IF EXISTS "Certificates readable" ON public.certificates;
CREATE POLICY "Users read own certificates"
ON public.certificates FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Comments: only for published courses/lessons
DROP POLICY IF EXISTS "Comments public read" ON public.comments;
CREATE POLICY "Comments on published content are readable"
ON public.comments FOR SELECT
USING (
  (lesson_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = comments.lesson_id
      AND l.status = 'published'::lesson_status
      AND c.status = 'published'::course_status
  ))
  OR (course_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = comments.course_id AND c.status = 'published'::course_status
  ))
  OR auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- helper to resolve the course a quiz belongs to
CREATE OR REPLACE FUNCTION public.quiz_course_id(_quiz_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(l.course_id, m.course_id)
  FROM public.quizzes q
  LEFT JOIN public.lessons l ON l.id = q.lesson_id
  LEFT JOIN public.modules m ON m.id = q.module_id
  WHERE q.id = _quiz_id
$$;
REVOKE ALL ON FUNCTION public.quiz_course_id(uuid) FROM PUBLIC, anon, authenticated;

-- 3. Quizzes: authenticated users, published courses only
DROP POLICY IF EXISTS "Quizzes public read" ON public.quizzes;
CREATE POLICY "Quizzes of published courses readable by users"
ON public.quizzes FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = public.quiz_course_id(quizzes.id)
      AND (
        c.status = 'published'::course_status
        OR public.is_course_instructor(c.id, auth.uid())
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

-- 4. Quiz questions/options: enrolled users, instructors, admins only
DROP POLICY IF EXISTS "Questions public read" ON public.quiz_questions;
CREATE POLICY "Enrolled users read questions"
ON public.quiz_questions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = public.quiz_course_id(quiz_questions.quiz_id)
      AND e.user_id = auth.uid()
  )
  OR public.is_course_instructor(public.quiz_course_id(quiz_questions.quiz_id), auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Options public read" ON public.quiz_options;
CREATE POLICY "Enrolled users read options"
ON public.quiz_options FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_questions q
    WHERE q.id = quiz_options.question_id
      AND (
        EXISTS (
          SELECT 1 FROM public.enrollments e
          WHERE e.course_id = public.quiz_course_id(q.quiz_id)
            AND e.user_id = auth.uid()
        )
        OR public.is_course_instructor(public.quiz_course_id(q.quiz_id), auth.uid())
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

-- 5. Keep SECURITY DEFINER helpers out of the exposed API schema
DROP FUNCTION IF EXISTS public.bootstrap_current_user();

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.has_role(uuid, app_role) SET SCHEMA private;
ALTER FUNCTION public.is_course_instructor(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.quiz_course_id(uuid) SET SCHEMA private;

ALTER FUNCTION private.has_role(uuid, app_role) SET search_path = public;
ALTER FUNCTION private.is_course_instructor(uuid, uuid) SET search_path = public;
ALTER FUNCTION private.quiz_course_id(uuid) SET search_path = public;

REVOKE ALL ON FUNCTION private.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_course_instructor(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.quiz_course_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_course_instructor(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.quiz_course_id(uuid) TO authenticated, service_role;