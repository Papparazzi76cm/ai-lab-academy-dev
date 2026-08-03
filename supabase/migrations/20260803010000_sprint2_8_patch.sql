-- Migration: Sprint 2.8 Patch — Atomic save, server-side validation publish, versioning, permissions

-- 1. Ensure revision on lessons table
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 1;

-- 2. Ensure extra columns on lesson_versions table
ALTER TABLE public.lesson_versions ADD COLUMN IF NOT EXISTS schema_version INT NOT NULL DEFAULT 1;
ALTER TABLE public.lesson_versions ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 1;
ALTER TABLE public.lesson_versions ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT 'manual_publish';
ALTER TABLE public.lesson_versions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'authoring_studio';
ALTER TABLE public.lesson_versions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Atomic Block Saving RPC with optimistic locking (revision)
CREATE OR REPLACE FUNCTION public.save_lesson_blocks_rpc(
  p_lesson_id UUID,
  p_blocks JSONB,
  p_expected_revision BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_course_id UUID;
  v_is_admin BOOLEAN;
  v_is_instructor BOOLEAN;
  v_current_revision BIGINT;
  v_new_revision BIGINT;
  v_block JSONB;
  v_idx INT := 0;
  v_block_id UUID;
  v_type TEXT;
  v_content JSONB;
  v_settings JSONB;
  v_persisted_blocks JSONB := '[]'::jsonb;
  v_updated_at TIMESTAMPTZ := now();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock lesson row and verify existence
  SELECT course_id, COALESCE(revision, 1)
  INTO v_course_id, v_current_revision
  FROM public.lessons
  WHERE id = p_lesson_id
  FOR UPDATE;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Lesson not found';
  END IF;

  -- Verify permissions
  v_is_admin := private.has_role(v_user_id, 'admin'::app_role);
  v_is_instructor := private.is_course_instructor(v_course_id, v_user_id);

  IF NOT (v_is_admin OR v_is_instructor) THEN
    RAISE EXCEPTION 'Permission denied to edit lesson blocks';
  END IF;

  -- Check revision for optimistic locking conflict
  IF p_expected_revision IS NOT NULL AND v_current_revision <> p_expected_revision THEN
    RAISE EXCEPTION 'REVISION_CONFLICT: La lección fue modificada en otra sesión (Servidor: %, Esperada: %)', v_current_revision, p_expected_revision;
  END IF;

  -- Validate input array
  IF p_blocks IS NULL OR jsonb_typeof(p_blocks) <> 'array' THEN
    RAISE EXCEPTION 'Invalid block format: blocks must be a JSON array';
  END IF;

  -- Delete existing blocks for this lesson in transaction
  DELETE FROM public.lesson_blocks WHERE lesson_id = p_lesson_id;

  -- Re-insert normalized blocks
  FOR v_block IN SELECT * FROM jsonb_array_elements(p_blocks)
  LOOP
    v_type := TRIM(COALESCE(v_block->>'type', ''));
    IF v_type IS NULL OR v_type = '' THEN
      RAISE EXCEPTION 'Invalid block at position %: missing block type', v_idx;
    END IF;

    -- Validate or assign UUID
    IF v_block->>'id' IS NOT NULL AND (v_block->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_block_id := (v_block->>'id')::UUID;
    ELSE
      v_block_id := gen_random_uuid();
    END IF;

    v_content := COALESCE(v_block->'content_json', '{}'::jsonb);
    v_settings := COALESCE(v_block->'settings_json', '{}'::jsonb);

    INSERT INTO public.lesson_blocks (
      id,
      lesson_id,
      position,
      type,
      content_json,
      settings_json,
      created_at,
      updated_at
    ) VALUES (
      v_block_id,
      p_lesson_id,
      v_idx,
      v_type,
      v_content,
      v_settings,
      v_updated_at,
      v_updated_at
    );

    v_idx := v_idx + 1;
  END LOOP;

  -- Increment revision and update lesson
  v_new_revision := v_current_revision + 1;
  UPDATE public.lessons
  SET revision = v_new_revision,
      updated_at = v_updated_at
  WHERE id = p_lesson_id;

  -- Build persisted response
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'lesson_id', lesson_id,
      'position', position,
      'type', type,
      'content_json', content_json,
      'settings_json', settings_json,
      'created_at', created_at,
      'updated_at', updated_at
    ) ORDER BY position ASC
  ), '[]'::jsonb) INTO v_persisted_blocks
  FROM public.lesson_blocks
  WHERE lesson_id = p_lesson_id;

  RETURN jsonb_build_object(
    'success', true,
    'lesson_id', p_lesson_id,
    'revision', v_new_revision,
    'updated_at', v_updated_at,
    'blocks', v_persisted_blocks
  );
END;
$$;

