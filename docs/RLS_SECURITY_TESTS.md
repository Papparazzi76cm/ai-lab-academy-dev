# RLS & Security Policy Documentation & Testing

This document details the Row Level Security (RLS) policies, PostgreSQL triggers, and RPC security functions applied to AI Lab Academy's Academic CMS.

---

## 1. Role Hierarchy & Access Matrix

- **`anon` (Unauthenticated)**:
  - Can read published courses, categories, instructors, modules, and lessons.
  - Can ONLY read resources with `is_public = true` belonging to published, free-preview lessons (`is_free_preview = true`).
  - Cannot access any `/admin/*` routes or perform CUD operations.

- **`student` (Authenticated User)**:
  - Can read published course catalog.
  - Can read resources of courses where they have an active enrollment (`public.enrollments` with `status = 'active'::enrollment_status`), plus public resources of free lessons.
  - Cannot access `/admin/*` routes.
  - Blocked by RLS policies from creating/editing courses, modules, lessons, resources, categories, or instructors.

- **`instructor` (Teacher/Profesor)**:
  - Can access `/admin/` (Dashboard) and `/admin/courses` (CMS Course Editor).
  - Can ONLY view and manage courses assigned to their instructor record (`instructor_id = private.get_instructor_id_for_user(auth.uid())`).
  - Automatically linked to newly created courses via database trigger `trg_course_instructor_assignment`.
  - Can read and manage resources (`public.resources`) of their owned courses.
  - Stats (`get_cms_stats`) and activity logs (`get_cms_recent_changes`) are strictly scoped to their owned courses, modules, and lessons.
  - Blocked from `/admin/categories` and `/admin/instructors` routes via explicit route guards (`RequireRole roles={["admin"]}`) and RLS policies.
  - Prevented from modifying instructor roles or active status via database trigger `trg_prevent_instructor_escalation`.

- **`admin` (Administrator)**:
  - Has full system access across all CMS management routes (`/admin/categories`, `/admin/instructors`, `/admin/courses`, etc.).
  - Global statistics and recent activity logs.
  - Can duplicate courses, reorder items, and manage all entities atomically.

---

## 2. Resource RLS Security Rules (`public.resources`)

1. **`is_public` Flag**:
   - `is_public BOOLEAN NOT NULL DEFAULT false` column added to `public.resources`.
2. **Anon Policy**:
   - `SELECT` allowed ONLY IF `is_public = true` AND lesson is published (`status = 'published'`) and free preview (`is_free_preview = true`) in a published course.
3. **Student Policy**:
   - `SELECT` allowed IF active enrollment in the course (`e.status = 'active'::enrollment_status`) OR resource is public free preview (`is_public = true` in published free lesson). Cancelled enrollments (`status = 'cancelled'`) do NOT grant access to private resources.
4. **Instructor Policy**:
   - `SELECT`, `INSERT`, `UPDATE`, `DELETE` allowed ONLY for courses owned by the instructor (`private.is_course_instructor(...)`).
5. **Admin Policy**:
   - Full read/write access to all resources.

---

## 3. Core RPCs & Security Functions

1. **`private.has_role(p_user_id, p_role)`**:
   Returns true if `p_user_id` possesses `p_role` in `public.user_roles`.

2. **`private.get_instructor_id_for_user(p_user_id)`**:
   Returns the `instructors.id` linked to the user's `auth.uid()`.

3. **`get_cms_stats()`**:
   Executes server-side and returns role-filtered statistics (`courses`, `published`, `drafts`, `archived`, `categories`, `instructors`, `modules`, `lessons`).

4. **`get_cms_recent_changes()`**:
   Returns the top 10 recent course/module/lesson updates filtered by ownership for instructors and globally for admins.

5. **`duplicate_course_rpc(p_course_id)`**:
   Clones a course and its nested modules, lessons, and resources atomically within a PostgreSQL transaction in draft status. Enforces instructor ownership check.

6. **`reorder_items_rpc(p_table, p_items)`**:
   Updates the `position` of a batch of modules or lessons within a single atomic PostgreSQL transaction.

---

## 4. Database Triggers

1. **`trg_course_instructor_assignment`**:
   Before inserting a course, if the caller is an instructor without an explicit `instructor_id`, automatically assigns their instructor ID.

2. **`trg_prevent_instructor_escalation`**:
   Prevents non-admin users from altering `user_id` or `is_active` fields on the `instructors` table.

---

## 5. Executable SQL Test Suite

The automated, executable SQL test suite is located at:
`supabase/tests/rls_security_tests.sql`

To execute the test suite in psql or Supabase SQL Editor:

```sql
\i supabase/tests/rls_security_tests.sql
```

The script runs inside a transaction block (`BEGIN ... ROLLBACK`) and tests all 6 core scenarios:

1. **Anon**: Verifies access to public free preview resources only.
2. **Student (not enrolled)**: Verifies denial of paid/private course resources.
3. **Student (active enrollment)**: Verifies full access to resources of enrolled course with `status = 'active'::enrollment_status`.
4. **Student (cancelled enrollment)**: Verifies restriction to public free preview resources when `status = 'cancelled'::enrollment_status`.
5. **Instructor (owner)**: Verifies read/update access to resources of owned courses.
6. **Instructor (non-owner)**: Verifies access denial to resources of other instructors' courses.
7. **Admin**: Verifies global read/update access across all resources.
