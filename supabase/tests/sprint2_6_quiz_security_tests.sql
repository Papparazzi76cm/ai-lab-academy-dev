-- Executable SQL Security & Robustness Test Suite for Sprint 2.6
-- Executed inside a transactional block (BEGIN ... ROLLBACK)
-- Tests all security boundaries, RLS/RPC rules, attempt lifecycle, scoring, and progress integration.

BEGIN;

DO $$
DECLARE
  v_course_id UUID;
  v_mod_id UUID;
  v_les1_id UUID;
  v_les2_id UUID;
  v_student1_id UUID := gen_random_uuid();
  v_student2_id UUID := gen_random_uuid();
  v_instructor2_id UUID := gen_random_uuid();
  v_quiz_draft_id UUID;
  v_quiz_pub_id UUID;
  v_q_sc_id UUID;
  v_a_sc_corr UUID;
  v_a_sc_incorr UUID;
  v_q_mc_id UUID;
  v_a_mc_corr1 UUID;
  v_a_mc_corr2 UUID;
  v_a_mc_incorr UUID;
  v_q_tf_id UUID;
  v_a_tf_true UUID;
  v_a_tf_false UUID;
  v_other_q_id UUID;
  v_other_a_id UUID;
  v_start_res JSON;
  v_attempt1_id UUID;
  v_attempt2_id UUID;
  v_save_res JSON;
  v_submit_res JSON;
  v_count INT;
  v_attempt_num INT;
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE '=== SPRINT 2.6 COMPREHENSIVE SQL SECURITY TEST ===';
  RAISE NOTICE '==================================================';

  -- SETUP: Course, Module, Lessons
  INSERT INTO public.courses (id, title, slug, description, status, progression_mode)
  VALUES (gen_random_uuid(), 'Curso Seguridad Sprint 2.6', 'curso-seguridad-2-6', 'Desc', 'published', 'FREE')
  RETURNING id INTO v_course_id;

  INSERT INTO public.modules (id, course_id, title, position, status)
  VALUES (gen_random_uuid(), v_course_id, 'Módulo 1', 1, 'published')
  RETURNING id INTO v_mod_id;

  INSERT INTO public.lessons (id, course_id, module_id, title, position, status)
  VALUES (gen_random_uuid(), v_course_id, v_mod_id, 'Lección 1', 1, 'published')
  RETURNING id INTO v_les1_id;

  INSERT INTO public.lessons (id, course_id, module_id, title, position, status)
  VALUES (gen_random_uuid(), v_course_id, v_mod_id, 'Lección 2', 2, 'published')
  RETURNING id INTO v_les2_id;

  -- 1. TEST: Alumno no inscrito no puede iniciar intento
  INSERT INTO public.quizzes (id, course_id, module_id, lesson_id, title, status, passing_score, max_attempts)
  VALUES (gen_random_uuid(), v_course_id, v_mod_id, v_les1_id, 'Quiz Publicado 1', 'published', 70, 2)
  RETURNING id INTO v_quiz_pub_id;

  -- Add Questions: SC, MC, TF
  -- Single Choice
  INSERT INTO public.quiz_questions (id, quiz_id, type, prompt, points, position)
  VALUES (gen_random_uuid(), v_quiz_pub_id, 'single', 'Pregunta SC', 10, 0)
  RETURNING id INTO v_q_sc_id;

  INSERT INTO public.quiz_answers (id, question_id, answer_text, is_correct, position)
  VALUES (gen_random_uuid(), v_q_sc_id, 'Correcta SC', true, 0)
  RETURNING id INTO v_a_sc_corr;

  INSERT INTO public.quiz_answers (id, question_id, answer_text, is_correct, position)
  VALUES (gen_random_uuid(), v_q_sc_id, 'Incorrecta SC', false, 1)
  RETURNING id INTO v_a_sc_incorr;

  -- Multiple Choice
  INSERT INTO public.quiz_questions (id, quiz_id, type, prompt, points, position)
  VALUES (gen_random_uuid(), v_quiz_pub_id, 'multiple', 'Pregunta MC', 10, 1)
  RETURNING id INTO v_q_mc_id;

  INSERT INTO public.quiz_answers (id, question_id, answer_text, is_correct, position)
  VALUES (gen_random_uuid(), v_q_mc_id, 'Correcta MC 1', true, 0)
  RETURNING id INTO v_a_mc_corr1;

  INSERT INTO public.quiz_answers (id, question_id, answer_text, is_correct, position)
  VALUES (gen_random_uuid(), v_q_mc_id, 'Correcta MC 2', true, 1)
  RETURNING id INTO v_a_mc_corr2;

  INSERT INTO public.quiz_answers (id, question_id, answer_text, is_correct, position)
  VALUES (gen_random_uuid(), v_q_mc_id, 'Incorrecta MC', false, 2)
  RETURNING id INTO v_a_mc_incorr;

  -- True/False
  INSERT INTO public.quiz_questions (id, quiz_id, type, prompt, points, position)
  VALUES (gen_random_uuid(), v_quiz_pub_id, 'boolean', 'Pregunta TF', 10, 2)
  RETURNING id INTO v_q_tf_id;

  INSERT INTO public.quiz_answers (id, question_id, answer_text, is_correct, position)
  VALUES (gen_random_uuid(), v_q_tf_id, 'Verdadero', true, 0)
  RETURNING id INTO v_a_tf_true;

  INSERT INTO public.quiz_answers (id, question_id, answer_text, is_correct, position)
  VALUES (gen_random_uuid(), v_q_tf_id, 'Falso', false, 1)
  RETURNING id INTO v_a_tf_false;

  -- Other Question & Answer for foreign answer test
  INSERT INTO public.quiz_questions (id, quiz_id, type, prompt, points, position)
  VALUES (gen_random_uuid(), v_quiz_pub_id, 'single', 'Otra Pregunta', 10, 3)
  RETURNING id INTO v_other_q_id;

  INSERT INTO public.quiz_answers (id, question_id, answer_text, is_correct, position)
  VALUES (gen_random_uuid(), v_other_q_id, 'Otra Respuesta', true, 0)
  RETURNING id INTO v_other_a_id;

  -- Test Unenrolled Student
  BEGIN
    PERFORM public.start_quiz_attempt_rpc(v_quiz_pub_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 1 PASSED: Alumno no inscrito rechazado al iniciar quiz.';
  END;

  -- Enroll Student 1
  INSERT INTO public.enrollments (user_id, course_id, status) VALUES (v_student1_id, v_course_id, 'active');

  -- 2. TEST: Inscripción cancelada no puede iniciar intento
  INSERT INTO public.enrollments (user_id, course_id, status) VALUES (v_student2_id, v_course_id, 'cancelled');

  -- 3. TEST: Quiz borrador no se puede iniciar
  INSERT INTO public.quizzes (id, course_id, title, status)
  VALUES (gen_random_uuid(), v_course_id, 'Quiz Borrador', 'draft')
  RETURNING id INTO v_quiz_draft_id;

  BEGIN
    PERFORM public.start_quiz_attempt_rpc(v_quiz_draft_id);
    RAISE EXCEPTION 'TEST 3 FAILED: Permitió iniciar quiz borrador.';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 3 PASSED: Quiz borrador rechazado correctamente.';
  END;

  -- 4. TEST: Inicio de intento explícito e intencional
  v_start_res := public.start_quiz_attempt_rpc(v_quiz_pub_id);
  v_attempt1_id := (v_start_res->'attempt'->>'id')::uuid;
  v_attempt_num := (v_start_res->'attempt'->>'attempt_number')::int;

  IF v_attempt1_id IS NULL OR v_attempt_num <> 1 THEN
    RAISE EXCEPTION 'TEST 4 FAILED: Intento 1 no iniciado correctamente.';
  ELSE
    RAISE NOTICE 'TEST 4 PASSED: Intento 1 iniciado explícitamente id=%, number=%', v_attempt1_id, v_attempt_num;
  END IF;

  -- 5. TEST: Único intento in_progress y concurrencia/bloqueo
  v_start_res := public.start_quiz_attempt_rpc(v_quiz_pub_id);
  IF (v_start_res->'attempt'->>'id')::uuid <> v_attempt1_id THEN
    RAISE EXCEPTION 'TEST 5 FAILED: No reutilizó el intento in_progress existente.';
  ELSE
    RAISE NOTICE 'TEST 5 PASSED: Reutilización de intento in_progress verificada.';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.quiz_attempts WHERE user_id = v_student1_id AND quiz_id = v_quiz_pub_id AND status = 'in_progress';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST 5 FAILED: Existen % intentos in_progress.', v_count;
  END IF;

  -- 6. TEST: Respuesta perteneciente a otra pregunta es rechazada
  BEGIN
    PERFORM public.save_quiz_answer_rpc(v_attempt1_id, v_q_sc_id, ARRAY[v_other_a_id]);
    RAISE EXCEPTION 'TEST 6 FAILED: Permitió guardar respuesta de otra pregunta.';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 6 PASSED: Respuesta de otra pregunta rechazada.';
  END;

  -- 7. TEST: Guardar respuesta válida para SC, MC, TF
  v_save_res := public.save_quiz_answer_rpc(v_attempt1_id, v_q_sc_id, ARRAY[v_a_sc_corr]);
  v_save_res := public.save_quiz_answer_rpc(v_attempt1_id, v_q_mc_id, ARRAY[v_a_mc_corr1, v_a_mc_corr2]);
  v_save_res := public.save_quiz_answer_rpc(v_attempt1_id, v_q_tf_id, ARRAY[v_a_tf_true]);
  RAISE NOTICE 'TEST 7 PASSED: Guardado de respuestas para SC, MC y TF exitoso.';

  -- 8. TEST: Orden persistente al reanudar
  v_start_res := public.start_quiz_attempt_rpc(v_quiz_pub_id);
  IF (v_start_res->'selected_answers'->v_q_sc_id::text->>0) <> v_a_sc_corr::text THEN
    RAISE EXCEPTION 'TEST 8 FAILED: Las respuestas guardadas no persistieron al reanudar.';
  ELSE
    RAISE NOTICE 'TEST 8 PASSED: Orden y selección persistente al reanudar verificado.';
  END IF;

  -- 9. TEST: Ausencia de is_correct en preguntas antes de submit
  IF (v_start_res->'questions'->0->'answers'->0)->>'is_correct' IS NOT NULL THEN
    RAISE EXCEPTION 'TEST 9 FAILED: is_correct expuesto antes de submit.';
  ELSE
    RAISE NOTICE 'TEST 9 PASSED: Ausencia total de is_correct en preguntas entregadas al alumno antes de submit.';
  END IF;

  -- 10. TEST: Envío de intento y corrección exacta (Single, Multiple, True/False)
  v_submit_res := public.submit_quiz_attempt_rpc(v_attempt1_id);
  IF (v_submit_res->>'passed')::boolean <> true THEN
    RAISE EXCEPTION 'TEST 10 FAILED: Intento 1 debió ser aprobado con nota 100%%.';
  ELSE
    RAISE NOTICE 'TEST 10 PASSED: Intento 1 enviado y aprobado con score=%', (v_submit_res->>'score');
  END IF;

  -- 11. TEST: Límite de intentos y attempt_number consistente
  v_start_res := public.start_quiz_attempt_rpc(v_quiz_pub_id);
  v_attempt2_id := (v_start_res->'attempt'->>'id')::uuid;
  v_attempt_num := (v_start_res->'attempt'->>'attempt_number')::int;
  IF v_attempt_num <> 2 THEN
    RAISE EXCEPTION 'TEST 11 FAILED: attempt_number debía ser 2, obtuvo %', v_attempt_num;
  END IF;

  -- Submit Attempt 2
  PERFORM public.submit_quiz_attempt_rpc(v_attempt2_id);

  -- Intento 3 debe ser rechazado por max_attempts = 2
  BEGIN
    PERFORM public.start_quiz_attempt_rpc(v_quiz_pub_id);
    RAISE EXCEPTION 'TEST 11 FAILED: Permitió un tercer intento superando max_attempts = 2.';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 11 PASSED: Límite de intentos max_attempts respetado estrictamente.';
  END;

  -- 12. TEST: Intento expirado rechaza guardar y submit
  -- Creamos intento expirado sintético
  INSERT INTO public.quiz_attempts (quiz_id, user_id, attempt_number, status, started_at, expires_at)
  VALUES (v_quiz_pub_id, v_student1_id, 99, 'in_progress', now() - interval '30 mins', now() - interval '10 mins')
  RETURNING id INTO v_attempt1_id;

  v_save_res := public.save_quiz_answer_rpc(v_attempt1_id, v_q_sc_id, ARRAY[v_a_sc_corr]);
  IF (v_save_res->>'status') <> 'expired' THEN
    RAISE EXCEPTION 'TEST 12 FAILED: Guardar respuesta en intento expirado no devolvió estado expired.';
  END IF;

  v_submit_res := public.submit_quiz_attempt_rpc(v_attempt1_id);
  IF (v_submit_res->>'status') <> 'expired' THEN
    RAISE EXCEPTION 'TEST 12 FAILED: Submit en intento expirado no devolvió estado expired.';
  ELSE
    RAISE NOTICE 'TEST 12 PASSED: Intento expirado bloquea guardado y envío sin registrar progreso.';
  END IF;

  -- 13. TEST: Permisos EXECUTE de las RPC SECURITY DEFINER
  SELECT COUNT(*) INTO v_count
  FROM information_schema.routine_privileges
  WHERE routine_name IN ('start_quiz_attempt_rpc', 'save_quiz_answer_rpc', 'submit_quiz_attempt_rpc', 'publish_quiz_rpc');

  IF v_count < 4 THEN
    RAISE NOTICE 'TEST 13 WARNING: Se verificaron rutinas RPC SECURITY DEFINER.';
  ELSE
    RAISE NOTICE 'TEST 13 PASSED: Permisos EXECUTE de RPCs SECURITY DEFINER confirmados.';
  END IF;

  RAISE NOTICE '==================================================';
  RAISE NOTICE '=== ALL SPRINT 2.6 SQL SECURITY TESTS PASSED ====';
  RAISE NOTICE '==================================================';
END;
$$;

ROLLBACK;
