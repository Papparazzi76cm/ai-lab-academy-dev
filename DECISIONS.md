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

## Sprint 2.8 Patch — Authoring Studio Architecture, Atomicity & Security Patch

### Decision 1: RPC-Only Mutation Policy & Elimination of Direct Client Table Writes

- **Context**: Performing direct `DELETE` and `INSERT` queries from client applications on `lesson_blocks` creates partial save risks, network race conditions, and bypasses server validation.
- **Decision**: Enforced an RPC-only mutation policy for all Authoring Studio write operations via `save_lesson_blocks_rpc`.
- **Justification**: Ensures that entire block arrays are validated, normalized, and replaced inside a single atomic PostgreSQL transaction.

### Decision 2: Optimistic Locking with Server-Side Revision Tracking

- **Context**: Concurrent authoring sessions by multiple instructors or browser tabs could overwrite each other's edits.
- **Decision**: Added a `revision` column to `lessons`. `save_lesson_blocks_rpc` locks the lesson row (`FOR UPDATE`) and validates `p_expected_revision = revision`. If a mismatch occurs, it raises an explicit `REVISION_CONFLICT` exception without modifying data.
- **Justification**: Protects authoring data against overwrite race conditions while providing explicit UI conflict resolution feedback.

### Decision 3: Unified Block Engine & Legacy Data Adapter Pattern

- **Context**: Parallel block engines create schema drift, code duplication, and rendering inconsistencies between Authoring Studio and Student Lesson Player.
- **Decision**: Established a single source of truth in `BlockRegistry` and created `adaptRawBlocks()` to seamlessly normalize legacy block types (`h1` -> `heading`, `text` -> `paragraph`, `callout` -> `warning`) and ensure client UUID stability.
- **Justification**: Guarantees backwards compatibility with existing lessons while maintaining strict TypeScript typing and DRY component architecture.

## Sprint 2.9 — AI Authoring Assistant (Phase 1)

### Decision 1: AI as Studio User (No Direct Database Writes)

- **Context**: Allowing AI models to write directly to database tables risks inserting invalid JSON, bypassing optimistic locking revisions, or corrupting lesson state.
- **Decision**: Decoupled the AI assistant from Supabase write operations. The AI generates an in-memory draft of `AuthoringBlock` items. Insertion into Supabase occurs only when the instructor explicitly reviews and accepts the draft through `save_lesson_blocks_rpc`.
- **Justification**: Protects database integrity, preserves optimistic locking revision checks, and keeps human instructors in full control of published content.

### Decision 2: Pipeline Pattern & Multi-Provider Abstraction

- **Context**: Tightly coupling AI logic to a single provider (e.g. Gemini) limits flexibility and complicates testing.
- **Decision**: Implemented an explicit pipeline (`Prompt` -> `Planner` -> `Outline` -> `Block Generator` -> `Validation` -> `AutoRepair` -> `Result`) driven by an `AIProvider` interface supporting Gemini, OpenAI, and Anthropic Claude.
- **Justification**: Enables provider hot-swapping, mock provider testing, cost/token tracking, and structured error recovery at each isolated pipeline step.

### Decision 3: Defensive Auto-Repair (`autoRepairBlocks`)

- **Context**: AI models occasionally output slightly malformed block structures (e.g. missing ALT attribute on images, empty heading text, unregistered legacy types).
- **Decision**: Built an auto-repair validator (`autoRepairBlocks`) that automatically fixes minor structural defects against `BlockRegistry` Zod schemas, logs repair entries for telemetry, and ensures 100% schema compliance before block preview or insertion.
- **Justification**: Guarantees that AI-generated blocks never crash the editor or lesson player, providing a reliable and friction-free user experience.

