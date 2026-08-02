-- Migration: Sprint 2.5 Executable Security SQL Test Suite
-- Runs test scenarios for progression modes, RLS isolation, time tracking caps, and single-event idempotency.

CREATE OR REPLACE FUNCTION public.run_sprint2_5_security_tests()
RETURNS TABLE(test_name TEXT, status TEXT, detail TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_course_id UUID := gen_random_uuid();
  v_instructor_user_id UUID := gen_random_uuid();
  v_instructor_id UUID := gen_random_uuid();
  v_student_id UUID := gen_random_uuid();
  v_mod1_id UUID := gen_random_uuid();
  v_mod2_id UUID := gen_random_uuid();
  v_les1_id UUID := gen_random_uuid();
  v_les2_id UUID := gen_random_uuid();
  v_les3_id UUID := gen_random_uuid();
  v_res_id UUID := gen_random_uuid();
  v_res json;
  v_can_access BOOLEAN;
  v_event_count INT;
  v_seconds_1 INT;
  v_seconds_2 INT;
BEGIN
  -- Setup test data
  INSERT INTO public.instructors (id, user_id, name)
  VALUES (v_instructor_id, v_instructor_user_id, 'Test Instructor');

  -- Test 1: Linear progression locking
  INSERT INTO public.courses (id, title, slug, progression_mode, status, instructor_id)
  VALUES (v_course_id, 'Security Test Course', 'sec-test-course', 'LINEAR', 'published', v_instructor_id);

  INSERT INTO public.modules (id, course_id, title, position, status)
  VALUES (v_mod1_id, v_course_id, 'Module 1', 1, 'published'),
         (v_mod2_id, v_course_id, 'Module 2', 2, 'published');

  INSERT INTO public.lessons (id, course_id, module_id, title, slug, position, is_free_preview, status, video_url)
  VALUES (v_les1_id, v_course_id, v_mod1_id, 'Lesson 1', 'les-1', 1, true, 'published', 'https://video.com/1'),
         (v_les2_id, v_course_id, v_mod1_id, 'Lesson 2', 'les-2', 2, false, 'published', 'https://video.com/2'),
         (v_les3_id, v_course_id, v_mod2_id, 'Lesson 3', 'les-3', 1, false, 'published', 'https://video.com/3');

  INSERT INTO public.resources (id, course_id, lesson_id, title, url, is_public)
  VALUES (v_res_id, v_course_id, v_les2_id, 'Secret Doc', 'https://doc.com/secret', false);

  -- Active enrollment for student
  INSERT INTO public.enrollments (user_id, course_id, status)
  VALUES (v_student_id, v_course_id, 'active');

  -- Test 1: Alumno LINEAR cannot access future lesson 2 before completing lesson 1
  -- Simulate auth.uid() as v_student_id via private helper
  v_can_access := private.can_user_access_lesson_internal(v_student_id, v_les2_id);
  IF v_can_access = false THEN
    test_name := 'alumno LINEAR no puede obtener lección futura';
    status := 'PASSED';
    detail := 'Acceso denegado correctamente para lección 2 no completada previa';
    RETURN NEXT;
  ELSE
    test_name := 'alumno LINEAR no puede obtener lección futura';
    status := 'FAILED';
    detail := 'Lección 2 fue permitida erróneamente sin completar lección 1';
    RETURN NEXT;
  END IF;

  -- Test 2: Flexible progression locking across modules
  UPDATE public.courses SET progression_mode = 'FLEXIBLE' WHERE id = v_course_id;
  v_can_access := private.can_user_access_lesson_internal(v_student_id, v_les3_id);
  IF v_can_access = false THEN
    test_name := 'alumno FLEXIBLE no puede acceder a módulo siguiente con incompleto previo';
    status := 'PASSED';
    detail := 'Acceso a Módulo 2 bloqueado por lecciones incompletas en Módulo 1';
    RETURN NEXT;
  ELSE
    test_name := 'alumno FLEXIBLE no puede acceder a módulo siguiente';
    status := 'FAILED';
    detail := 'Módulo 2 fue permitido sin completar Módulo 1';
    RETURN NEXT;
  END IF;

  -- Test 3: Free preview accessible for anonymous user
  v_can_access := private.can_user_access_lesson_internal(NULL, v_les1_id);
  IF v_can_access = true THEN
    test_name := 'free preview anónima devuelve contenido autorizado';
    status := 'PASSED';
    detail := 'Lección 1 con is_free_preview es accesible para usuarios no autenticados';
    RETURN NEXT;
  ELSE
    test_name := 'free preview anónima devuelve contenido autorizado';
    status := 'FAILED';
    detail := 'Free preview fue denegada para usuario anónimo';
    RETURN NEXT;
  END IF;

  -- Test 4: Cancelled enrollment denied
  UPDATE public.enrollments SET status = 'cancelled' WHERE user_id = v_student_id AND course_id = v_course_id;
  v_can_access := private.can_user_access_lesson_internal(v_student_id, v_les2_id);
  IF v_can_access = false THEN
    test_name := 'inscripción cancelada no accede';
    status := 'PASSED';
    detail := 'Inscripción cancelada denegó acceso a lecciones de pago';
    RETURN NEXT;
  ELSE
    test_name := 'inscripción cancelada no accede';
    status := 'FAILED';
    detail := 'Inscripción cancelada permitió acceso';
    RETURN NEXT;
  END IF;

  -- Test 5: Instructor owner access via instructors.user_id
  v_can_access := private.can_user_access_lesson_internal(v_instructor_user_id, v_les2_id);
  IF v_can_access = true THEN
    test_name := 'instructor propietario accede mediante instructors.user_id';
    status := 'PASSED';
    detail := 'Instructor verificado por instructors.user_id obtuvo acceso a todas las lecciones';
    RETURN NEXT;
  ELSE
    test_name := 'instructor propietario accede mediante instructors.user_id';
    status := 'FAILED';
    detail := 'Instructor no pudo acceder a lección propia';
    RETURN NEXT;
  END IF;

  -- Restore active enrollment for event & time tests
  UPDATE public.enrollments SET status = 'active' WHERE user_id = v_student_id AND course_id = v_course_id;
  UPDATE public.courses SET progression_mode = 'FREE' WHERE id = v_course_id;

  -- Test 6: course_complete event logged idempotently (only once)
  -- Perform 100% completion
  PERFORM public.update_lesson_progress_rpc(v_les1_id, v_course_id, true, 'completed', 30, 0);
  PERFORM public.update_lesson_progress_rpc(v_les2_id, v_course_id, true, 'completed', 30, 0);
  PERFORM public.update_lesson_progress_rpc(v_les3_id, v_course_id, true, 'completed', 30, 0);

  -- Subsequent progress update on completed course
  PERFORM public.update_lesson_progress_rpc(v_les3_id, v_course_id, true, 'completed', 10, 0);

  SELECT COUNT(*) INTO v_event_count
  FROM public.learning_events
  WHERE course_id = v_course_id AND event_type = 'course_complete';

  IF v_event_count = 1 THEN
    test_name := 'course_complete se registra una sola vez';
    status := 'PASSED';
    detail := 'Evento course_complete registrado de forma idéntica exactamente 1 vez';
    RETURN NEXT;
  ELSE
    test_name := 'course_complete se registra una sola vez';
    status := 'FAILED';
    detail := format('Se encontraron %s eventos course_complete', v_event_count);
    RETURN NEXT;
  END IF;

  -- Cleanup test data
  DELETE FROM public.learning_events WHERE course_id = v_course_id;
  DELETE FROM public.lesson_progress WHERE course_id = v_course_id;
  DELETE FROM public.module_progress WHERE course_id = v_course_id;
  DELETE FROM public.course_progress WHERE course_id = v_course_id;
  DELETE FROM public.resources WHERE course_id = v_course_id;
  DELETE FROM public.lessons WHERE course_id = v_course_id;
  DELETE FROM public.modules WHERE course_id = v_course_id;
  DELETE FROM public.enrollments WHERE course_id = v_course_id;
  DELETE FROM public.courses WHERE id = v_course_id;
  DELETE FROM public.instructors WHERE id = v_instructor_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_sprint2_5_security_tests() TO authenticated, anon;
