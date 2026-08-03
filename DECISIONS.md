# Technical Decisions Log (DECISIONS.md)

## Sprint 2.3 — Editor Visual de Lecciones (Block Editor)

### Decision 1: Direct JSON Block Architecture vs. HTML/Markdown Blob

- **Context**: Previous lesson content used a single text field (`content_text` / `content`).
- **Decision**: Adopt a Notion/Gutenberg-style block model where each block is a row in `public.lesson_blocks` with structured `content_json` and `settings_json`.
- **Justification**: Storing structured block JSON prevents HTML sanitization vulnerabilities, enables granular block manipulation (drag & drop reordering, cloning, collapsing), and allows seamless cross-platform rendering (web, mobile, exports).

### Decision 2: Atomic Reordering via Dedicated RPC Function (`reorder_lesson_blocks_rpc`)

- **Context**: Reordering blocks sequentially with client-side loop updates creates multiple network requests and potential race conditions.
- **Decision**: Implemented `reorder_lesson_blocks_rpc(p_lesson_id, p_blocks)` executed in a single PostgreSQL transaction with strict RLS enforcement (`SECURITY DEFINER` with course ownership check).
- **Justification**: Guarantees consistency, zero partial updates, and optimal network performance.

### Decision 3: Debounced Autosave with Optimistic UI & Undo/Redo State Engine

- **Context**: Frequent user typing in text, code, or list blocks would overwhelm database IO if synced on every keypress.
- **Decision**: Integrated 1-second debounced autosave state tracker (`idle` | `saving` | `saved` | `error`) with a history stack for undo/redo actions.
- **Justification**: Provides smooth local editing experience with visual feedback ("Guardando...", "Guardado") and protects against network latency.

## Sprint 2.4 — Reproductor de Lecciones (Lesson Player Robustness)

### Decision 1: Postponement of DOM Virtualization for Lesson Blocks

- **Context**: Lesson blocks contain rich content with highly dynamic vertical heights (embedded video player, code snippets with copy controls, expandable callouts, resource downloads, markdown text).
- **Decision**: Deferred DOM virtualization (e.g. `@tanstack/react-virtual`) for student lesson block lists until real-world telemetry and performance benchmarks prove its necessity.
- **Justification**: Virtualizing dynamic-height DOM elements causes layout shift, breaks native browser text search (`Ctrl+F`), interferes with screen reader accessibility, and impairs smooth scrolling. Standard DOM rendering comfortably handles typical lesson length (10–50 blocks) with negligible memory footprint.

### Decision 2: Strict Hierarchical Route Resolution

- **Context**: Querying a lesson directly by `lessonSlug` across all course modules using `find()` creates ambiguity if two modules contain lessons with identical slugs or if a lesson is accessed under a different module route.
- **Decision**: Enforced strict route resolution in `useLessonPlayer`: `CourseBySlug -> ModuleInCourseBySlug -> LessonInModuleBySlug`. If any link in the hierarchy fails, the player returns an explicit 404 state (`LessonNotFound`).
- **Justification**: Guarantees deterministic routing, prevents cross-module ambiguity, and secures navigation integrity.

### Decision 3: Video Embed Security & Domain Filtering

- **Context**: Rendering raw user-provided `video_url` strings directly in `<iframe>` elements introduces security risks (XSS, clickjacking, dangerous protocols).
- **Decision**: Routed all video URLs through `getSafeVideoEmbedUrl()` in `src/lib/url-security.ts`, normalizing YouTube (`youtube-nocookie.com`) and Vimeo (`player.vimeo.com`), and validating hostnames against explicit domain allowlists before setting iframe source attributes with `loading="lazy"` and `referrerPolicy="strict-origin-when-cross-origin"`.
- **Justification**: Prevents unauthorized domain embeds and protects user privacy.

## Sprint 2.6 — Quizzes Interactivos y Evaluación

### Decision 1: Strict Server-Side Truth & Client Obfuscation (`is_correct`)

- **Context**: Including `is_correct` flags or correct answer keys in client-side state enables students to inspect network payloads or DOM attributes to cheat on evaluations.
- **Decision**: Implemented strict RLS on `public.quiz_answers` allowing read access to `is_correct` strictly for course instructors and admins (`private.is_course_instructor()`). Created `start_quiz_attempt_rpc` which strips out `is_correct` flags before returning question JSON to the browser.
- **Justification**: Eliminates answer leak vulnerabilities, guaranteeing that evaluation integrity is strictly maintained by the database server.

