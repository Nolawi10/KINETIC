export const SPORT_MODES = ["ALL MMA", "MUAY THAI", "KICKBOXING", "BOXING", "BJJ & WRESTLING"] as const;
export type SportMode = (typeof SPORT_MODES)[number];
export type CombatMetric = { label: string; value: string; unit: string };
export const COMBAT_METRICS: Record<SportMode, readonly CombatMetric[]> = {
  "ALL MMA": [
    { label: "Strike Kinetic Force", value: "2,840", unit: "N" },
    { label: "Footwork Velocity", value: "3.6", unit: "M/S" },
    { label: "Combat IQ Index", value: "92.4", unit: "/ 100" },
  ],
  "MUAY THAI": [
    { label: "Shin Impact Force", value: "3,120", unit: "N" },
    { label: "Knee Trajectory Angle", value: "135", unit: "°" },
    { label: "Clinch Balance", value: "94.2", unit: "%" },
  ],
  "KICKBOXING": [
    { label: "Kick Impact Force", value: "2,960", unit: "N" },
    { label: "Guard Recovery Time", value: "240", unit: "MS" },
    { label: "Strike Velocity", value: "11.8", unit: "M/S" },
  ],
  "BOXING": [
    { label: "Slip Distance", value: "18.4", unit: "CM" },
    { label: "Head Movement Velocity", value: "2.8", unit: "M/S" },
    { label: "Punch Kinetic Force", value: "2,840", unit: "N" },
  ],
  "BJJ & WRESTLING": [
    { label: "Level-Change Velocity", value: "2.4", unit: "M/S" },
    { label: "Sprawl Acceleration", value: "8.6", unit: "M/S²" },
    { label: "Base Center of Gravity", value: "0.62", unit: "M" },
  ],
};