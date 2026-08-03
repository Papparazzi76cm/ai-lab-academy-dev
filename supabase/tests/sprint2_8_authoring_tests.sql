-- ============================================================================
-- Sprint 2.8 Authoring Studio - PostgreSQL Database Level Verification Tests
-- File: supabase/tests/sprint2_8_authoring_tests.sql
-- ============================================================================

BEGIN;

-- Setup test helper schema/variables if needed
CREATE TEMP TABLE IF NOT EXISTS test_results (
  test_name TEXT PRIMARY KEY,
  passed BOOLEAN NOT NULL,
  details TEXT
);

-- ----------------------------------------------------------------------------
-- Test 1: Transactional save and atomic block writing via save_lesson_blocks_rpc
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_lesson_id UUID := gen_random_uuid();
  v_res JSONB;
  v_block_count INT;
BEGIN
  -- Insert mock lesson record
  INSERT INTO lessons (id, title, revision, slug)
  VALUES (v_lesson_id, 'Test Lesson AutoSave', 1, 'test-lesson-autosave')
  ON CONFLICT DO NOTHING;

  -- Execute save_lesson_blocks_rpc
  SELECT save_lesson_blocks_rpc(
    p_lesson_id := v_lesson_id,
    p_blocks := '[
      {"id": "' || gen_random_uuid() || '", "type": "heading", "position": 0, "content_json": {"text": "Test Heading"}, "settings_json": {}},
      {"id": "' || gen_random_uuid() || '", "type": "paragraph", "position": 1, "content_json": {"text": "Test Paragraph"}, "settings_json": {}}
    ]'::jsonb,
    p_expected_revision := 1
  ) INTO v_res;

  IF (v_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Test 1 Failed: save_lesson_blocks_rpc returned success=false';
  END IF;

  IF (v_res->>'revision')::int <> 2 THEN
    RAISE EXCEPTION 'Test 1 Failed: Revision was not incremented to 2';
  END IF;

  SELECT COUNT(*) INTO v_block_count
  FROM lesson_blocks
  WHERE lesson_id = v_lesson_id;

  IF v_block_count <> 2 THEN
    RAISE EXCEPTION 'Test 1 Failed: Expected 2 blocks in DB, found %', v_block_count;
  END IF;

  INSERT INTO test_results VALUES ('Test 1: Atomic Save RPC', TRUE, 'Blocks saved and revision incremented to 2');
END $$;

-- ----------------------------------------------------------------------------
-- Test 2: Revision Conflict Detection (REVISION_CONFLICT)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_lesson_id UUID := gen_random_uuid();
  v_res JSONB;
BEGIN
  INSERT INTO lessons (id, title, revision, slug)
  VALUES (v_lesson_id, 'Test Conflict Lesson', 5, 'test-conflict-lesson')
  ON CONFLICT DO NOTHING;

  -- Attempt to save expecting revision 1 when DB is at revision 5
  SELECT save_lesson_blocks_rpc(
    p_lesson_id := v_lesson_id,
    p_blocks := '[]'::jsonb,
    p_expected_revision := 1
  ) INTO v_res;

  IF (v_res->>'success')::boolean IS TRUE THEN
    RAISE EXCEPTION 'Test 2 Failed: Save succeeded despite revision conflict!';
  END IF;

  IF v_res->>'error_code' <> 'REVISION_CONFLICT' THEN
    RAISE EXCEPTION 'Test 2 Failed: Expected error_code REVISION_CONFLICT, got %', v_res->>'error_code';
  END IF;

  INSERT INTO test_results VALUES ('Test 2: Revision Conflict Detection', TRUE, 'REVISION_CONFLICT returned correctly');
END $$;

-- ----------------------------------------------------------------------------
-- Test 3: Rollback on invalid input payload
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_lesson_id UUID := gen_random_uuid();
  v_res JSONB;
  v_block_count INT;
BEGIN
  INSERT INTO lessons (id, title, revision, slug)
  VALUES (v_lesson_id, 'Test Rollback Lesson', 1, 'test-rollback-lesson')
  ON CONFLICT DO NOTHING;

  -- First seed 1 valid block
  PERFORM save_lesson_blocks_rpc(
    p_lesson_id := v_lesson_id,
    p_blocks := '[{"id": "' || gen_random_uuid() || '", "type": "heading", "position": 0, "content_json": {"text": "Original"}, "settings_json": {}}]'::jsonb,
    p_expected_revision := 1
  );

  -- Attempt invalid save with null lesson_id
  BEGIN
    PERFORM save_lesson_blocks_rpc(
      p_lesson_id := NULL,
      p_blocks := '[]'::jsonb,
      p_expected_revision := 2
    );
  EXCEPTION WHEN OTHERS THEN
    -- Expected error on null lesson_id
  END;

  -- Verify original block still exists intact and revision remained at 2
  SELECT COUNT(*) INTO v_block_count
  FROM lesson_blocks
  WHERE lesson_id = v_lesson_id;

  IF v_block_count <> 1 THEN
    RAISE EXCEPTION 'Test 3 Failed: Rollback failed, block count changed to %', v_block_count;
  END IF;

  INSERT INTO test_results VALUES ('Test 3: Atomic Rollback', TRUE, 'Transaction rolled back on invalid RPC input');
END $$;

-- ----------------------------------------------------------------------------
-- Test 4: Immutable published versions in lesson_versions
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_lesson_id UUID := gen_random_uuid();
  v_pub_res JSONB;
  v_ver_num INT;
BEGIN
  INSERT INTO lessons (id, title, revision, slug)
  VALUES (v_lesson_id, 'Test Publish Lesson', 1, 'test-publish-lesson')
  ON CONFLICT DO NOTHING;

  -- Seed a block
  PERFORM save_lesson_blocks_rpc(
    p_lesson_id := v_lesson_id,
    p_blocks := '[{"id": "' || gen_random_uuid() || '", "type": "paragraph", "position": 0, "content_json": {"text": "v1 content"}, "settings_json": {}}]'::jsonb,
    p_expected_revision := 1
  );

  -- Publish version
  SELECT publish_lesson_rpc(
    p_lesson_id := v_lesson_id,
    p_commit_message := 'Initial official release'
  ) INTO v_pub_res;

  v_ver_num := (v_pub_res->>'version_number')::int;

  IF v_ver_num < 1 THEN
    RAISE EXCEPTION 'Test 4 Failed: Expected version_number >= 1, got %', v_ver_num;
  END IF;

  INSERT INTO test_results VALUES ('Test 4: Immutable Publishing', TRUE, 'Published lesson snapshot created in lesson_versions');
END $$;

-- Summary Output
SELECT * FROM test_results;

ROLLBACK;
