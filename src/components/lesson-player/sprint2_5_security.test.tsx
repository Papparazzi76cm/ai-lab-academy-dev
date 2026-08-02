// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLessonPlayer } from "./useLessonPlayer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "courses") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "course-1",
                  title: "Test Course",
                  slug: "test-course",
                  progression_mode: "LINEAR",
                  modules: [
                    {
                      id: "mod-1",
                      title: "Module 1",
                      position: 1,
                      lessons: [
                        {
                          id: "les-1",
                          title: "Lesson 1",
                          slug: "les-1",
                          position: 1,
                          is_free_preview: true,
                          status: "published",
                          course_id: "course-1",
                          module_id: "mod-1",
                        },
                        {
                          id: "les-2",
                          title: "Lesson 2",
                          slug: "les-2",
                          position: 2,
                          is_free_preview: false,
                          status: "published",
                          course_id: "course-1",
                          module_id: "mod-1",
                        },
                      ],
                    },
                  ],
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
    rpc: vi.fn((fnName: string, params: { p_lesson_id?: string }) => {
      if (fnName === "get_accessible_lesson_content_rpc") {
        if (params.p_lesson_id === "les-2") {
          return Promise.resolve({
            data: {
              can_access: false,
              reason: "Debes completar la lección anterior.",
            },
            error: null,
          });
        }
        return Promise.resolve({
          data: {
            can_access: true,
            lesson: {
              id: "les-1",
              title: "Lesson 1",
              slug: "les-1",
              video_url: "https://youtube.com/embed/test",
            },
            blocks: [
              {
                id: "b1",
                lesson_id: "les-1",
                block_type: "text",
                position: 1,
                content: { text: "Hello" },
              },
            ],
            resources: [],
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    }),
  },
}));

describe("Sprint 2.5 Security Patch - Lesson Player Assertions", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("denies protected blocks and video URL when lesson is locked by progression rules", async () => {
    const { result } = renderHook(
      () =>
        useLessonPlayer({
          courseSlug: "test-course",
          moduleSlug: "mod-1",
          lessonSlug: "les-2",
        }),
      { wrapper },
    );

    // Wait for queries to resolve
    await new Promise((r) => setTimeout(r, 100));

    expect(result.current.blocks).toEqual([]);
    expect(
      (result.current.activeLesson as Record<string, unknown> | null)?.["video_url"],
    ).toBeUndefined();
  });

  it("does NOT parse legacy activeLesson.content when blocks table is empty", async () => {
    const { result } = renderHook(
      () =>
        useLessonPlayer({
          courseSlug: "test-course",
          moduleSlug: "mod-1",
          lessonSlug: "les-1",
        }),
      { wrapper },
    );

    await new Promise((r) => setTimeout(r, 100));

    // Must return blocks provided exclusively by get_accessible_lesson_content_rpc
    expect(result.current.blocks).toHaveLength(1);
    expect(result.current.blocks[0]?.id).toBe("b1");
  });
});
