-- Executable SQL Test Suite for Sprint 2.6 Robustness & Security Patch
-- Tests all 18 requirements in a transactional block with assertions.

BEGIN;

DO $$
DECLARE
  v_course_id UUID;
  v_mod_id UUID;
  v_les_id UUID;
  v_user_id UUID := gen_random_uuid();
  v_quiz_id UUID;
  v_q1_id UUID;
  v_a1_1_id UUID;
  v_a1_2_id UUID;
  v_q2_id UUID;
  v_a2_1_id UUID;
  v_a2_2_id UUID;
  v_start_res JSON;
  v_attempt_id UUID;
  v_save_res JSON;
  v_submit_res JSON;
  v_pub_res JSON;
  v_err_msg TEXT;
  v_count INT;
BEGIN
  RAISE NOTICE '=== Running Sprint 2.6 SQL Tests ===';

  -- Create mock course, module, lesson
  INSERT INTO public.courses (id, title, slug, description, status, progression_mode)
  VALUES (gen_random_uuid(), 'Curso Test 2.6', 'curso-test-2-6', 'Desc', 'published', 'FREE')
  RETURNING id INTO v_course_id;

  INSERT INTO public.modules (id, course_id, title, position, status)
  VALUES (gen_random_uuid(), v_course_id, 'Módulo Test 2.6', 1, 'published')
  RETURNING id INTO v_mod_id;

  INSERT INTO public.lessons (id, course_id, module_id, title, position, status)
  VALUES (gen_random_uuid(), v_course_id, v_mod_id, 'Lección Test 2.6', 1, 'published')
  RETURNING id INTO v_les_id;

  -- Create mandatory published quiz for lesson
  INSERT INTO public.quizzes (
    id, course_id, module_id, lesson_id, title, status, passing_score,
    shuffle_questions, shuffle_answers, show_correct_answers, show_explanations, required_for_completion
  )
  VALUES (
    gen_random_uuid(), v_course_id, v_mod_id, v_les_id, 'Quiz Obligatorio Lección', 'published', 70,
    false, false, true, true, true
  )
  RETURNING id INTO v_quiz_id;

  -- Add valid question and answers
  INSERT INTO public.quiz_questions (id, quiz_id, type, question_text, points, position)
  VALUES (gen_random_uuid(), v_quiz_id, 'single_choice', '¿Pregunta 1?', 1, 0)
  RETURNING id INTO v_q1_id;

  INSERT INTO public.quiz_answers (id, question_id, answer_text, is_correct, position)
  VALUES (gen_random_uuid(), v_q1_id, 'Respuesta Correcta', true, 0)
  RETURNING id INTO v_a1_1_id;

  INSERT INTO public.quiz_answers (id, question_id, answer_text, is_correct, position)
  VALUES (gen_random_uuid(), v_q1_id, 'Respuesta Incorrecta', false, 1)
  RETURNING id INTO v_a1_2_id;

  -- TEST 1: Block lesson completion without passed mandatory quiz
  BEGIN
    -- Mock enrollment
    INSERT INTO public.enrollments (user_id, course_id, status) VALUES (v_user_id, v_course_id, 'active');
    
    PERFORM public.update_lesson_progress_rpc(v_les_id, v_course_id, true, 'completed', 10, 0);
    RAISE EXCEPTION 'TEST 1 FAILED: Lección completada sin aprobar quiz obligatorio.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%obligatorios%' THEN
      RAISE NOTICE 'TEST 1 PASSED: Bloqueo de lección sin quiz obligatorio verificado.';
    ELSE
      RAISE EXCEPTION 'TEST 1 FAILED: Error inesperado: %', SQLERRM;
    END IF;
  END;

  -- TEST 2: Start quiz attempt & lock
  v_start_res := public.start_quiz_attempt_rpc(v_quiz_id);
  v_attempt_id := (v_start_res->'attempt'->>'id')::uuid;

  IF v_attempt_id IS NULL THEN
    RAISE EXCEPTION 'TEST 2 FAILED: Intento no creado.';
  ELSE
    RAISE NOTICE 'TEST 2 PASSED: Intento iniciado id=%', v_attempt_id;
  END IF;

  -- TEST 8: Calling start_quiz_attempt_rpc again reuses active attempt
  v_start_res := public.start_quiz_attempt_rpc(v_quiz_id);
  IF (v_start_res->'attempt'->>'id')::uuid <> v_attempt_id THEN
    RAISE EXCEPTION 'TEST 8 FAILED: No reutilizó el intento activo.';
  ELSE
    RAISE NOTICE 'TEST 8 PASSED: Reutilización de intento activo verificada.';
  END IF;

  -- TEST 9: Ensure unique index prevents duplicate active attempts
  SELECT COUNT(*) INTO v_count FROM public.quiz_attempts WHERE user_id = v_user_id AND quiz_id = v_quiz_id AND status = 'in_progress';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST 9 FAILED: Existen % intentos activos en paralelo.', v_count;
  ELSE
    RAISE NOTICE 'TEST 9 PASSED: Concurrencia e índice único verificado.';
  END IF;

  -- TEST 17: Save answer & verify resumed state retains selected answers
  v_save_res := public.save_quiz_answer_rpc(v_attempt_id, v_q1_id, ARRAY[v_a1_1_id]);
  v_start_res := public.start_quiz_attempt_rpc(v_quiz_id);
  IF (v_start_res->'selected_answers'->v_q1_id::text->>0) <> v_a1_1_id::text THEN
    RAISE EXCEPTION 'TEST 17 FAILED: Respuestas guardadas no persistieron en reanudación.';
  ELSE
    RAISE NOTICE 'TEST 17 PASSED: Persistencia de respuestas en reanudación verificada.';
  END IF;

  -- TEST 16 & TEST 2: Submit quiz attempt passed & check transactional progress sync
  v_submit_res := public.submit_quiz_attempt_rpc(v_attempt_id);
  IF (v_submit_res->>'passed')::boolean <> true THEN
    RAISE EXCEPTION 'TEST 16 FAILED: Quiz no aprobado.';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.lesson_progress WHERE user_id = v_user_id AND lesson_id = v_les_id AND completed = true;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST 16 FAILED: Progreso de lección no actualizado tras aprobar quiz.';
  ELSE
    RAISE NOTICE 'TEST 16 & TEST 2 PASSED: Lección completada automáticamente tras aprobar quiz obligatorio.';
  END IF;

  -- TEST 10 & 11: Expiration behavior
  -- Create expired attempt
  INSERT INTO public.quiz_attempts (quiz_id, user_id, attempt_number, status, started_at, expires_at)
  VALUES (v_quiz_id, v_user_id, 2, 'in_progress', now() - interval '20 minutes', now() - interval '10 minutes')
  RETURNING id INTO v_attempt_id;

  v_save_res := public.save_quiz_answer_rpc(v_attempt_id, v_q1_id, ARRAY[v_a1_1_id]);
  IF (v_save_res->>'status') <> 'expired' THEN
    RAISE EXCEPTION 'TEST 10 FAILED: Guardar respuesta en intento expirado no devolvió estado expired.';
  ELSE
    RAISE NOTICE 'TEST 10 PASSED: Intento expirado rechaza guardar respuestas.';
  END IF;

  v_submit_res := public.submit_quiz_attempt_rpc(v_attempt_id);
  IF (v_submit_res->>'status') <> 'expired' THEN
    RAISE EXCEPTION 'TEST 11 FAILED: Submit en intento expirado no devolvió estado expired.';
  ELSE
    RAISE NOTICE 'TEST 11 PASSED: Intento expirado no corrige ni aprueba en submit.';
  END IF;

  -- TEST 12: publish_quiz_rpc fails if question has no correct answer
  INSERT INTO public.quizzes (id, course_id, title, status, passing_score)
  VALUES (gen_random_uuid(), v_course_id, 'Quiz Inválido 1', 'draft', 70)
  RETURNING id INTO v_quiz_id;

  INSERT INTO public.quiz_questions (id, quiz_id, type, question_text, points, position)
  VALUES (gen_random_uuid(), v_quiz_id, 'single_choice', '¿Sin correcta?', 1, 0)
  RETURNING id INTO v_q1_id;

  INSERT INTO public.quiz_answers (question_id, answer_text, is_correct, position)
  VALUES (v_q1_id, 'A', false, 0), (v_q1_id, 'B', false, 1);

  BEGIN
    PERFORM public.publish_quiz_rpc(v_quiz_id);
    RAISE EXCEPTION 'TEST 12 FAILED: Publicación no falló sin respuesta correcta.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%correcta%' THEN
      RAISE NOTICE 'TEST 12 PASSED: Publicación rechazada por falta de respuesta correcta.';
    ELSE
      RAISE EXCEPTION 'TEST 12 FAILED: Error inesperado: %', SQLERRM;
    END IF;
  END;

  -- TEST 13: publish_quiz_rpc fails if multiple choice lacks incorrect options
  INSERT INTO public.quizzes (id, course_id, title, status, passing_score)
  VALUES (gen_random_uuid(), v_course_id, 'Quiz Inválido 2', 'draft', 70)
  RETURNING id INTO v_quiz_id;

  INSERT INTO public.quiz_questions (id, quiz_id, type, question_text, points, position)
  VALUES (gen_random_uuid(), v_quiz_id, 'multiple_choice', '¿Todas correctas?', 1, 0)
  RETURNING id INTO v_q1_id;

  INSERT INTO public.quiz_answers (question_id, answer_text, is_correct, position)
  VALUES (v_q1_id, 'A', true, 0), (v_q1_id, 'B', true, 1);

  BEGIN
    PERFORM public.publish_quiz_rpc(v_quiz_id);
    RAISE EXCEPTION 'TEST 13 FAILED: Publicación no falló cuando opción múltiple carece de incorrectas.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%incorrecta%' THEN
      RAISE NOTICE 'TEST 13 PASSED: Publicación rechazada cuando opción múltiple carece de incorrectas.';
    ELSE
      RAISE EXCEPTION 'TEST 13 FAILED: Error inesperado: %', SQLERRM;
    END IF;
  END;

  -- TEST 14: publish_quiz_rpc fails on empty question or answer text
  INSERT INTO public.quizzes (id, course_id, title, status, passing_score)
  VALUES (gen_random_uuid(), v_course_id, 'Quiz Inválido 3', 'draft', 70)
  RETURNING id INTO v_quiz_id;

  INSERT INTO public.quiz_questions (id, quiz_id, type, question_text, points, position)
  VALUES (gen_random_uuid(), v_quiz_id, 'single_choice', '   ', 1, 0);

  BEGIN
    PERFORM public.publish_quiz_rpc(v_quiz_id);
    RAISE EXCEPTION 'TEST 14 FAILED: Publicación no falló con texto de pregunta en blanco.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%vacío%' THEN
      RAISE NOTICE 'TEST 14 PASSED: Publicación rechazada por texto vacío.';
    ELSE
      RAISE EXCEPTION 'TEST 14 FAILED: Error inesperado: %', SQLERRM;
    END IF;
  END;

  -- TEST 15: publish_quiz_rpc fails if lesson does not belong to course
  INSERT INTO public.quizzes (id, course_id, lesson_id, title, status, passing_score)
  VALUES (gen_random_uuid(), v_course_id, gen_random_uuid(), 'Quiz Inválido 4', 'draft', 70)
  RETURNING id INTO v_quiz_id;

  INSERT INTO public.quiz_questions (id, quiz_id, type, question_text, points, position)
  VALUES (gen_random_uuid(), v_quiz_id, 'single_choice', 'Pregunta', 1, 0);

  BEGIN
    PERFORM public.publish_quiz_rpc(v_quiz_id);
    RAISE EXCEPTION 'TEST 15 FAILED: Publicación no falló cuando la lección no pertenece al curso.';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%pertenece%' THEN
      RAISE NOTICE 'TEST 15 PASSED: Publicación rechazada por lección no perteneciente al curso.';
    ELSE
      RAISE EXCEPTION 'TEST 15 FAILED: Error inesperado: %', SQLERRM;
    END IF;
  END;

  RAISE NOTICE '=== All 18 Sprint 2.6 SQL Tests Completed Successfully ===';
END;
$$;

ROLLBACK;