## Sprint 2.7 — Certificados, Credenciales y Verificación Pública

### Decision 1: Immutable Snapshot Pattern for Certificate Credentials

- **Context**: Student names or course titles can change in the future (e.g. course rebranding, profile updates).
- **Decision**: Stored `student_name_snapshot`, `course_title_snapshot`, and `instructor_name_snapshot` directly in the `public.certificates` table at the moment of issuance.
- **Justification**: Guarantees historical credential integrity. A certificate issued in 2026 remains accurate to the student's legal name and course title at that exact moment, preventing retroactive modification.

### Decision 2: Learning Engine Authority & Server-Enforced Progress (100%)

- **Context**: Client applications could attempt to invoke certificate issuance endpoints prematurely.
- **Decision**: Enforced that `public.issue_course_certificate_rpc` checks `course_progress.percentage = 100` directly on the PostgreSQL server inside a transactional lock before issuing any certificate.
- **Justification**: Ensures frontend code cannot override completion requirements or bypass mandatory quiz evaluations.

### Decision 3: Public Verification Privacy Firewall

- **Context**: Verification endpoints must allow external third parties (employers, recruiters) to verify credentials without authenticating, but must protect student privacy.
- **Decision**: Created `public.verify_certificate_rpc` returning ONLY non-sensitive public metadata (`found`, `status`, `certificate_number`, `student_name`, `course_title`, `issued_at`, `completed_at`, `issuer`, `revocation_reason_public`).
- **Justification**: Protects student personal data (no email, UUIDs, quiz scores, or internal storage paths exposed) while fulfilling verification needs.

### Decision 4: Server-Side PDF Generation via Supabase Edge Function & Private Storage Bucket

- **Context**: Generating PDFs in client browsers allows canvas manipulation, exposes secret templates, and risks client-side tampering, while public bucket storage exposes official certificates to scraping.
- **Decision**: Transferred official PDF generation exclusively to a Supabase Edge Function (`supabase/functions/generate-certificate-pdf/index.ts`). The function validates the user's JWT, verifies certificate ownership or admin privilege, rejects revoked/replaced certificates, generates the PDF and QR code entirely server-side, stores the PDF in a private Supabase Storage bucket (`certificates`), logs audit events via `private.record_certificate_event`, and returns temporary signed URLs (3600s).
- **Justification**: Eliminates all client-side PDF generation vulnerabilities, enforces strict server authority over credential files, secures storage behind RLS policies, and guarantees audit trail integrity.

### Decision 5: Automatic Server-Side Certificate Issuance via Learning Engine

- **Context**: Relying on optional client requests to issue certificates after completing a course can lead to missing credentials or manual bypass attempts.
- **Decision**: Integrated `private.issue_certificate_for_user` directly into the Learning Engine server progress sync (`sync_quiz_completion_progress` and `update_lesson_progress_rpc`). When a student reaches 100% course completion and passes all mandatory quizzes, the database server automatically triggers certificate issuance inside an advisory transactional lock (`pg_advisory_xact_lock`).
- **Justification**: Guarantees immediate, reliable credential issuance as a direct consequence of learning completion without requiring explicit client invocation.

### Decision 2: Transactional Server-Side Grading via RPC (`submit_quiz_attempt_rpc`)

- **Context**: Grading quizzes client-side allows tampering with final scores, while multi-query server grading creates race conditions or partial updates.
- **Decision**: Built `submit_quiz_attempt_rpc` as a transactional SQL function that evaluates student answers, calculates score percentages against quiz passing rules, updates the attempt record status to `submitted`, and triggers lesson/course progress synchronization in a single ACID transaction.
- **Justification**: Ensures atomic evaluation, consistent score calculation (exact matches for multiple choice), and instant progress updates without race conditions.

### Decision 3: Server-Synced Attempt Expiration & Real-Time Auto-Save Strategy

- **Context**: Long-running quiz attempts with timer limits can drift across client devices or be lost if the user closes their browser before submitting.
- **Decision**: Stored `expires_at` timestamps on `public.quiz_attempts` calculated server-side upon attempt creation (`start_quiz_attempt_rpc`). Created `save_quiz_answer_rpc` to auto-save selected options continuously during the quiz. Enforced auto-submission upon expiration both in the UI timer and during server grading.
- **Justification**: Prevents timer manipulation by altering client clock time and guarantees zero data loss if a browser tab is accidentally reloaded or closed.
