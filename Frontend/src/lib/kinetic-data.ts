import { z } from "zod";
export const disciplines = ["MMA", "Boxing", "Muay Thai", "Taekwondo", "Kickboxing"] as const;
export const preferencesSchema = z.object({
  ip: z.string().ip({ version: "v4" }),
  mat: z.boolean(),
  heart: z.boolean(),
  discipline: z.enum(disciplines),
  strike: z.number().min(0).max(100),
  guard: z.number().min(0).max(100),
  audio: z.number().min(0).max(100),
  weight: z.string().max(40),
  stance: z.enum(["Orthodox", "Southpaw"]),
  goal: z.number().int().min(1).max(10000),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export const defaultPreferences: Preferences = {
  ip: "192.168.1.105",
  mat: true,
  heart: false,
  discipline: "MMA",
  strike: 65,
  guard: 72,
  audio: 40,
  weight: "Lightweight · 155 lb",
  stance: "Orthodox",
  goal: 500,
};
export const analysisSchema = z.object({
  id: z.string().uuid(),
  frames: z
    .array(
      z.object({
        time: z.number().min(0).max(3600),
        image: z
          .string()
          .max(350000)
          .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/),
      }),
    )
    .min(1)
    .max(12),
});
export function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}
export function comboCount(times: number[], now: number) {
  return times.filter((t) => now - t <= 5 && now >= t).length;
}
export function intensity(strikes: number, seconds: number) {
  return Math.min(100, Math.round((strikes / Math.max(1, seconds / 60)) * 1.5));
}
export const demoSessions = [
  {
    id: "demo-1",
    created_at: "2026-10-10T06:10:00Z",
    discipline: "MMA",
    duration_seconds: 1080,
    strikes: 486,
    max_speed: 12.4,
    simulated: true,
  },
  {
    id: "demo-2",
    created_at: "2026-10-09T06:30:00Z",
    discipline: "Boxing",
    duration_seconds: 1500,
    strikes: 724,
    max_speed: 11.8,
    simulated: true,
  },
  {
    id: "demo-3",
    created_at: "2026-10-08T07:00:00Z",
    discipline: "Muay Thai",
    duration_seconds: 1260,
    strikes: 392,
    max_speed: 13.2,
    simulated: true,
  },
  {
    id: "demo-4",
    created_at: "2026-10-06T06:00:00Z",
    discipline: "MMA",
    duration_seconds: 1800,
    strikes: 836,
    max_speed: 12.9,
    simulated: true,
  },
  {
    id: "demo-5",
    created_at: "2026-10-04T06:00:00Z",
    discipline: "Taekwondo",
    duration_seconds: 1200,
    strikes: 318,
    max_speed: 15.1,
    simulated: true,
  },
  {
    id: "demo-6",
    created_at: "2026-09-20T06:00:00Z",
    discipline: "Boxing",
    duration_seconds: 1680,
    strikes: 768,
    max_speed: 11.6,
    simulated: true,
  },
];
export type TrainingSession = (typeof demoSessions)[number];
export function filterSessions(
  rows: TrainingSession[],
  range: string,
  discipline: string,
  now = new Date(),
) {
  const days =
    range === "Today" ? 1 : range === "Last 7 Days" ? 7 : range === "Last 30 Days" ? 30 : Infinity;
  const start =
    range === "Today"
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      : now.getTime() - days * 86400000;
  return rows.filter(
    (r) =>
      (discipline === "All disciplines" || r.discipline === discipline) &&
      new Date(r.created_at).getTime() >= start,
  );
}
