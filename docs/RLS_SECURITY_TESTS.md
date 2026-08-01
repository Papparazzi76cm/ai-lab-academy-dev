# RLS & Security Policy Documentation & Testing

This document details the Row Level Security (RLS) policies, PostgreSQL triggers, and RPC security functions applied to NeuraLab's Academic CMS.

---

## 1. Role Hierarchy

- **`anon` (Unauthenticated)**:
  - Can read published courses, categories, instructors, modules, lessons, and resources.
  - Cannot access any `/admin/*` routes or perform CUD operations.

- **`student` (Authenticated User)**:
  - Can read published course catalog and enrolled lesson content.
  - Cannot access `/admin/*` routes.
  - Blocked by RLS policies from creating/editing courses, modules, lessons, resources, categories, or instructors.

- **`instructor` (Teacher/Profesor)**:
  - Can access `/admin/` (Dashboard) and `/admin/courses` (CMS Course Editor).
  - Can ONLY view and manage courses assigned to their instructor record (`instructor_id = private.get_instructor_id_for_user(auth.uid())`).
  - Automatically linked to newly created courses via database trigger `trg_course_instructor_assignment`.
  - Stats (`get_cms_stats`) and activity logs (`get_cms_recent_changes`) are strictly scoped to their owned courses, modules, and lessons.
  - Blocked from `/admin/categories` and `/admin/instructors` routes via explicit route guards (`RequireRole roles={["admin"]}`) and RLS policies.
  - Prevented from modifying instructor roles or active status via database trigger `trg_prevent_instructor_escalation`.

- **`admin` (Administrator)**:
  - Has full system access across all CMS management routes (`/admin/categories`, `/admin/instructors`, `/admin/courses`, etc.).
  - Global statistics and recent activity logs.
  - Can duplicate courses, reorder items, and update all entities atomically.

---

## 2. Core RPCs & Security Functions

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

## 3. Database Triggers

1. **`trg_course_instructor_assignment`**:
   Before inserting a course, if the caller is an instructor without an explicit `instructor_id`, automatically assigns their instructor ID.

2. **`trg_prevent_instructor_escalation`**:
   Prevents non-admin users from altering `user_id` or `is_active` fields on the `instructors` table.

---

## 4. Verification & Testing Matrix

| Test Case | Role | Target Resource | Action | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | `instructor` | `/admin/categories` | Navigate | Redirected / Access Denied by `RequireRole` guard |
| **TC-02** | `instructor` | `/admin/instructors` | Navigate | Redirected / Access Denied by `RequireRole` guard |
| **TC-03** | `instructor` | Other Instructor's Course | SELECT / UPDATE | Returns 0 rows / Permission Denied by RLS & `adminCourseQuery` |
| **TC-04** | `instructor` | `get_cms_stats()` | RPC Call | Returns count of own courses/modules/lessons only |
| **TC-05** | `instructor` | `duplicate_course_rpc()` | RPC Call | Successfully clones own course; fails on other's course |
| **TC-06** | `admin` | `/admin/categories` | CUD | Full CRUD permissions granted |
| **TC-07** | `admin` | `get_cms_stats()` | RPC Call | Returns global counts across entire platform |
