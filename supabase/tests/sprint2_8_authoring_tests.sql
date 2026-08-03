-- SQL Security & Functionality Tests for Sprint 2.8 Authoring Studio
-- All tests run inside a single transaction and roll back automatically.

BEGIN;

DO $$
DECLARE
  v_admin_id UUID := gen_random_uuid();
  v_instructor_id UUID := gen_random_uuid();
  v_other_instructor_id UUID := gen_random_uuid();
  v_student_id UUID := gen_random_uuid();

  v_course_id UUID := gen_random_uuid();
  v_course_other_id UUID := gen_random_uuid();
  v_lesson_id UUID := gen_random_uuid();
  v_lesson_other_id UUID := gen_random_uuid();

  v_res JSONB;
  v_block_id UUID := gen_random_uuid();
  v_rev BIGINT;
  v_version_count INT;
  v_public_has_execute INT;
BEGIN
  -----------------------------------------------------------------------------
  -- 1. Schema & Column Verification
  -----------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lesson_versions'
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: Table public.lesson_versions does not exist';
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'revision'
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: Column lessons.revision does not exist';
  END IF;

  -----------------------------------------------------------------------------
  -- 2. Test RPC Grants & Security Definer Permissions
  -----------------------------------------------------------------------------
  SELECT COUNT(*) INTO v_public_has_execute
  FROM information_schema.routine_privileges
  WHERE routine_schema = 'public'
    AND routine_name IN ('save_lesson_blocks_rpc', 'publish_lesson_rpc', 'restore_lesson_version_rpc')
    AND grantee = 'PUBLIC';

  IF v_public_has_execute > 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Security Definer RPCs must not be executable by PUBLIC';
  END IF;

  -----------------------------------------------------------------------------
  -- 3. Seed Mock Users, Courses, and Lessons
  -----------------------------------------------------------------------------
  INSERT INTO public.users (id, email, full_name, role)
  VALUES
    (v_admin_id, 'admin@test.com', 'Admin User', 'admin'),
    (v_instructor_id, 'inst1@test.com', 'Instructor Owner', 'instructor'),
    (v_other_instructor_id, 'inst2@test.com', 'Other Instructor', 'instructor'),
    (v_student_id, 'student@test.com', 'Student User', 'student');

  -- Create Course owned by v_instructor_id
  INSERT INTO public.courses (id, title, instructor_id, published)
  VALUES (v_course_id, 'Curso de IA', v_instructor_id, true);

  -- Create Course owned by v_other_instructor_id
  INSERT INTO public.courses (id, title, instructor_id, published)
  VALUES (v_course_other_id, 'Curso Ajeno', v_other_instructor_id, true);

  -- Create Lesson
  INSERT INTO public.lessons (id, course_id, title, position, revision)
  VALUES (v_lesson_id, v_course_id, 'Lección 1: Intro', 0, 1);

  INSERT INTO public.lessons (id, course_id, title, position, revision)
  VALUES (v_lesson_other_id, v_course_other_id, 'Lección Ajena', 0, 1);

  -----------------------------------------------------------------------------
  -- 4. Test Permissions: Student Blocked from save_lesson_blocks_rpc
  -----------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_student_id)::text, true);

  BEGIN
    PERFORM public.save_lesson_blocks_rpc(
      v_lesson_id,
      jsonb_build_array(jsonb_build_object('type', 'paragraph', 'content_json', '{"text": "Hola"}'::jsonb))
    );
    RAISE EXCEPTION 'TEST FAILED: Student was able to save lesson blocks';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%Permission denied%' THEN
      RAISE EXCEPTION 'TEST FAILED: Expected Permission denied error for student, got: %', SQLERRM;
    END IF;
  END;

  -----------------------------------------------------------------------------
  -- 5. Test Permissions: Non-owner Instructor Blocked
  -----------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_other_instructor_id)::text, true);

  BEGIN
    PERFORM public.save_lesson_blocks_rpc(
      v_lesson_id,
      jsonb_build_array(jsonb_build_object('type', 'paragraph', 'content_json', '{"text": "Hola"}'::jsonb))
    );
    RAISE EXCEPTION 'TEST FAILED: Non-owner instructor was able to save lesson blocks';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%Permission denied%' THEN
      RAISE EXCEPTION 'TEST FAILED: Expected Permission denied error for non-owner, got: %', SQLERRM;
    END IF;
  END;

  -----------------------------------------------------------------------------
  -- 6. Test Permissions & Revision Conflict: Owner Instructor
  -----------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_instructor_id)::text, true);

  -- Test incorrect expected_revision conflict
  BEGIN
    PERFORM public.save_lesson_blocks_rpc(
      v_lesson_id,
      jsonb_build_array(jsonb_build_object('type', 'paragraph', 'content_json', '{"text": "Hola"}'::jsonb)),
      9999 -- Incorrect revision
    );
    RAISE EXCEPTION 'TEST FAILED: Expected REVISION_CONFLICT on wrong expected_revision';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%REVISION_CONFLICT%' THEN
      RAISE EXCEPTION 'TEST FAILED: Expected REVISION_CONFLICT error, got: %', SQLERRM;
    END IF;
  END;

  -----------------------------------------------------------------------------
  -- 7. Test Atomic Save & Stable IDs & Normalized Positions with Owner Instructor
  -----------------------------------------------------------------------------
  v_res := public.save_lesson_blocks_rpc(
    v_lesson_id,
    jsonb_build_array(
      jsonb_build_object(
        'id', v_block_id,
        'type', 'heading',
        'content_json', '{"text": "Título Principal"}'::jsonb,
        'settings_json', '{"visibility": "visible"}'::jsonb
      ),
      jsonb_build_object(
        'type', 'image',
        'content_json', '{"url": "https://example.com/a.png", "alt": "Imagen de prueba"}'::jsonb,
        'settings_json', '{"visibility": "visible"}'::jsonb
      )
    ),
    1 -- Matching expected_revision
  );

  IF (v_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'TEST FAILED: Atomic save failed for instructor owner';
  END IF;

  v_rev := (v_res->>'revision')::bigint;
  IF v_rev <> 2 THEN
    RAISE EXCEPTION 'TEST FAILED: Expected revision 2 after save, got: %', v_rev;
  END IF;

  -- Verify stable ID in database
  IF NOT EXISTS (
    SELECT 1 FROM public.lesson_blocks
    WHERE id = v_block_id AND lesson_id = v_lesson_id AND position = 0
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: Block was not persisted with stable ID and normalized position 0';
  END IF;

  -----------------------------------------------------------------------------
  -- 8. Test Rollback on Invalid Block Format
  -----------------------------------------------------------------------------
  BEGIN
    PERFORM public.save_lesson_blocks_rpc(v_lesson_id, '"invalid_not_an_array"'::jsonb, 2);
    RAISE EXCEPTION 'TEST FAILED: Non-array block input was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%Invalid block format%' THEN
      RAISE EXCEPTION 'TEST FAILED: Expected Invalid block format error, got: %', SQLERRM;
    END IF;
  END;

  -----------------------------------------------------------------------------
  -- 9. Test Invalid Publish (Image without mandatory ALT)
  -----------------------------------------------------------------------------
  -- Save invalid block (image without alt)
  PERFORM public.save_lesson_blocks_rpc(
    v_lesson_id,
    jsonb_build_array(
      jsonb_build_object(
        'id', v_block_id,
        'type', 'image',
        'content_json', '{"url": "https://example.com/bad.png", "alt": ""}'::jsonb
      )
    ),
    2
  );

  v_res := public.publish_lesson_rpc(v_lesson_id, 'Intento de publicación inválida');
  IF (v_res->>'success')::boolean IS NOT FALSE THEN
    RAISE EXCEPTION 'TEST FAILED: Invalid publish should fail server-side validation';
  END IF;

  IF jsonb_array_length(v_res->'errors') = 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Invalid publish should return block-level error details';
  END IF;

  -----------------------------------------------------------------------------
  -- 10. Test Valid Publish & Version Creation in Same Transaction
  -----------------------------------------------------------------------------
  -- Fix block to be valid (add alt text)
  PERFORM public.save_lesson_blocks_rpc(
    v_lesson_id,
    jsonb_build_array(
      jsonb_build_object(
        'id', v_block_id,
        'type', 'image',
        'content_json', '{"url": "https://example.com/good.png", "alt": "Texto ALT Valido"}'::jsonb
      )
    ),
    3
  );

  v_res := public.publish_lesson_rpc(v_lesson_id, 'Publicación Oficial v1');
  IF (v_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'TEST FAILED: Valid publish failed: %', v_res;
  END IF;

  IF (v_res->>'version_number')::int <> 1 THEN
    RAISE EXCEPTION 'TEST FAILED: Expected version_number 1, got %', (v_res->>'version_number');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.lesson_versions
    WHERE lesson_id = v_lesson_id AND version_number = 1
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: Version record was not created in lesson_versions table';
  END IF;

  -----------------------------------------------------------------------------
  -- 11. Test Version Restoration & Pre-Restore Automatic Snapshot
  -----------------------------------------------------------------------------
  -- Make another edit (revision 5)
  PERFORM public.save_lesson_blocks_rpc(
    v_lesson_id,
    jsonb_build_array(
      jsonb_build_object(
        'id', v_block_id,
        'type', 'paragraph',
        'content_json', '{"text": "Borrador posterior a v1"}'::jsonb
      )
    ),
    4
  );

  -- Test restoring version 1
  v_res := public.restore_lesson_version_rpc(v_lesson_id, 1);
  IF (v_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'TEST FAILED: Restore version failed: %', v_res;
  END IF;

  -- Check pre-restore automatic version created
  SELECT COUNT(*) INTO v_version_count
  FROM public.lesson_versions
  WHERE lesson_id = v_lesson_id AND reason = 'pre_restore';

  IF v_version_count <> 1 THEN
    RAISE EXCEPTION 'TEST FAILED: Pre-restore automatic snapshot was not registered in lesson_versions';
  END IF;

  -----------------------------------------------------------------------------
  -- 12. Test Restoring Version from Another Lesson (Must be Rejected)
  -----------------------------------------------------------------------------
  BEGIN
    PERFORM public.restore_lesson_version_rpc(v_lesson_other_id, 1);
    RAISE EXCEPTION 'TEST FAILED: Version from another lesson was restored unexpectedly';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%Version snapshot not found or invalid%' THEN
      RAISE EXCEPTION 'TEST FAILED: Expected Version snapshot not found or invalid error, got: %', SQLERRM;
    END IF;
  END;

  -----------------------------------------------------------------------------
  -- 13. Test Admin Authorization
  -----------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_id)::text, true);

  v_res := public.save_lesson_blocks_rpc(
    v_lesson_id,
    jsonb_build_array(
      jsonb_build_object(
        'type', 'heading',
        'content_json', '{"text": "Editado por Admin"}'::jsonb
      )
    ),
    6
  );

  IF (v_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'TEST FAILED: Admin authorization failed on save_lesson_blocks_rpc';
  END IF;

  RAISE NOTICE 'SUCCESS: All Sprint 2.8 SQL Security and Functionality assertions passed successfully!';
END;
$$;

ROLLBACK;
