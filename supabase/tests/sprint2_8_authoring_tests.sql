-- SQL Security & Functionality Tests for Sprint 2.8 Authoring Studio

BEGIN;

-- Test existence of lesson_versions table
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public'
  AND table_name = 'lesson_versions'
);

-- Test RPC publish_lesson_rpc exists
SELECT EXISTS (
  SELECT FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname = 'publish_lesson_rpc'
);

-- Test RPC restore_lesson_version_rpc exists
SELECT EXISTS (
  SELECT FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname = 'restore_lesson_version_rpc'
);

ROLLBACK;
