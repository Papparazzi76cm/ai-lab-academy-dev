-- Courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- Categories
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Instructors
ALTER TABLE public.instructors
  ADD COLUMN IF NOT EXISTS specialties text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Modules
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS status public.lesson_status NOT NULL DEFAULT 'draft';

-- Lessons (temporary content field until the block editor ships)
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS content_text text;

-- Resources
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_instructors_updated_at ON public.instructors;
CREATE TRIGGER update_instructors_updated_at BEFORE UPDATE ON public.instructors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_resources_updated_at ON public.resources;
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Prevent deleting categories that still have courses
CREATE OR REPLACE FUNCTION public.prevent_delete_category_with_courses()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.courses WHERE category_id = OLD.id) THEN
    RAISE EXCEPTION 'No se puede eliminar una categoria con cursos asociados';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS categories_prevent_delete ON public.categories;
CREATE TRIGGER categories_prevent_delete BEFORE DELETE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.prevent_delete_category_with_courses();

-- Indexes for admin listing/search/sort
CREATE INDEX IF NOT EXISTS idx_courses_title ON public.courses (title);
CREATE INDEX IF NOT EXISTS idx_courses_updated_at ON public.courses (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_status_created ON public.courses (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_is_featured ON public.courses (is_featured) WHERE is_featured;
CREATE INDEX IF NOT EXISTS idx_instructors_is_active ON public.instructors (is_active);
CREATE INDEX IF NOT EXISTS idx_modules_course_position ON public.modules (course_id, position);
CREATE INDEX IF NOT EXISTS idx_lessons_module_position ON public.lessons (module_id, position);
CREATE INDEX IF NOT EXISTS idx_resources_lesson_position ON public.resources (lesson_id, position);