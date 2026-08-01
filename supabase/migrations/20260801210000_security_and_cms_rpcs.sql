-- Migration: Security and CMS RPCs
-- Provides atomic operations, role-filtered stats/changes, and instructor default triggers.

-- 1. CMS Stats RPC
CREATE OR REPLACE FUNCTION public.get_cms_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean := private.has_role(v_user_id, 'admin');
  v_is_instructor boolean := private.has_role(v_user_id, 'instructor');
  v_instructor_id uuid;
  v_result json;
BEGIN
  IF NOT (v_is_admin OR v_is_instructor) THEN
    RAISE EXCEPTION 'Acceso denegado: se requieren permisos de administración o profesor';
  END IF;

  IF v_is_admin THEN
    SELECT json_build_object(
      'courses', (SELECT COUNT(*) FROM public.courses),
      'published', (SELECT COUNT(*) FROM public.courses WHERE status = 'published'),
      'drafts', (SELECT COUNT(*) FROM public.courses WHERE status = 'draft'),
      'archived', (SELECT COUNT(*) FROM public.courses WHERE status = 'archived'),
      'categories', (SELECT COUNT(*) FROM public.categories),
      'instructors', (SELECT COUNT(*) FROM public.instructors),
      'modules', (SELECT COUNT(*) FROM public.modules),
      'lessons', (SELECT COUNT(*) FROM public.lessons)
    ) INTO v_result;
  ELSE
    v_instructor_id := private.get_instructor_id_for_user(v_user_id);
    SELECT json_build_object(
      'courses', (SELECT COUNT(*) FROM public.courses WHERE instructor_id = v_instructor_id),
      'published', (SELECT COUNT(*) FROM public.courses WHERE instructor_id = v_instructor_id AND status = 'published'),
      'drafts', (SELECT COUNT(*) FROM public.courses WHERE instructor_id = v_instructor_id AND status = 'draft'),
      'archived', (SELECT COUNT(*) FROM public.courses WHERE instructor_id = v_instructor_id AND status = 'archived'),
      'categories', (SELECT COUNT(DISTINCT category_id) FROM public.courses WHERE instructor_id = v_instructor_id AND category_id IS NOT NULL),
      'instructors', 1,
      'modules', (SELECT COUNT(*) FROM public.modules m JOIN public.courses c ON c.id = m.course_id WHERE c.instructor_id = v_instructor_id),
      'lessons', (SELECT COUNT(*) FROM public.lessons l JOIN public.courses c ON c.id = l.course_id WHERE c.instructor_id = v_instructor_id)
    ) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

