# Master Specification (MASTER_SPEC.md)

## AI Lab Academy Platform Architecture

### Overview

AI Lab Academy is a high-performance learning platform built with React, TypeScript, TanStack Query & Router, Tailwind CSS, and Supabase.

---

## Core Modules & Features

### 1. Authentication & Role-Based Access Control (RBAC)

- Supabase Auth + `public.user_roles` (`admin`, `instructor`, `student`).
- Security Definer helper functions: `private.has_role()`, `private.is_course_instructor()`.

### 2. Course & Curriculum Management

- Courses, Modules, Lessons, Resources, and Lesson Progress.
- RLS Policies enforcing active enrollments (`e.status = 'active'::enrollment_status`) for private course resources and lesson blocks.

### 3. Visual Lesson Editor (Sprint 2.3 — Block Editor)

- **Architecture**: Granular block-based editor (`public.lesson_blocks`).
- **Storage**: JSON schema (`content_json`, `settings_json`) — no HTML/Markdown storage.
- **Block Categories & Supported Types**:
  - **Texto**: H1 (`h1`), H2 (`h2`), H3 (`h3`), Párrafo (`paragraph`), Lista con viñetas (`bullet_list`), Lista numerada (`numbered_list`), Cita (`quote`), Separador (`divider`).
  - **Multimedia**: Imagen (`image`), YouTube (`youtube`), Vimeo (`vimeo`), Archivo de vídeo (`video_file`), Audio (`audio`), Galería (`gallery`).
  - **Código**: Bloque de código (`code`) con selección de lenguaje, numeración de líneas y botón de copia.
  - **Recursos**: Botón de descarga (`download_button`), Enlace externo (`external_link`), PDF incrustado (`pdf_embed`).
  - **Educación**: Objetivos (`objectives`), Resumen (`summary`), Consejo (`tip`), Advertencia (`warning`), Ejercicio (`exercise`), Reto (`challenge`), Pregunta abierta (`open_question`).
- **Features**: Drag & drop reordering, hover insertion divider, duplicate/delete/collapse actions, block settings modal, live preview tab, debounced autosaver, atomic reordering RPC.

### 4. Interactive Quizzes & Evaluation System (Sprint 2.6)

- **Data Model**:
  - `quizzes`: Title, description, passing score, time limit, attempt limits, shuffling toggles, review policies, course/module/lesson associations.
  - `quiz_questions`: Single choice (`single_choice`), Multiple choice (`multiple_choice`), True/False (`true_false`), points, position, explanation.
  - `quiz_answers`: Answer choices with server-side `is_correct` flags.
  - `quiz_attempts`: Active user attempt sessions with attempt number, status (`in_progress`, `submitted`, `expired`), time tracking, score percentage, pass/fail status.
  - `quiz_attempt_answers`: Student answer selections recorded per attempt.
- **Server-Side Evaluation & Security**:
  - **Server-Side Truth**: RLS policies strictly hide `is_correct` flags from students.
  - **Sanitized RPCs**: `start_quiz_attempt_rpc` generates attempts and sanitizes questions for the client browser.
  - **Transactional Grading**: `submit_quiz_attempt_rpc` grades answers server-side in a single transaction, calculates scores, updates attempt records, and integrates with lesson completion progress.
- **Student Quiz Player & Admin CMS**:
  - **Quiz Player**: Server-synced countdown timer, accessible option selection, auto-saving answer selections, submit dialog, and post-submission results breakdown.
  - **Admin CMS**: Quiz List (`/admin/quizzes`), Quiz Editor (`/admin/quizzes/$quizId`), Question Manager with drag-and-drop reordering, test-drive simulation preview, and Results Dashboard (`/admin/quizzes/$quizId/results`).
