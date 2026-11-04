/**
 * Shared taxonomy for the KINETIC Smart Training Mat and Four-Zone Striking Dummy.
 *
 * These identifiers are used by the Live Feed and Analytics pages so both screens
 * describe the same physical devices. Nothing in this module talks to hardware;
 * it is the vocabulary shared by the simulator and the future receiver.
 */

export type Device = "MAT" | "DUMMY";
export type MatSensorId = "M1" | "M2" | "M3" | "M4" | "M5" | "M6";
export type DummyZoneId = "HEAD" | "CHEST" | "LEFT_WAIST" | "RIGHT_WAIST";
export type SensorId = MatSensorId | DummyZoneId;
export type EventType = "contact" | "impact";
/**
 * Strike classes the verified classifier may report. These values are never
 * inferred from BlazePose landmarks; they must be attached by the classifier.
 */
export type StrikeType = "JAB" | "CROSS" | "HOOK" | "UPPERCUT" | "ROUNDHOUSE_KICK";
export type EventSource =
  | "camera_inference"
  | "guided_demonstration"
  | "hardware_telemetry"
  | "SIMULATED"
  | "HARDWARE";
export type IntensityLevel = "light" | "medium" | "strong";
export type SimMode = "SIMULATION" | "HARDWARE";
export type SourceFilter =
  | "ALL"
  | "guided_demonstration"
  | "camera_inference"
  | "hardware_telemetry"
  | "SIMULATED"
  | "HARDWARE";
export type SequenceKind = "footwork" | "combo" | "guided_dummy" | "guided_mat";

/**
 * MPU6050-style motion sample attached to dummy impacts.
 * Values are approximate simulator outputs, not calibrated measurements.
 */
export interface ImuReading {
  /** Acceleration components in g (approximate, uncalibrated). */
  accelG: readonly [number, number, number];
  /** Angular velocity components in deg/s (approximate, uncalibrated). */
  gyroDps: readonly [number, number, number];
}

/**
 * Normalized event written by the simulator or, later, by the hardware gateway.
 * `peakAmplitude` is a raw 12-bit ADC count (0–4095) on the piezo channel — it is
 * deliberately NOT labelled as Newtons or calibrated impact energy.
 */
export interface SensorEvent {
  id: string;
  /** ISO-8601 timestamp, matching the rest of the app. */
  timestamp: string;
  /** Epoch milliseconds, used for ordering and rate calculations. */
  ts: number;
  device: Device;
  sensorId: SensorId;
  eventType: EventType;
  /** Peak ADC sample, 12-bit scale (0–4095). Uncalibrated. */
  peakAmplitude: number;
  durationMs: number;
  source: EventSource;
  sessionId: string;
  intensity: IntensityLevel;
  /** Movement label for guided demo or tactical display (e.g. 'HEAD — LEFT JAB'). */
  movementLabel?: string;
  /**
   * Attached ONLY by a verified strike classifier. Pose landmarks can never
   * populate this field, and guided demonstration events never carry it.
   */
  strikeType?: StrikeType;
  /** Classifier confidence, 0–1. Only meaningful together with `strikeType`. */
  classifierConfidence?: number;
  /** Classifier/hardware reported strike velocity. Never estimated from pose. */
  velocityMps?: number;
  /** Classifier/hardware reported power. Never estimated from pose. */
  powerW?: number;
  /** Only present for dummy impacts (MPU6050). */
  imu?: ImuReading;
}

export interface MatSensorSpec {
  id: MatSensorId;
  col: 0 | 1 | 2;
  row: 0 | 1;
  /** Human-readable placement, consistent across Live and Analytics. */
  placement:
    "FRONT LEFT" | "FRONT CENTER" | "FRONT RIGHT" | "REAR LEFT" | "REAR CENTER" | "REAR RIGHT";
}

/** 3 columns × 2 rows. Row 0 is the front line, row 1 the rear line. */
export const MAT_SENSORS: readonly MatSensorSpec[] = [
  { id: "M1", col: 0, row: 0, placement: "FRONT LEFT" },
  { id: "M2", col: 1, row: 0, placement: "FRONT CENTER" },
  { id: "M3", col: 2, row: 0, placement: "FRONT RIGHT" },
  { id: "M4", col: 0, row: 1, placement: "REAR LEFT" },
  { id: "M5", col: 1, row: 1, placement: "REAR CENTER" },
  { id: "M6", col: 2, row: 1, placement: "REAR RIGHT" },
] as const;

export const MAT_SENSOR_IDS: readonly MatSensorId[] = MAT_SENSORS.map((s) => s.id);

export interface DummyZoneSpec {
  id: DummyZoneId;
  label: string;
  /** Chart palette slot so every surface styles the zone the same way. */
  chart: 1 | 2 | 3 | 4;
  /** Screen placement for the front-facing silhouette. */
  hint: string;
}

export const DUMMY_ZONES: readonly DummyZoneSpec[] = [
  { id: "HEAD", label: "HEAD", chart: 4, hint: "MPU6050 mounted at crown" },
  { id: "CHEST", label: "CHEST", chart: 1, hint: "Sternum strike plate" },
  { id: "LEFT_WAIST", label: "LEFT WAIST", chart: 3, hint: "Viewer-left waist plate" },
  { id: "RIGHT_WAIST", label: "RIGHT WAIST", chart: 2, hint: "Viewer-right waist plate" },
] as const;

export const DUMMY_ZONE_IDS: readonly DummyZoneId[] = DUMMY_ZONES.map((z) => z.id);

