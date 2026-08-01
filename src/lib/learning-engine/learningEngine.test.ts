import { describe, expect, it } from "vitest";
import { calculateProgress, getLessonStatus } from "./progress";
import { MinimalCourseCurriculum } from "./types";

import { ActiveTimeTracker } from "./timeTracking";
import { canAccessLesson, getLessonAccessMap, normalizeProgressionMode } from "./unlock";

describe("Learning Engine — Progress Calculations", () => {
  it("correctly calculates progress percentages", () => {
    expect(calculateProgress(0, 10)).toBe(0);
    expect(calculateProgress(5, 10)).toBe(50);
    expect(calculateProgress(10, 10)).toBe(100);
    expect(calculateProgress(1, 3)).toBe(33.33);
    expect(calculateProgress(0, 0)).toBe(0);
  });

  it("determines lesson status correctly based on completion & time", () => {
    expect(getLessonStatus(true, 0)).toBe("completed");
    expect(getLessonStatus(true, 120)).toBe("completed");
    expect(getLessonStatus(false, 0)).toBe("not_started");
    expect(getLessonStatus(false, 15)).toBe("in_progress");
  });
});

describe("Learning Engine — Unlock Rules", () => {
  const sampleCourse: MinimalCourseCurriculum = {
    id: "course-1",
    title: "Curso de Prueba",
    progressionMode: "FREE",
    modules: [
      {
        id: "mod-1",
        title: "Módulo 1",
        slug: "modulo-1",
        position: 1,
        lessons: [
          {
            id: "les-1",
            title: "Lección 1.1",
            slug: "leccion-1-1",
            position: 1,
            moduleId: "mod-1",
            isFreePreview: true,
          },
          {
            id: "les-2",
            title: "Lección 1.2",
            slug: "leccion-1-2",
            position: 2,
            moduleId: "mod-1",
            isFreePreview: false,
          },
        ],
      },
      {
        id: "mod-2",
        title: "Módulo 2",
        slug: "modulo-2",
        position: 2,
        lessons: [
          {
            id: "les-3",
            title: "Lección 2.1",
            slug: "leccion-2-1",
            position: 1,
            moduleId: "mod-2",
          },
          {
            id: "les-4",
            title: "Lección 2.2",
            slug: "leccion-2-2",
            position: 2,
            moduleId: "mod-2",
          },
        ],
      },
    ],
  };

  it("normalizeProgressionMode normalizes string modes correctly", () => {
    expect(normalizeProgressionMode("linear")).toBe("LINEAR");
    expect(normalizeProgressionMode("Linear")).toBe("LINEAR");
    expect(normalizeProgressionMode("FLEXIBLE")).toBe("FLEXIBLE");
    expect(normalizeProgressionMode("free")).toBe("FREE");
    expect(normalizeProgressionMode(null)).toBe("FREE");
    expect(normalizeProgressionMode(undefined)).toBe("FREE");
    expect(normalizeProgressionMode("invalid")).toBe("FREE");
  });

  it("enforces enrollment requirements for non-free preview lessons", () => {
    const freeCourse = { ...sampleCourse, progressionMode: "FREE" as const };

    // Free preview lesson is accessible when NOT enrolled
    const resFreePreview = canAccessLesson(freeCourse, "les-1", {}, false);
    expect(resFreePreview.canAccess).toBe(true);

    // Non-free lesson is LOCKED when NOT enrolled
    const resPaidLesson = canAccessLesson(freeCourse, "les-2", {}, false);
    expect(resPaidLesson.canAccess).toBe(false);
    expect(resPaidLesson.reason).toContain("estar inscrito");

    // Non-free lesson is UNLOCKED when ENROLLED in FREE mode
    const resPaidEnrolled = canAccessLesson(freeCourse, "les-2", {}, true);
    expect(resPaidEnrolled.canAccess).toBe(true);
  });

  it("FREE Mode allows access to any lesson regardless of progress if enrolled", () => {
    const freeCourse = { ...sampleCourse, progressionMode: "FREE" as const };
    const res1 = canAccessLesson(freeCourse, "les-1", {}, true);
    const res4 = canAccessLesson(freeCourse, "les-4", {}, true);

    expect(res1.canAccess).toBe(true);
    expect(res4.canAccess).toBe(true);
  });

  it("LINEAR Mode locks subsequent lessons until immediately preceding lesson is completed", () => {
    const linearCourse = { ...sampleCourse, progressionMode: "LINEAR" as const };

    // Lesson 1 is unlocked if enrolled or free preview
    expect(canAccessLesson(linearCourse, "les-1", {}, true).canAccess).toBe(true);

    // Lesson 2 is locked if Lesson 1 is incomplete
    const res2Locked = canAccessLesson(linearCourse, "les-2", {}, true);
    expect(res2Locked.canAccess).toBe(false);
    expect(res2Locked.reason).toContain("Lección 1.1");

    // Lesson 2 unlocks once Lesson 1 is completed
    const progressMap = { "les-1": { completed: true } };
    expect(canAccessLesson(linearCourse, "les-2", progressMap, true).canAccess).toBe(true);

    // Lesson 3 remains locked until Lesson 2 is completed
    expect(canAccessLesson(linearCourse, "les-3", progressMap, true).canAccess).toBe(false);
  });

  it("FLEXIBLE Mode locks lessons in Module N until all lessons in prior modules are completed", () => {
    const flexCourse = { ...sampleCourse, progressionMode: "FLEXIBLE" as const };

    // Module 1 lessons are flexible
    expect(canAccessLesson(flexCourse, "les-1", {}, true).canAccess).toBe(true);
    expect(canAccessLesson(flexCourse, "les-2", {}, true).canAccess).toBe(true);

    // Module 2 lessons locked if Module 1 incomplete
    const resMod2Locked = canAccessLesson(flexCourse, "les-3", {}, true);
    expect(resMod2Locked.canAccess).toBe(false);
    expect(resMod2Locked.reason).toContain("Módulo 1");

    // Module 2 unlocks when all Module 1 lessons completed
    const mod1CompletedMap = {
      "les-1": { completed: true },
      "les-2": { completed: true },
    };
    expect(canAccessLesson(flexCourse, "les-3", mod1CompletedMap, true).canAccess).toBe(true);
    expect(canAccessLesson(flexCourse, "les-4", mod1CompletedMap, true).canAccess).toBe(true);
  });

  it("computes full access map for a course correctly", () => {
    const map = getLessonAccessMap(sampleCourse, {}, true);
    expect(map["les-1"].canAccess).toBe(true);
    expect(map["les-2"].canAccess).toBe(true);
    expect(map["les-3"].canAccess).toBe(true);
  });
});

describe("Learning Engine — Active Time Tracking", () => {
  it("initializes time tracker safely and handles pause/resume", () => {
    let flushedSeconds = 0;
    const tracker = new ActiveTimeTracker((s) => {
      flushedSeconds += s;
    }, 1000);

    tracker.start();
    tracker.pause();
    tracker.resume();
    tracker.flush();
    tracker.stop();

    expect(flushedSeconds).toBeGreaterThanOrEqual(0);
  });

  it("caps elapsed time at 120 seconds if tab was suspended/asleep", () => {
    let totalFlushed = 0;
    const tracker = new ActiveTimeTracker((s) => {
      totalFlushed += s;
    }, 1000);

    tracker.start();
    // Simulate long background sleep by manually hacking lastTick
    // @ts-expect-error accessing private property for test
    tracker.lastTick = Date.now() - 3600 * 1000; // 1 hour ago

    tracker.pause(); // should cap at 120 seconds
    expect(totalFlushed).toBe(120);
  });
});
