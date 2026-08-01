-- Migration: lesson_blocks table, RLS policies, and atomic reorder RPC

-- 1. Create public.lesson_blocks table
CREATE TABLE IF NOT EXISTS public.lesson_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_lesson_blocks_lesson_pos ON public.lesson_blocks (lesson_id, position);

-- 3. Trigger for updated_at
DROP TRIGGER IF EXISTS update_lesson_blocks_updated_at ON public.lesson_blocks;
CREATE TRIGGER update_lesson_blocks_updated_at
  BEFORE UPDATE ON public.lesson_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Grants
GRANT SELECT ON public.lesson_blocks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lesson_blocks TO authenticated;
GRANT ALL ON public.lesson_blocks TO service_role;

-- 5. Enable RLS
ALTER TABLE public.lesson_blocks ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies if any
DROP POLICY IF EXISTS "Lesson blocks read policy" ON public.lesson_blocks;
DROP POLICY IF EXISTS "Instructors and Admins manage lesson blocks" ON public.lesson_blocks;

-- 7. Read Policy
CREATE POLICY "Lesson blocks read policy"
ON public.lesson_blocks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_blocks.lesson_id
      AND (
        (l.status = 'published'::lesson_status AND c.status = 'published'::course_status)
        OR (l.status = 'published'::lesson_status AND l.is_free_preview = true AND c.status = 'published'::course_status)
        OR EXISTS (
          SELECT 1 FROM public.enrollments e
          WHERE e.course_id = c.id
            AND e.user_id = auth.uid()
            AND e.status = 'active'::enrollment_status
        )
        OR private.is_course_instructor(c.id, auth.uid())
        OR private.has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

-- 8. CUD Management Policy for Instructors and Admins
CREATE POLICY "Instructors and Admins manage lesson blocks"
ON public.lesson_blocks FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id = lesson_blocks.lesson_id
      AND (
        private.is_course_instructor(l.course_id, auth.uid())
        OR private.has_role(auth.uid(), 'admin'::app_role)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id = lesson_blocks.lesson_id
      AND (
        private.is_course_instructor(l.course_id, auth.uid())
        OR private.has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

-- 9. Atomic Reorder RPC
CREATE OR REPLACE FUNCTION public.reorder_lesson_blocks_rpc(
  p_lesson_id UUID,
  p_blocks JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_course_id UUID;
  v_is_admin BOOLEAN := private.has_role(v_user_id, 'admin');
  v_is_instructor BOOLEAN;
  v_item JSONB;
  v_block_id UUID;
  v_pos INT;
BEGIN
  -- Check lesson exists
  SELECT course_id INTO v_course_id FROM public.lessons WHERE id = p_lesson_id;
  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Lección no encontrada';
  END IF;

  v_is_instructor := private.is_course_instructor(v_course_id, v_user_id);

  IF NOT (v_is_admin OR v_is_instructor) THEN
    RAISE EXCEPTION 'Acceso denegado: no tienes permisos para modificar los bloques de esta lección';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_blocks)
  LOOP
    v_block_id := (v_item->>'id')::UUID;
    v_pos := (v_item->>'position')::INT;
    
    UPDATE public.lesson_blocks
    SET position = v_pos, updated_at = now()
    WHERE id = v_block_id AND lesson_id = p_lesson_id;
  END LOOP;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_lesson_blocks_rpc(UUID, JSONB) TO authenticated, service_role;
