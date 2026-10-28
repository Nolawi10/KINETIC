import { describe, expect, it } from "vitest";
import { DISCIPLINES, DISCIPLINE_PROFILES, getImpactTarget } from "../lib/knockout-preview";

describe("combat preview", () => {
  it("provides all five requested selectable disciplines", () => {
    expect(DISCIPLINES).toEqual(["Muay Thai", "Boxing", "MMA", "Kickboxing", "BJJ"]);
    expect(DISCIPLINE_PROFILES.Boxing[0]?.label).toBe("Slip Distance");
    expect(DISCIPLINE_PROFILES.BJJ[0]?.label).toBe("Level-Change Velocity");
  });
  it("synchronizes illustrative targeting to the impact window and clears on replay", () => {
    expect(getImpactTarget(2)).toBeNull();
    expect(getImpactTarget(4)).toEqual({ x: 46, y: 23 });
    expect(getImpactTarget(4.1)?.x).toBeCloseTo(44);
    expect(getImpactTarget(5)).toBeNull();
    expect(getImpactTarget(0)).toBeNull();
  });
});