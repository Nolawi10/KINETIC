import { describe, it, expect } from "vitest";
import {
  comboCount,
  filterSessions,
  demoSessions,
  preferencesSchema,
  defaultPreferences,
  analysisSchema,
} from "@/lib/kinetic-data";
describe("KINETIC rules", () => {
  it("counts only combinations within the five-second window", () => {
    expect(comboCount([3, 4, 5, 9, 11], 9)).toBe(3);
  });
  it("filters today independently of discipline", () => {
    expect(
      filterSessions(demoSessions, "Today", "MMA", new Date("2026-10-10T08:00:00Z")).map(
        (r) => r.id,
      ),
    ).toEqual(["demo-1"]);
  });
  it("validates saved hardware addresses", () => {
    expect(
      preferencesSchema.safeParse({ ...defaultPreferences, ip: "not an address" }).success,
    ).toBe(false);
    expect(preferencesSchema.safeParse(defaultPreferences).success).toBe(true);
  });
  it("rejects invalid video frame inputs", () => {
    expect(analysisSchema.safeParse({ id: "bad", frames: [] }).success).toBe(false);
  });
});
