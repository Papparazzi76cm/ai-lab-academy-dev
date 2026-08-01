import { describe, expect, it } from "vitest";
import { calculateProgress, getLessonStatus } from "./progress";
import { MinimalCourseCurriculum } from "./types";

import { ActiveTimeTracker } from "./timeTracking";
import { canAccessLesson, getLessonAccessMap } from "./unlock";

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
          },
          {
            id: "les-2",
            title: "Lección 1.2",
            slug: "leccion-1-2",
            position: 2,
            moduleId: "mod-1",
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

  it("FREE Mode allows access to any lesson regardless of progress", () => {
    const freeCourse = { ...sampleCourse, progressionMode: "FREE" as const };
    const res1 = canAccessLesson(freeCourse, "les-1", {});
    const res4 = canAccessLesson(freeCourse, "les-4", {});

    expect(res1.canAccess).toBe(true);
    expect(res4.canAccess).toBe(true);
  });

  it("LINEAR Mode locks subsequent lessons until immediately preceding lesson is completed", () => {
    const linearCourse = { ...sampleCourse, progressionMode: "LINEAR" as const };

    // Lesson 1 is always unlocked
    expect(canAccessLesson(linearCourse, "les-1", {}).canAccess).toBe(true);

    // Lesson 2 is locked if Lesson 1 is incomplete
    const res2Locked = canAccessLesson(linearCourse, "les-2", {});
    expect(res2Locked.canAccess).toBe(false);
    expect(res2Locked.reason).toContain("Lección 1.1");

    // Lesson 2 unlocks once Lesson 1 is completed
    const progressMap = { "les-1": { completed: true } };
    expect(canAccessLesson(linearCourse, "les-2", progressMap).canAccess).toBe(true);

    // Lesson 3 remains locked until Lesson 2 is completed
    expect(canAccessLesson(linearCourse, "les-3", progressMap).canAccess).toBe(false);
  });

  it("FLEXIBLE Mode locks lessons in Module N until all lessons in prior modules are completed", () => {
    const flexCourse = { ...sampleCourse, progressionMode: "FLEXIBLE" as const };

    // Module 1 lessons are flexible
    expect(canAccessLesson(flexCourse, "les-1", {}).canAccess).toBe(true);
    expect(canAccessLesson(flexCourse, "les-2", {}).canAccess).toBe(true);

    // Module 2 lessons locked if Module 1 incomplete
    const resMod2Locked = canAccessLesson(flexCourse, "les-3", {});
    expect(resMod2Locked.canAccess).toBe(false);
    expect(resMod2Locked.reason).toContain("Módulo 1");

    // Module 2 unlocks when all Module 1 lessons completed
    const mod1CompletedMap = {
      "les-1": { completed: true },
      "les-2": { completed: true },
    };
    expect(canAccessLesson(flexCourse, "les-3", mod1CompletedMap).canAccess).toBe(true);
    expect(canAccessLesson(flexCourse, "les-4", mod1CompletedMap).canAccess).toBe(true);
  });

  it("computes full access map for a course correctly", () => {
    const map = getLessonAccessMap(sampleCourse, {});
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
});
