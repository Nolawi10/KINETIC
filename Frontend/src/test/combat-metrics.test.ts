import { describe, expect, it } from "vitest";
import { COMBAT_METRICS } from "../lib/combat-metrics";

describe("sport-specific telemetry", () => {
  it("maps Muay Thai to shin force in Newtons, knee trajectory and clinch balance", () => {
    expect(COMBAT_METRICS["MUAY THAI"].map((metric) => metric.label)).toEqual([
      "Shin Impact Force",
      "Knee Trajectory Angle",
      "Clinch Balance",
    ]);
    expect(COMBAT_METRICS["MUAY THAI"][0]?.unit).toBe("N");
  });
  it("maps Boxing to slip distance, head velocity and punch force", () => {
    expect(COMBAT_METRICS.BOXING.map((metric) => metric.label)).toEqual([
      "Slip Distance",
      "Head Movement Velocity",
      "Punch Kinetic Force",
    ]);
  });
  it("maps grappling to level changes, sprawls and center of gravity", () => {
    expect(COMBAT_METRICS["BJJ & WRESTLING"].map((metric) => metric.label)).toEqual([
      "Level-Change Velocity",
      "Sprawl Acceleration",
      "Base Center of Gravity",
    ]);
  });
});
