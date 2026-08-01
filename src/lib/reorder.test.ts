import { describe, it, expect } from "vitest";
import { reorderArray } from "./reorder";

describe("Local Reordering Utility", () => {
  it("reorders items correctly from start to end index", () => {
    const list = ["a", "b", "c", "d"];
    const result = reorderArray(list, 0, 2);
    expect(result).toEqual(["b", "c", "a", "d"]);
  });

  it("reorders items correctly from bottom to top", () => {
    const list = ["a", "b", "c", "d"];
    const result = reorderArray(list, 3, 1);
    expect(result).toEqual(["a", "d", "b", "c"]);
  });

  it("handles out of bounds indices gracefully", () => {
    const list = ["a", "b", "c"];
    expect(reorderArray(list, -1, 1)).toEqual(["a", "b", "c"]);
    expect(reorderArray(list, 0, 10)).toEqual(["a", "b", "c"]);
  });

  it("returns original array if startIndex equals endIndex", () => {
    const list = ["a", "b", "c"];
    expect(reorderArray(list, 1, 1)).toEqual(["a", "b", "c"]);
  });
});
