-- ============================================================================
-- EXECUTABLE RLS SECURITY TEST SUITE FOR AI LAB ACADEMY
-- ============================================================================
-- Run this script in psql or Supabase SQL Editor.
-- Wrapped in a TRANSACTION with ROLLBACK so test data is automatically cleaned up.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_admin_id UUID := gen_random_uuid();
  v_instructor_owner_id UUID := gen_random_uuid();
  v_instructor_other_id UUID := gen_random_uuid();
  v_student_enrolled_id UUID := gen_random_uuid();
  v_student_not_enrolled_id UUID := gen_random_uuid();

  v_inst_owner_rec_id UUID := gen_random_uuid();
  v_inst_other_rec_id UUID := gen_random_uuid();

  v_course_owner_id UUID := gen_random_uuid();
  v_course_other_id UUID := gen_random_uuid();

  v_module_owner_id UUID := gen_random_uuid();
  v_lesson_free_owner_id UUID := gen_random_uuid();
  v_lesson_paid_owner_id UUID := gen_random_uuid();

  v_res_public_free_id UUID := gen_random_uuid();
  v_res_private_free_id UUID := gen_random_uuid();
  v_res_paid_id UUID := gen_random_uuid();

  v_count INT;
BEGIN
  RAISE NOTICE '--- SETTING UP FIXTURES FOR RLS SECURITY TESTS ---';

  -- 1. Create auth users
  INSERT INTO auth.users (id, email) VALUES
    (v_admin_id, 'admin@ailabacademy.com'),
    (v_instructor_owner_id, 'inst.owner@ailabacademy.com'),
    (v_instructor_other_id, 'inst.other@ailabacademy.com'),
    (v_student_enrolled_id, 'student.enrolled@ailabacademy.com'),
    (v_student_not_enrolled_id, 'student.notenrolled@ailabacademy.com');

  -- 2. Assign user roles
  INSERT INTO public.user_roles (user_id, role) VALUES
    (v_admin_id, 'admin'::app_role),
    (v_instructor_owner_id, 'instructor'::app_role),
    (v_instructor_other_id, 'instructor'::app_role),
    (v_student_enrolled_id, 'student'::app_role),
    (v_student_not_enrolled_id, 'student'::app_role);

  -- 3. Create instructor records
  INSERT INTO public.instructors (id, user_id, name, slug) VALUES
    (v_inst_owner_rec_id, v_instructor_owner_id, 'Prof. Owner', 'prof-owner'),
    (v_inst_other_rec_id, v_instructor_other_id, 'Prof. Other', 'prof-other');

  -- 4. Create courses
  INSERT INTO public.courses (id, title, slug, status, instructor_id) VALUES
    (v_course_owner_id, 'Owner Course', 'owner-course', 'published'::course_status, v_inst_owner_rec_id),
    (v_course_other_id, 'Other Course', 'other-course', 'published'::course_status, v_inst_other_rec_id);

  -- 5. Create modules & lessons
  INSERT INTO public.modules (id, course_id, title, position, status) VALUES
    (v_module_owner_id, v_course_owner_id, 'Module 1', 1, 'published'::lesson_status);

  INSERT INTO public.lessons (id, course_id, module_id, title, slug, is_free_preview, status, position) VALUES
    (v_lesson_free_owner_id, v_course_owner_id, v_module_owner_id, 'Free Lesson', 'free-lesson', true, 'published'::lesson_status, 1),
    (v_lesson_paid_owner_id, v_course_owner_id, v_module_owner_id, 'Paid Lesson', 'paid-lesson', false, 'published'::lesson_status, 2);

  -- 6. Create resources
  INSERT INTO public.resources (id, course_id, lesson_id, title, url, is_public) VALUES
    (v_res_public_free_id, v_course_owner_id, v_lesson_free_owner_id, 'Public Free Resource', 'https://example.com/pub-free.pdf', true),
    (v_res_private_free_id, v_course_owner_id, v_lesson_free_owner_id, 'Private Free Resource', 'https://example.com/priv-free.pdf', false),
    (v_res_paid_id, v_course_owner_id, v_lesson_paid_owner_id, 'Paid Lesson Resource', 'https://example.com/paid.pdf', false);

  -- 7. Enroll student_enrolled in v_course_owner_id
  INSERT INTO public.enrollments (user_id, course_id) VALUES
    (v_student_enrolled_id, v_course_owner_id);

  RAISE NOTICE '--- FIXTURES READY. EXECUTING SCENARIO TESTS ---';

  -- =========================================================================
  -- SCENARIO 1: ANON USER
  -- =========================================================================
  PERFORM set_config('role', 'anon', true);
  
  SELECT COUNT(*) INTO v_count FROM public.resources;
  ASSERT v_count = 1, 'Anon should ONLY see 1 resource (is_public=true in free published lesson). Found: ' || v_count;

  SELECT COUNT(*) INTO v_count FROM public.resources WHERE id = v_res_public_free_id;
  ASSERT v_count = 1, 'Anon must see the public free resource';

  SELECT COUNT(*) INTO v_count FROM public.resources WHERE id = v_res_private_free_id;
  ASSERT v_count = 0, 'Anon MUST NOT see private resource even in free lesson';

  RAISE NOTICE '[PASS] SCENARIO 1: Anon user restrictions verified.';

  -- =========================================================================
  -- SCENARIO 2: STUDENT NOT ENROLLED
  -- =========================================================================
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_student_not_enrolled_id, 'role', 'authenticated')::text, true);

  SELECT COUNT(*) INTO v_count FROM public.resources;
  ASSERT v_count = 1, 'Non-enrolled student should ONLY see public resource (count=1). Found: ' || v_count;

  SELECT COUNT(*) INTO v_count FROM public.resources WHERE id = v_res_paid_id;
  ASSERT v_count = 0, 'Non-enrolled student MUST NOT see paid lesson resource';

  RAISE NOTICE '[PASS] SCENARIO 2: Student (not enrolled) restrictions verified.';

  -- =========================================================================
  -- SCENARIO 3: STUDENT ENROLLED
  -- =========================================================================
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_student_enrolled_id, 'role', 'authenticated')::text, true);

  SELECT COUNT(*) INTO v_count FROM public.resources WHERE course_id = v_course_owner_id;
  ASSERT v_count = 3, 'Enrolled student MUST see all 3 resources of enrolled course. Found: ' || v_count;

  RAISE NOTICE '[PASS] SCENARIO 3: Student (enrolled) access verified.';

  -- =========================================================================
  -- SCENARIO 4: INSTRUCTOR OWNER
  -- =========================================================================
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_instructor_owner_id, 'role', 'authenticated')::text, true);

  SELECT COUNT(*) INTO v_count FROM public.resources WHERE course_id = v_course_owner_id;
  ASSERT v_count = 3, 'Instructor owner MUST see all 3 resources of owned course. Found: ' || v_count;

  -- Test write permission (UPDATE)
  UPDATE public.resources SET title = 'Updated Title by Owner' WHERE id = v_res_paid_id;
  SELECT COUNT(*) INTO v_count FROM public.resources WHERE id = v_res_paid_id AND title = 'Updated Title by Owner';
  ASSERT v_count = 1, 'Instructor owner MUST be able to update resources of owned course';

  RAISE NOTICE '[PASS] SCENARIO 4: Instructor owner access & write permissions verified.';

  -- =========================================================================
  -- SCENARIO 5: INSTRUCTOR NON-OWNER
  -- =========================================================================
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_instructor_other_id, 'role', 'authenticated')::text, true);

  -- Non-owner instructor is not enrolled, so they should only see public resource
  SELECT COUNT(*) INTO v_count FROM public.resources WHERE course_id = v_course_owner_id AND id = v_res_paid_id;
  ASSERT v_count = 0, 'Non-owner instructor MUST NOT see non-public resources of other instructor course';

  -- Test write permission (UPDATE should affect 0 rows or fail)
  UPDATE public.resources SET title = 'Hacked Title' WHERE id = v_res_paid_id;
  SELECT COUNT(*) INTO v_count FROM public.resources WHERE id = v_res_paid_id AND title = 'Hacked Title';
  ASSERT v_count = 0, 'Non-owner instructor MUST NOT be able to modify resources of other course';

  RAISE NOTICE '[PASS] SCENARIO 5: Instructor non-owner restrictions verified.';

  -- =========================================================================
  -- SCENARIO 6: ADMIN
  -- =========================================================================
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_id, 'role', 'authenticated')::text, true);

  SELECT COUNT(*) INTO v_count FROM public.resources;
  ASSERT v_count = 3, 'Admin MUST see all resources across all courses. Found: ' || v_count;

  UPDATE public.resources SET title = 'Admin Title' WHERE id = v_res_paid_id;
  SELECT COUNT(*) INTO v_count FROM public.resources WHERE id = v_res_paid_id AND title = 'Admin Title';
  ASSERT v_count = 1, 'Admin MUST be able to update any resource';

  RAISE NOTICE '[PASS] SCENARIO 6: Admin full access verified.';

  RAISE NOTICE '--- ALL 6 RLS SECURITY TEST SCENARIOS SUCCEEDED ---';
END $$;

ROLLBACK;
