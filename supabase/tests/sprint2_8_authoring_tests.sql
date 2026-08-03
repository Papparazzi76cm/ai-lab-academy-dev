-- SQL Security & Functionality Tests for Sprint 2.8 Authoring Studio

BEGIN;

-- 1. Test existence of lesson_versions table and revision column on lessons
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public'
  AND table_name = 'lesson_versions'
);

SELECT EXISTS (
  SELECT FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'lessons'
  AND column_name = 'revision'
);

-- 2. Test RPC existence
SELECT EXISTS (
  SELECT FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname = 'save_lesson_blocks_rpc'
);

SELECT EXISTS (
  SELECT FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname = 'publish_lesson_rpc'
);

SELECT EXISTS (
  SELECT FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname = 'restore_lesson_version_rpc'
);

SELECT EXISTS (
  SELECT FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname = 'get_lesson_versions_rpc'
);

-- 3. Verify REVOKE EXECUTE FROM PUBLIC on Security Definer RPCs
SELECT COUNT(*) = 0
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('save_lesson_blocks_rpc', 'publish_lesson_rpc', 'restore_lesson_version_rpc')
  AND grantee = 'PUBLIC';

ROLLBACK;
