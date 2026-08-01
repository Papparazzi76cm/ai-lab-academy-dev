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