-- 4. Server-Side Validating Publish RPC
CREATE OR REPLACE FUNCTION public.publish_lesson_rpc(
  p_lesson_id UUID,
  p_commit_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_course_id UUID;
  v_current_revision BIGINT;
  v_next_version INT;
  v_blocks JSONB;
  v_block RECORD;
  v_errors JSONB := '[]'::jsonb;
  v_url TEXT;
  v_provider TEXT;
  v_quiz_id UUID;
  v_template_id UUID;
  v_quiz_exists BOOLEAN;
  v_template_exists BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT course_id, COALESCE(revision, 1) INTO v_course_id, v_current_revision
  FROM public.lessons
  WHERE id = p_lesson_id
  FOR UPDATE;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Lesson not found';
  END IF;

  IF NOT (private.is_course_instructor(v_course_id, v_user_id) OR private.has_role(v_user_id, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Permission denied to publish lesson';
  END IF;

  -- Validate all blocks server-side
  FOR v_block IN
    SELECT id, type, position, content_json, settings_json
    FROM public.lesson_blocks
    WHERE lesson_id = p_lesson_id
    ORDER BY position ASC
  LOOP
    -- 1. Check unsafe protocols in URLs (javascript:, data:, file:)
    v_url := LOWER(COALESCE(v_block.content_json->>'url', v_block.content_json->>'embedUrl', ''));
    IF v_url LIKE 'javascript:%' OR v_url LIKE 'data:%' OR v_url LIKE 'file:%' THEN
      v_errors := v_errors || jsonb_build_object(
        'block_id', v_block.id,
        'field', 'url',
        'message', 'URL insegura detectada (no se permiten protocolos javascript:, data: o file:).'
      );
    END IF;

    -- 2. Mandatory ALT for images
    IF v_block.type = 'image' THEN
      IF TRIM(COALESCE(v_block.content_json->>'alt', '')) = '' THEN
        v_errors := v_errors || jsonb_build_object(
          'block_id', v_block.id,
          'field', 'alt',
          'message', 'Las imágenes publicadas deben incluir texto alternativo (ALT) obligatorio para accesibilidad.'
        );
      END IF;
    END IF;

    -- 3. Embed provider whitelist check
    IF v_block.type = 'embed' THEN
      v_provider := LOWER(COALESCE(v_block.content_json->>'provider', ''));
      IF v_provider NOT IN ('youtube', 'vimeo', 'loom', 'canva', 'figma') THEN
        v_errors := v_errors || jsonb_build_object(
          'block_id', v_block.id,
          'field', 'provider',
          'message', 'El proveedor de embed no está en la lista blanca (YouTube, Vimeo, Loom, Canva, Figma).'
        );
      END IF;
    END IF;

    -- 4. Quiz reference check
    IF v_block.type IN ('quiz_block', 'quiz') THEN
      IF (v_block.content_json->>'quizId') IS NOT NULL AND (v_block.content_json->>'quizId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_quiz_id := (v_block.content_json->>'quizId')::UUID;
        SELECT EXISTS (SELECT 1 FROM public.quizzes WHERE id = v_quiz_id) INTO v_quiz_exists;
        IF NOT v_quiz_exists THEN
          v_errors := v_errors || jsonb_build_object(
            'block_id', v_block.id,
            'field', 'quizId',
            'message', 'El cuestionario referenciado no existe en la base de datos.'
          );
        END IF;
      END IF;
    END IF;

    -- 5. Certificate reference check
    IF v_block.type = 'certificate_block' THEN
      IF (v_block.content_json->>'templateId') IS NOT NULL AND (v_block.content_json->>'templateId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_template_id := (v_block.content_json->>'templateId')::UUID;
        SELECT EXISTS (SELECT 1 FROM public.certificate_templates WHERE id = v_template_id) INTO v_template_exists;
        IF NOT v_template_exists THEN
          v_errors := v_errors || jsonb_build_object(
            'block_id', v_block.id,
            'field', 'templateId',
            'message', 'La plantilla de certificado referenciada no existe.'
          );
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- If server validation errors exist, abort publish
  IF jsonb_array_length(v_errors) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'errors', v_errors
    );
  END IF;

  -- Build normalized snapshot
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

  -- Calculate next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
  FROM public.lesson_versions
  WHERE lesson_id = p_lesson_id;

  -- Create version record
  INSERT INTO public.lesson_versions (
    lesson_id,
    version_number,
    schema_version,
    revision,
    blocks_snapshot,
    commit_message,
    reason,
    source,
    published_by,
    created_by
  ) VALUES (
    p_lesson_id,
    v_next_version,
    1,
    v_current_revision,
    v_blocks,
    COALESCE(p_commit_message, 'Publicación de versión ' || v_next_version),
    'manual_publish',
    'authoring_studio',
    v_user_id,
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
    'revision', v_current_revision,
    'published_at', now(),
    'block_count', jsonb_array_length(v_blocks)
  );
END;
$$;

-- 5. Transactional Version Restoration RPC
CREATE OR REPLACE FUNCTION public.restore_lesson_version_rpc(
  p_lesson_id UUID,
  p_version_number INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARATION
  v_user_id UUID := auth.uid();
  v_course_id UUID;
  v_current_revision BIGINT;
  v_target_snapshot JSONB;
  v_current_snapshot JSONB;
  v_next_version INT;
  v_new_revision BIGINT;
  v_block RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT course_id, COALESCE(revision, 1) INTO v_course_id, v_current_revision
  FROM public.lessons
  WHERE id = p_lesson_id
  FOR UPDATE;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Lesson not found';
  END IF;

  IF NOT (private.is_course_instructor(v_course_id, v_user_id) OR private.has_role(v_user_id, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Permission denied to restore version';
  END IF;

  SELECT blocks_snapshot INTO v_target_snapshot
  FROM public.lesson_versions
  WHERE lesson_id = p_lesson_id AND version_number = p_version_number;

  IF v_target_snapshot IS NULL OR jsonb_typeof(v_target_snapshot) <> 'array' THEN
    RAISE EXCEPTION 'Version snapshot not found or invalid';
  END IF;

  -- 1. Create a pre-restore backup version of current state
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
  ), '[]'::jsonb) INTO v_current_snapshot
  FROM public.lesson_blocks
  WHERE lesson_id = p_lesson_id;

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
  FROM public.lesson_versions
  WHERE lesson_id = p_lesson_id;

  INSERT INTO public.lesson_versions (
    lesson_id,
    version_number,
    schema_version,
    revision,
    blocks_snapshot,
    commit_message,
    reason,
    source,
    published_by,
    created_by
  ) VALUES (
    p_lesson_id,
    v_next_version,
    1,
    v_current_revision,
    v_current_snapshot,
    'Copia de seguridad antes de restaurar versión ' || p_version_number,
    'pre_restore',
    'authoring_studio',
    v_user_id,
    v_user_id
  );

  -- 2. Delete existing blocks and re-insert target snapshot
  DELETE FROM public.lesson_blocks WHERE lesson_id = p_lesson_id;

  FOR v_block IN SELECT * FROM jsonb_to_recordset(v_target_snapshot) AS x(
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
      COALESCE(v_block.type, 'paragraph'),
      COALESCE(v_block.position, 0),
      COALESCE(v_block.content_json, '{}'::jsonb),
      COALESCE(v_block.settings_json, '{}'::jsonb),
      now(),
      now()
    );
  END LOOP;

  -- 3. Increment revision
  v_new_revision := v_current_revision + 1;
  UPDATE public.lessons
  SET revision = v_new_revision,
      updated_at = now()
  WHERE id = p_lesson_id;

  RETURN jsonb_build_object(
    'success', true,
    'lesson_id', p_lesson_id,
    'restored_version', p_version_number,
    'revision', v_new_revision
  );
END;
$$;

-- 6. RPC for Paginated Version History
CREATE OR REPLACE FUNCTION public.get_lesson_versions_rpc(
  p_lesson_id UUID,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_course_id UUID;
  v_total INT;
  v_versions JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT course_id INTO v_course_id FROM public.lessons WHERE id = p_lesson_id;
  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Lesson not found';
  END IF;

  IF NOT (private.is_course_instructor(v_course_id, v_user_id) OR private.has_role(v_user_id, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT COUNT(*) INTO v_total FROM public.lesson_versions WHERE lesson_id = p_lesson_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'lesson_id', lesson_id,
      'version_number', version_number,
      'schema_version', schema_version,
      'revision', revision,
      'blocks_snapshot', blocks_snapshot,
      'commit_message', commit_message,
      'reason', reason,
      'source', source,
      'published_by', published_by,
      'created_by', created_by,
      'created_at', created_at
    ) ORDER BY version_number DESC
  ), '[]'::jsonb) INTO v_versions
  FROM (
    SELECT * FROM public.lesson_versions
    WHERE lesson_id = p_lesson_id
    ORDER BY version_number DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN jsonb_build_object(
    'total', v_total,
    'versions', v_versions
  );
END;
$$;

-- 7. Permissions & Grants (Strict RLS + REVOKE FROM PUBLIC)
REVOKE EXECUTE ON FUNCTION public.save_lesson_blocks_rpc(UUID, JSONB, BIGINT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.publish_lesson_rpc(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restore_lesson_version_rpc(UUID, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_lesson_versions_rpc(UUID, INT, INT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_lesson_blocks_rpc(UUID, JSONB, BIGINT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.publish_lesson_rpc(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.restore_lesson_version_rpc(UUID, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_lesson_versions_rpc(UUID, INT, INT) TO authenticated, service_role;
