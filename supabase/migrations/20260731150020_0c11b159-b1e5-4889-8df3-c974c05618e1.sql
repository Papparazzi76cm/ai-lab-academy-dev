-- 1. Enums
DO $$ BEGIN CREATE TYPE public.lesson_status AS ENUM ('draft','published'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.enrollment_status AS ENUM ('active','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.progress_status AS ENUM ('not_started','in_progress','completed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Columns
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS published_at timestamptz;
UPDATE public.courses SET published_at = COALESCE(published_at, updated_at) WHERE status = 'published';

ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS status public.lesson_status NOT NULL DEFAULT 'published';

ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS status public.enrollment_status NOT NULL DEFAULT 'active';
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS enrolled_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.lesson_progress ADD COLUMN IF NOT EXISTS status public.progress_status NOT NULL DEFAULT 'not_started';
ALTER TABLE public.lesson_progress ADD COLUMN IF NOT EXISTS progress_percent numeric NOT NULL DEFAULT 0;
ALTER TABLE public.lesson_progress ADD COLUMN IF NOT EXISTS time_spent_seconds integer NOT NULL DEFAULT 0;
ALTER TABLE public.lesson_progress ADD COLUMN IF NOT EXISTS started_at timestamptz;
UPDATE public.lesson_progress SET status = 'completed', progress_percent = 100 WHERE completed AND status <> 'completed';
UPDATE public.lesson_progress SET time_spent_seconds = seconds_spent WHERE time_spent_seconds = 0 AND seconds_spent > 0;

-- 3. Uniques / indexes
CREATE UNIQUE INDEX IF NOT EXISTS lessons_course_slug_key ON public.lessons(course_id, slug);
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_user_course_key ON public.enrollments(user_id, course_id);
CREATE UNIQUE INDEX IF NOT EXISTS lesson_progress_user_lesson_key ON public.lesson_progress(user_id, lesson_id);
CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_course_key ON public.favorites(user_id, course_id);
CREATE INDEX IF NOT EXISTS courses_status_idx ON public.courses(status);
CREATE INDEX IF NOT EXISTS courses_category_idx ON public.courses(category_id);
CREATE INDEX IF NOT EXISTS courses_instructor_idx ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS modules_course_idx ON public.modules(course_id, position);
CREATE INDEX IF NOT EXISTS lessons_module_idx ON public.lessons(module_id, position);
CREATE INDEX IF NOT EXISTS lessons_course_idx ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS resources_lesson_idx ON public.resources(lesson_id, position);
CREATE INDEX IF NOT EXISTS enrollments_user_idx ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS lesson_progress_user_idx ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS user_roles_user_idx ON public.user_roles(user_id);

-- 4. Instructor helper
CREATE OR REPLACE FUNCTION public.is_course_instructor(_course_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses c
    JOIN public.instructors i ON i.id = c.instructor_id
    WHERE c.id = _course_id AND i.user_id = _user_id
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_course_instructor(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_course_instructor(uuid, uuid) TO authenticated, service_role;

-- 5. Policies: public reads limited to published content
DROP POLICY IF EXISTS "Modules public read" ON public.modules;
CREATE POLICY "Modules of published courses are public" ON public.modules FOR SELECT
USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = modules.course_id AND c.status = 'published'));

DROP POLICY IF EXISTS "Lessons public read" ON public.lessons;
CREATE POLICY "Published lessons of published courses are public" ON public.lessons FOR SELECT
USING (status = 'published' AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = lessons.course_id AND c.status = 'published'));

DROP POLICY IF EXISTS "Resources public read" ON public.resources;
CREATE POLICY "Resources of published courses are public" ON public.resources FOR SELECT
USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = resources.course_id AND c.status = 'published')
  OR EXISTS (SELECT 1 FROM public.lessons l JOIN public.courses c ON c.id = l.course_id
             WHERE l.id = resources.lesson_id AND l.status = 'published' AND c.status = 'published'));

-- 6. Instructor management policies
CREATE POLICY "Instructors read own courses" ON public.courses FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.instructors i WHERE i.id = courses.instructor_id AND i.user_id = auth.uid()));

CREATE POLICY "Instructors insert own courses" ON public.courses FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'instructor')
  AND EXISTS (SELECT 1 FROM public.instructors i WHERE i.id = courses.instructor_id AND i.user_id = auth.uid()));

CREATE POLICY "Instructors update own courses" ON public.courses FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.instructors i WHERE i.id = courses.instructor_id AND i.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.instructors i WHERE i.id = courses.instructor_id AND i.user_id = auth.uid()));

CREATE POLICY "Instructors delete own courses" ON public.courses FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.instructors i WHERE i.id = courses.instructor_id AND i.user_id = auth.uid()));

CREATE POLICY "Instructors manage own modules" ON public.modules FOR ALL TO authenticated
USING (public.is_course_instructor(modules.course_id, auth.uid()))
WITH CHECK (public.is_course_instructor(modules.course_id, auth.uid()));

CREATE POLICY "Instructors manage own lessons" ON public.lessons FOR ALL TO authenticated
USING (public.is_course_instructor(lessons.course_id, auth.uid()))
WITH CHECK (public.is_course_instructor(lessons.course_id, auth.uid()));

CREATE POLICY "Instructors manage own resources" ON public.resources FOR ALL TO authenticated
USING (
  (resources.course_id IS NOT NULL AND public.is_course_instructor(resources.course_id, auth.uid()))
  OR EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = resources.lesson_id AND public.is_course_instructor(l.course_id, auth.uid()))
)
WITH CHECK (
  (resources.course_id IS NOT NULL AND public.is_course_instructor(resources.course_id, auth.uid()))
  OR EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = resources.lesson_id AND public.is_course_instructor(l.course_id, auth.uid()))
);

CREATE POLICY "Instructors update own instructor profile" ON public.instructors FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());