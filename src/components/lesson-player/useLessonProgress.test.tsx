// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLessonProgress } from "./useLessonProgress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

let upsertResolverMap: Record<string, (val: { error: unknown }) => void> = {};
let activeUserId = "user-A";

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      rpc: vi.fn((_fn, _params) => {
        return new Promise((resolve) => {
          upsertResolverMap[activeUserId] = resolve;
        });
      }),
      from: vi.fn(() => ({
        upsert: vi.fn((payload: { user_id: string; lesson_id: string; course_id: string }) => {
          return new Promise((resolve) => {
            upsertResolverMap[payload.user_id] = resolve;
          });
        }),
      })),
    },
  };
});

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

describe("useLessonProgress Concurrency & Identity Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    upsertResolverMap = {};
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("Ignores late responses from User A after switching identity to User B", async () => {
    let currentProps = {
      userId: "user-A",
      courseId: "course-1",
      courseSlug: "c1",
      serverProgress: [],
      isServerProgressLoading: false,
      isServerProgressError: false,
    };

    const { result, rerender } = renderHook((props) => useLessonProgress(props), {
      initialProps: currentProps,
    });

    // 1. User A triggers toggleCompletion for lesson-1
    let userAPromise: Promise<boolean>;
    act(() => {
      userAPromise = result.current.toggleCompletion("lesson-1");
    });

    expect(result.current.statuses["lesson-1"]).toBe("completed");

    // 2. Identity switches to User B before User A's network request finishes
    currentProps = {
      userId: "user-B",
      courseId: "course-1",
      courseSlug: "c1",
      serverProgress: [],
      isServerProgressLoading: false,
      isServerProgressError: false,
    };

    act(() => {
      activeUserId = "user-B";
      rerender(currentProps);
    });

    // Initial statuses for User B should reset cleanly
    expect(result.current.statuses["lesson-1"]).toBeUndefined();

    // 3. User B triggers toggleCompletion for lesson-2
    let userBPromise: Promise<boolean>;
    act(() => {
      userBPromise = result.current.toggleCompletion("lesson-2");
    });

    expect(result.current.statuses["lesson-2"]).toBe("completed");

    // Clear toast calls from User B's optimistic action before User A resolves
    vi.clearAllMocks();

    // 4. Late response from User A comes back with an error
    await act(async () => {
      if (upsertResolverMap["user-A"]) {
        upsertResolverMap["user-A"]({ error: { message: "Server error user A" } });
      }
      await userAPromise;
    });

    // 5. Assertions: User A's late error response must NOT alter User B's statuses, toast or localStorage
    expect(result.current.statuses["lesson-2"]).toBe("completed");
    expect(result.current.statuses["lesson-1"]).toBeUndefined();
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();

    // 6. User B's request resolves successfully
    await act(async () => {
      if (upsertResolverMap["user-B"]) {
        upsertResolverMap["user-B"]({ error: null });
      }
      await userBPromise;
    });

    expect(toast.success).toHaveBeenCalledWith("¡Lección marcada como completada!");
  });
});