-- 2. CMS Recent Changes RPC
CREATE OR REPLACE FUNCTION public.get_cms_recent_changes()
RETURNS TABLE (
  id uuid,
  type text,
  title text,
  course_id uuid,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean := private.has_role(v_user_id, 'admin');
  v_is_instructor boolean := private.has_role(v_user_id, 'instructor');
  v_instructor_id uuid;
BEGIN
  IF NOT (v_is_admin OR v_is_instructor) THEN
    RAISE EXCEPTION 'Acceso denegado: se requieren permisos de administración o profesor';
  END IF;

  IF v_is_admin THEN
    RETURN QUERY
    WITH combined AS (
      SELECT c.id, 'Curso'::text AS type, c.title, c.id AS course_id, c.updated_at
      FROM public.courses c
      UNION ALL
      SELECT m.id, 'Módulo'::text AS type, m.title, m.course_id, m.updated_at
      FROM public.modules m
      UNION ALL
      SELECT l.id, 'Lección'::text AS type, l.title, l.course_id, l.updated_at
      FROM public.lessons l
    )
    SELECT combined.id, combined.type, combined.title, combined.course_id, combined.updated_at
    FROM combined
    ORDER BY combined.updated_at DESC
    LIMIT 10;
  ELSE
    v_instructor_id := private.get_instructor_id_for_user(v_user_id);
    RETURN QUERY
    WITH combined AS (
      SELECT c.id, 'Curso'::text AS type, c.title, c.id AS course_id, c.updated_at
      FROM public.courses c
      WHERE c.instructor_id = v_instructor_id
      UNION ALL
      SELECT m.id, 'Módulo'::text AS type, m.title, m.course_id, m.updated_at
      FROM public.modules m
      JOIN public.courses c ON c.id = m.course_id
      WHERE c.instructor_id = v_instructor_id
      UNION ALL
      SELECT l.id, 'Lección'::text AS type, l.title, l.course_id, l.updated_at
      FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE c.instructor_id = v_instructor_id
    )
    SELECT combined.id, combined.type, combined.title, combined.course_id, combined.updated_at
    FROM combined
    ORDER BY combined.updated_at DESC
    LIMIT 10;
  END IF;
END;
$$;

-- 3. Atomic Course Duplication RPC
CREATE OR REPLACE FUNCTION public.duplicate_course_rpc(p_course_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean := private.has_role(v_user_id, 'admin');
  v_is_instructor boolean := private.has_role(v_user_id, 'instructor');
  v_instructor_id uuid;
  v_source public.courses%ROWTYPE;
  v_new_course_id uuid;
  v_new_slug text;
  v_slug_suffix int := 1;
  v_mod RECORD;
  v_new_module_id uuid;
  v_les RECORD;
  v_new_lesson_id uuid;
  v_res RECORD;
BEGIN
  IF NOT (v_is_admin OR v_is_instructor) THEN
    RAISE EXCEPTION 'Acceso denegado: se requieren permisos de administración o profesor';
  END IF;

  SELECT * INTO v_source FROM public.courses WHERE id = p_course_id;
  IF v_source.id IS NULL THEN
    RAISE EXCEPTION 'Curso no encontrado';
  END IF;

  IF v_is_instructor AND NOT v_is_admin THEN
    v_instructor_id := private.get_instructor_id_for_user(v_user_id);
    IF v_source.instructor_id IS DISTINCT FROM v_instructor_id THEN
      RAISE EXCEPTION 'No tienes permiso para duplicar este curso';
    END IF;
  END IF;

  -- Generate unique slug
  v_new_slug := v_source.slug || '-copia';
  WHILE EXISTS (SELECT 1 FROM public.courses WHERE slug = v_new_slug) LOOP
    v_slug_suffix := v_slug_suffix + 1;
    v_new_slug := v_source.slug || '-copia-' || v_slug_suffix;
  END LOOP;

  -- Insert duplicated course
  INSERT INTO public.courses (
    title,
    slug,
    description,
    category_id,
    instructor_id,
    level,
    price_cents,
    currency,
    cover_image_url,
    promo_video_url,
    status,
    is_featured,
    language,
    students_count,
    rating,
    ratings_count
  ) VALUES (
    v_source.title || ' (copia)',
    v_new_slug,
    v_source.description,
    v_source.category_id,
    COALESCE(v_source.instructor_id, CASE WHEN v_is_instructor THEN private.get_instructor_id_for_user(v_user_id) ELSE NULL END),
    v_source.level,
    v_source.price_cents,
    v_source.currency,
    v_source.cover_image_url,
    v_source.promo_video_url,
    'draft',
    false,
    v_source.language,
    0,
    0,
    0
  ) RETURNING id INTO v_new_course_id;

  -- Duplicate modules
  FOR v_mod IN SELECT * FROM public.modules WHERE course_id = p_course_id ORDER BY position LOOP
    INSERT INTO public.modules (
      course_id,
      title,
      description,
      position,
      status
    ) VALUES (
      v_new_course_id,
      v_mod.title,
      v_mod.description,
      v_mod.position,
      v_mod.status
    ) RETURNING id INTO v_new_module_id;

    -- Duplicate lessons
    FOR v_les IN SELECT * FROM public.lessons WHERE module_id = v_mod.id ORDER BY position LOOP
      INSERT INTO public.lessons (
        course_id,
        module_id,
        title,
        slug,
        summary,
        content,
        content_text,
        duration_minutes,
        status,
        type,
        is_free_preview,
        position,
        video_url
      ) VALUES (
        v_new_course_id,
        v_new_module_id,
        v_les.title,
        v_les.slug || '-' || substr(md5(random()::text), 1, 6),
        v_les.summary,
        v_les.content,
        v_les.content_text,
        v_les.duration_minutes,
        v_les.status,
        v_les.type,
        v_les.is_free_preview,
        v_les.position,
        v_les.video_url
      ) RETURNING id INTO v_new_lesson_id;

      -- Duplicate resources
      FOR v_res IN SELECT * FROM public.resources WHERE lesson_id = v_les.id ORDER BY position LOOP
        INSERT INTO public.resources (
          course_id,
          lesson_id,
          title,
          description,
          kind,
          url,
          position,
          size_bytes
        ) VALUES (
          v_new_course_id,
          v_new_lesson_id,
          v_res.title,
          v_res.description,
          v_res.kind,
          v_res.url,
          v_res.position,
          v_res.size_bytes
        );
      END FOR;
    END FOR;
  END FOR;

  RETURN v_new_course_id;
END;
$$;

-- 4. Atomic Reordering RPC
CREATE OR REPLACE FUNCTION public.reorder_items_rpc(p_table text, p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean := private.has_role(v_user_id, 'admin');
  v_is_instructor boolean := private.has_role(v_user_id, 'instructor');
  v_item jsonb;
  v_id uuid;
  v_pos int;
  v_course_id uuid;
BEGIN
  IF NOT (v_is_admin OR v_is_instructor) THEN
    RAISE EXCEPTION 'Acceso denegado: se requieren permisos de administración o profesor';
  END IF;

  IF p_table NOT IN ('modules', 'lessons') THEN
    RAISE EXCEPTION 'Tabla no permitida para reordenación';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_id := (v_item->>'id')::uuid;
    v_pos := (v_item->>'position')::int;

    IF p_table = 'modules' THEN
      SELECT course_id INTO v_course_id FROM public.modules WHERE id = v_id;
      IF v_is_instructor AND NOT v_is_admin AND NOT private.is_course_instructor(v_course_id, v_user_id) THEN
        RAISE EXCEPTION 'No tienes permiso para reordenar este módulo';
      END IF;
      UPDATE public.modules SET position = v_pos WHERE id = v_id;
    ELSIF p_table = 'lessons' THEN
      SELECT course_id INTO v_course_id FROM public.lessons WHERE id = v_id;
      IF v_is_instructor AND NOT v_is_admin AND NOT private.is_course_instructor(v_course_id, v_user_id) THEN
        RAISE EXCEPTION 'No tienes permiso para reordenar esta lección';
      END IF;
      UPDATE public.lessons SET position = v_pos WHERE id = v_id;
    END IF;
  END FOR;
END;
$$;

-- 5. Trigger to set instructor_id automatically on course insertion by instructors
CREATE OR REPLACE FUNCTION public.handle_course_instructor_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean := private.has_role(v_user_id, 'admin');
  v_is_instructor boolean := private.has_role(v_user_id, 'instructor');
  v_instructor_id uuid;
BEGIN
  IF v_is_instructor AND NOT v_is_admin THEN
    v_instructor_id := private.get_instructor_id_for_user(v_user_id);
    IF v_instructor_id IS NULL THEN
      RAISE EXCEPTION 'Tu cuenta de usuario no tiene un perfil de profesor vinculado';
    END IF;
    NEW.instructor_id := v_instructor_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_course_instructor_assignment ON public.courses;
CREATE TRIGGER trg_course_instructor_assignment
  BEFORE INSERT ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_course_instructor_assignment();

-- 6. Trigger to prevent instructor self-escalation on update
CREATE OR REPLACE FUNCTION public.prevent_instructor_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean := private.has_role(v_user_id, 'admin');
BEGIN
  IF NOT v_is_admin THEN
    IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
      RAISE EXCEPTION 'No puedes modificar el usuario vinculado';
    END IF;
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      RAISE EXCEPTION 'No puedes modificar el estado activo de profesor';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_instructor_escalation ON public.instructors;
CREATE TRIGGER trg_prevent_instructor_escalation
  BEFORE UPDATE ON public.instructors
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_instructor_escalation();
