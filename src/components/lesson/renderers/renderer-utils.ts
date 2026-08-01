export function str(val: unknown, fallback = ""): string {
  return typeof val === "string" ? val : fallback;
}