export const INTENSITY_LEVELS: readonly IntensityLevel[] = ["light", "medium", "strong"] as const;

export const INTENSITY_LABELS: Record<IntensityLevel, string> = {
  light: "Light",
  medium: "Medium",
  strong: "Strong",
};

export interface DeviceIntensityPreset {
  /** Peak ADC counts (12-bit scale). */
  peak: readonly [number, number];
  durationMs: readonly [number, number];
  /** MPU6050 acceleration magnitude bounds in g. */
  accelG: readonly [number, number];
  /** MPU6050 angular velocity bounds in deg/s. */
  gyroDps: readonly [number, number];
}

export interface IntensityPreset {
  mat: DeviceIntensityPreset;
  dummy: DeviceIntensityPreset;
}

/**
 * Plausible value bands for each intensity, expressed in ADC counts.
 * These are presentation bands, not a model of piezoelectric physics.
 */
export const INTENSITY_PRESETS: Record<IntensityLevel, IntensityPreset> = {
  light: {
    mat: { peak: [420, 980], durationMs: [26, 44], accelG: [0.3, 0.8], gyroDps: [15, 60] },
    dummy: { peak: [700, 1300], durationMs: [30, 50], accelG: [0.6, 1.3], gyroDps: [40, 120] },
  },
  medium: {
    mat: { peak: [1100, 2100], durationMs: [38, 62], accelG: [0.5, 1.2], gyroDps: [30, 100] },
    dummy: { peak: [1500, 2500], durationMs: [42, 72], accelG: [1.1, 2.1], gyroDps: [90, 220] },
  },
  strong: {
    mat: { peak: [2300, 3800], durationMs: [55, 95], accelG: [0.8, 1.8], gyroDps: [50, 150] },
    dummy: { peak: [2700, 4000], durationMs: [60, 105], accelG: [1.8, 3.2], gyroDps: [180, 420] },
  },
};

export const DEVICE_LABELS: Record<Device, string> = { MAT: "Smart Mat", DUMMY: "Striking Dummy" };

/** Peak sample ceiling for the 12-bit ADC used in the simulation bands. */
export const ADC_MAX = 4095;

export interface CounterBlock {
  total: number;
  mat: number;
  dummy: number;
  bySensor: Record<MatSensorId, number>;
  byZone: Record<DummyZoneId, number>;
  byIntensity: Record<IntensityLevel, number>;
  byIntensityByDevice: Record<Device, Record<IntensityLevel, number>>;
}

export function emptyCounterBlock(): CounterBlock {
  return {
    total: 0,
    mat: 0,
    dummy: 0,
    bySensor: { M1: 0, M2: 0, M3: 0, M4: 0, M5: 0, M6: 0 },
    byZone: { HEAD: 0, CHEST: 0, LEFT_WAIST: 0, RIGHT_WAIST: 0 },
    byIntensity: { light: 0, medium: 0, strong: 0 },
    byIntensityByDevice: {
      MAT: { light: 0, medium: 0, strong: 0 },
      DUMMY: { light: 0, medium: 0, strong: 0 },
    },
  };
}

export interface SessionCounters {
  simulated: CounterBlock;
  hardware: CounterBlock;
  guided: CounterBlock;
}

export function emptySessionCounters(): SessionCounters {
  return {
    simulated: emptyCounterBlock(),
    hardware: emptyCounterBlock(),
    guided: emptyCounterBlock(),
  };
}

export interface SequenceStatus {
  kind: SequenceKind;
  /** Steps still queued after the current one. */
  remaining: number;
  /** Total steps in the running sequence. */
  total: number;
}

export type GuidedDemoKind = "dummy" | "mat";

/**
 * Timestamp-based progress for one guided demonstration. `elapsedMs` is active
 * time accumulated before the current running segment, so pausing is exact and
 * resuming cannot drift or duplicate a step.
 */
export interface GuidedDemoProgress {
  running: boolean;
  paused: boolean;
  /** Wall-clock start of the current active segment, or null while paused. */
  startedAt: number | null;
  /** Active milliseconds accumulated before `startedAt`. */
  elapsedMs: number;
  totalMs: number;
  /** Index of the next demonstration step that has not fired yet. */
  nextStep: number;
  totalSteps: number;
  /** Current movement label while the demo is running. */
  label: string | null;
}

export interface GuidedDemoState {
  dummy: GuidedDemoProgress;
  mat: GuidedDemoProgress;
}

export interface SensorSimState {
  /** Newest first; bounded by the store's `maxEvents`. */
  events: readonly SensorEvent[];
  counters: SessionCounters;
  sessionId: string;
  sessionStartedAt: number | null;
  lastEventAt: number | null;
  /** Latest event per sensor, used by the interactive panels. */
  latestBySensor: Readonly<Partial<Record<SensorId, SensorEvent>>>;
  mode: SimMode;
  running: boolean;
  matIntensity: IntensityLevel;
  dummyIntensity: IntensityLevel;
  sourceFilter: SourceFilter;
  sequence: SequenceStatus | null;
  /** Both guided demonstrations run simultaneously and independently. */
  guidedDemos: GuidedDemoState;
  /** Active strike zone highlighted during guided dummy demonstration. */
  activeDummyZone: DummyZoneId | null;
  /** Active mat sensors highlighted during guided mat demonstration. */
  activeMatSensors: readonly MatSensorId[];
  /** Dummy-only movement label; never shown in the mat panel. */
  activeDummyLabel: string | null;
  /** Mat-only movement label; never shown in the dummy panel. */
  activeMatLabel: string | null;
}
