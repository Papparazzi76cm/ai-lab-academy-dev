-- Migration: Sprint 2.8 Authoring Studio
-- Create lesson_versions table and publish_lesson_rpc

CREATE TABLE IF NOT EXISTS public.lesson_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  blocks_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  commit_message TEXT,
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_lesson_version UNIQUE (lesson_id, version_number)
);

-- Enable RLS
ALTER TABLE public.lesson_versions ENABLE ROW LEVEL SECURITY;

-- Policies for lesson_versions
CREATE POLICY "Instructors and admins can view lesson versions"
  ON public.lesson_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_versions.lesson_id
      AND (
        private.is_course_instructor(l.course_id)
        OR private.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

CREATE POLICY "Instructors and admins can create lesson versions"
  ON public.lesson_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_versions.lesson_id
      AND (
        private.is_course_instructor(l.course_id)
        OR private.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

-- RPC to publish a lesson transactionally
CREATE OR REPLACE FUNCTION public.publish_lesson_rpc(
  p_lesson_id UUID,
  p_commit_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_course_id UUID;
  v_next_version INT;
  v_blocks JSONB;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT course_id INTO v_course_id
  FROM public.lessons
  WHERE id = p_lesson_id;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Lesson not found';
  END IF;

  IF NOT (private.is_course_instructor(v_course_id) OR private.has_role(v_user_id, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Permission denied to publish lesson';
  END IF;

  -- Build blocks snapshot
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'lesson_id', lesson_id,
      'type', type,
      'position', position,
      'content_json', content_json,
      'settings_json', settings_json,
      'created_at', created_at,
      'updated_at', updated_at
    ) ORDER BY position ASC
  ), '[]'::jsonb) INTO v_blocks
  FROM public.lesson_blocks
  WHERE lesson_id = p_lesson_id;

  -- Determine version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
  FROM public.lesson_versions
  WHERE lesson_id = p_lesson_id;

  -- Insert snapshot version
  INSERT INTO public.lesson_versions (
    lesson_id,
    version_number,
    blocks_snapshot,
    commit_message,
    published_by
  ) VALUES (
    p_lesson_id,
    v_next_version,
    v_blocks,
    COALESCE(p_commit_message, 'Publicación de versión ' || v_next_version),
    v_user_id
  );

  -- Update lesson status
  UPDATE public.lessons
  SET status = 'published'::lesson_status,
      updated_at = now()
  WHERE id = p_lesson_id;

  RETURN jsonb_build_object(
    'success', true,
    'lesson_id', p_lesson_id,
    'version_number', v_next_version,
    'published_at', now(),
    'block_count', jsonb_array_length(v_blocks)
  );
END;
$$;

-- RPC to restore a version
CREATE OR REPLACE FUNCTION public.restore_lesson_version_rpc(
  p_lesson_id UUID,
  p_version_number INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_course_id UUID;
  v_snapshot JSONB;
  v_block RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT course_id INTO v_course_id
  FROM public.lessons
  WHERE id = p_lesson_id;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Lesson not found';
  END IF;

  IF NOT (private.is_course_instructor(v_course_id) OR private.has_role(v_user_id, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Permission denied to restore version';
  END IF;

  SELECT blocks_snapshot INTO v_snapshot
  FROM public.lesson_versions
  WHERE lesson_id = p_lesson_id AND version_number = p_version_number;

  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'Version snapshot not found';
  END IF;

  -- Delete current blocks
  DELETE FROM public.lesson_blocks WHERE lesson_id = p_lesson_id;

  -- Re-insert snapshot blocks
  FOR v_block IN SELECT * FROM jsonb_to_recordset(v_snapshot) AS x(
    id UUID,
    type TEXT,
    position INT,
    content_json JSONB,
    settings_json JSONB
  ) LOOP
    INSERT INTO public.lesson_blocks (
      id,
      lesson_id,
      type,
      position,
      content_json,
      settings_json,
      created_at,
      updated_at
    ) VALUES (
      COALESCE(v_block.id, gen_random_uuid()),
      p_lesson_id,
      v_block.type,
      v_block.position,
      COALESCE(v_block.content_json, '{}'::jsonb),
      COALESCE(v_block.settings_json, '{}'::jsonb),
      now(),
      now()
    );
  END LOOP;

  UPDATE public.lessons
  SET updated_at = now()
  WHERE id = p_lesson_id;

  RETURN jsonb_build_object(
    'success', true,
    'lesson_id', p_lesson_id,
    'restored_version', p_version_number
  );
END;
$$;
