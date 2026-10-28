import { COMBAT_METRICS } from "./combat-metrics";

export const DISCIPLINES = ["Muay Thai", "Boxing", "MMA", "Kickboxing", "BJJ"] as const;
export type Discipline = (typeof DISCIPLINES)[number];
export const DISCIPLINE_PROFILES = {
  "Muay Thai": COMBAT_METRICS["MUAY THAI"],
  Boxing: COMBAT_METRICS.BOXING,
  MMA: COMBAT_METRICS["ALL MMA"],
  Kickboxing: COMBAT_METRICS.KICKBOXING,
  BJJ: COMBAT_METRICS["BJJ & WRESTLING"],
};

// Manually annotated preview coordinates, not AI detection or measured force.
const IMPACT_POINTS = [
  { time: 3.6, x: 61, y: 23 },
  { time: 3.8, x: 51, y: 25 },
  { time: 4.0, x: 46, y: 23 },
  { time: 4.2, x: 42, y: 22 },
  { time: 4.4, x: 45, y: 32 },
  { time: 4.6, x: 48, y: 39 },
];
export function getImpactTarget(time: number) {
  if (time < 3.6 || time > 4.6) return null;
  for (let i = 1; i < IMPACT_POINTS.length; i++) {
    const previous = IMPACT_POINTS[i - 1];
    const next = IMPACT_POINTS[i];
    if (!previous || !next || time > next.time) continue;
    const progress = (time - previous.time) / (next.time - previous.time);
    return {
      x: previous.x + (next.x - previous.x) * progress,
      y: previous.y + (next.y - previous.y) * progress,
    };
  }
  return null;
}
