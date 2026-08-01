-- Migration to update public.resources RLS policies and add is_public column if missing

-- 1. Add is_public column to public.resources
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- 2. Drop legacy RLS policies on public.resources
DROP POLICY IF EXISTS "Resources public read" ON public.resources;
DROP POLICY IF EXISTS "Resources of published courses are public" ON public.resources;
DROP POLICY IF EXISTS "Instructors manage own resources" ON public.resources;
DROP POLICY IF EXISTS "Admins manage resources" ON public.resources;
DROP POLICY IF EXISTS "Anon read public resources of free lessons" ON public.resources;
DROP POLICY IF EXISTS "Authenticated read resources" ON public.resources;
DROP POLICY IF EXISTS "Instructors and Admins manage resources" ON public.resources;

-- 3. Policy for Anon users: read only public resources of published, free-preview lessons in published courses
CREATE POLICY "Anon read public resources of free lessons"
ON public.resources FOR SELECT TO anon
USING (
  is_public = true
  AND EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = resources.lesson_id
      AND l.status = 'published'::lesson_status
      AND l.is_free_preview = true
      AND c.status = 'published'::course_status
  )
);

-- 4. Policy for Authenticated users (students, instructors, admins): read resources
CREATE POLICY "Authenticated read resources"
ON public.resources FOR SELECT TO authenticated
USING (
  -- Public resource of a free preview published lesson in a published course
  (
    is_public = true
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id = resources.lesson_id
        AND l.status = 'published'::lesson_status
        AND l.is_free_preview = true
        AND c.status = 'published'::course_status
    )
  )
  -- Or student has an active enrollment in the course
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE (
      e.course_id = resources.course_id
      OR EXISTS (
        SELECT 1 FROM public.lessons l
        WHERE l.id = resources.lesson_id AND l.course_id = e.course_id
      )
    )
    AND e.user_id = auth.uid()
  )
  -- Or user is the course instructor
  OR (resources.course_id IS NOT NULL AND private.is_course_instructor(resources.course_id, auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id = resources.lesson_id AND private.is_course_instructor(l.course_id, auth.uid())
  )
  -- Or user is admin
  OR private.has_role(auth.uid(), 'admin'::app_role)
);

-- 5. Policy for Instructors and Admins: full CUD management on resources of owned courses or admin
CREATE POLICY "Instructors and Admins manage resources"
ON public.resources FOR ALL TO authenticated
USING (
  (resources.course_id IS NOT NULL AND private.is_course_instructor(resources.course_id, auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id = resources.lesson_id AND private.is_course_instructor(l.course_id, auth.uid())
  )
  OR private.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (resources.course_id IS NOT NULL AND private.is_course_instructor(resources.course_id, auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id = resources.lesson_id AND private.is_course_instructor(l.course_id, auth.uid())
  )
  OR private.has_role(auth.uid(), 'admin'::app_role)
);
