/**
 * Helper utility for local reordering of items.
 */
export function reorderArray<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = Array.from(list);
  if (
    startIndex < 0 ||
    startIndex >= result.length ||
    endIndex < 0 ||
    endIndex >= result.length ||
    startIndex === endIndex
  ) {
    return result;
  }
  const [removed] = result.splice(startIndex, 1);
  if (removed !== undefined) {
    result.splice(endIndex, 0, removed);
  }
  return result;
}
