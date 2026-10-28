/**
 * Pure simulation + aggregation logic for the KINETIC mat and dummy.
 *
 * Kept free of React and DOM so the generators, throttling rules and chart
 * aggregations can be unit-tested. The store in `store.ts` owns time and state.
 */

import {
  ADC_MAX,
  DUMMY_ZONE_IDS,
  INTENSITY_PRESETS,
  MAT_SENSORS,
  type CounterBlock,
  type Device,
  type DummyZoneId,
  type EventSource,
  type IntensityLevel,
  type MatSensorId,
  type SensorEvent,
  type SessionCounters,
  type SourceFilter,
  emptyCounterBlock,
} from './types';

export type Rng = () => number;

/** Mulberry32 — small, fast, seedable PRNG so simulations can be replayed. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomBetween(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function randomInt(rng: Rng, min: number, max: number): number {
  return Math.floor(randomBetween(rng, min, max + 1));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (!items.length) throw new Error('pick() requires at least one item');
  return items[Math.floor(rng() * items.length)] as T;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const round2 = (value: number) => Math.round(value * 100) / 100;

let eventSequence = 0;
/** Stable, collision-resistant-enough id that also works in jsdom/SSR. */
export function nextEventId(ts: number): string {
  eventSequence += 1;
  return `evt_${ts.toString(36)}_${eventSequence.toString(36)}`;
}

export interface GenerateOptions {
  intensity: IntensityLevel;
  rng: Rng;
  sessionId: string;
  /** Epoch ms. Defaults to Date.now() for convenience in manual triggers. */
  now?: number;
  source?: EventSource;
  /** Optional attenuation for secondary/multi-sensor contacts. */
  scale?: number;
}

function baseEvent(
  now: number,
  sessionId: string,
  source: EventSource,
): Pick<SensorEvent, 'id' | 'timestamp' | 'ts' | 'source' | 'sessionId'> {
  return {
    id: nextEventId(now),
    timestamp: new Date(now).toISOString(),
    ts: now,
    source,
    sessionId,
  };
}

/** Single mat contact: one piezo channel, one ADC peak. */
export function simulateMatContact(sensorId: MatSensorId, options: GenerateOptions): SensorEvent {
  const { intensity, rng, sessionId } = options;
  const now = options.now ?? Date.now();
  const source = options.source ?? 'SIMULATED';
  const preset = INTENSITY_PRESETS[intensity].mat;
  const scale = options.scale ?? 1;
  const peak = Math.round(
    clamp(randomBetween(rng, preset.peak[0], preset.peak[1]) * scale, 1, ADC_MAX),
  );
  const durationMs = Math.round(randomBetween(rng, preset.durationMs[0], preset.durationMs[1]));

  return {
    ...baseEvent(now, sessionId, source),
    device: 'MAT',
    sensorId,
    eventType: 'contact',
    peakAmplitude: peak,
    durationMs,
    intensity,
  };
}

const ZONE_DIRECTION: Record<DummyZoneId, readonly [number, number, number]> = {
  HEAD: [0.15, 0.85, -0.45],
  CHEST: [0, 0.55, -0.9],
  LEFT_WAIST: [0.55, 0.35, -0.7],
  RIGHT_WAIST: [-0.55, 0.35, -0.7],
};

/** Dummy impact: piezo peak plus an MPU6050-shaped acceleration/gyro sample. */
export function simulateDummyImpact(zoneId: DummyZoneId, options: GenerateOptions): SensorEvent {
  const { intensity, rng, sessionId } = options;
  const now = options.now ?? Date.now();
  const source = options.source ?? 'SIMULATED';
  const preset = INTENSITY_PRESETS[intensity].dummy;
  const peak = Math.round(
    clamp(randomBetween(rng, preset.peak[0], preset.peak[1]), 1, ADC_MAX),
  );
  const durationMs = Math.round(randomBetween(rng, preset.durationMs[0], preset.durationMs[1]));

  const dir = ZONE_DIRECTION[zoneId];
  const accelMag = randomBetween(rng, preset.accelG[0], preset.accelG[1]);
  const gyroMag = randomBetween(rng, preset.gyroDps[0], preset.gyroDps[1]);
  const jitter = () => randomBetween(rng, -0.12, 0.12);

  const imu = {
    accelG: [
      round2(dir[0] * accelMag + jitter()),
      round2(dir[1] * accelMag + jitter()),
      round2(dir[2] * accelMag + jitter()),
    ] as const,
    gyroDps: [
      round2(dir[0] * gyroMag + jitter() * 20),
      round2(dir[1] * gyroMag * 0.4 + jitter() * 20),
      round2(dir[2] * gyroMag * 0.7 + jitter() * 20),
    ] as const,
  };

  return {
    ...baseEvent(now, sessionId, source),
    device: 'DUMMY',
    sensorId: zoneId,
    eventType: 'impact',
    peakAmplitude: peak,
    durationMs,
    intensity,
    imu,
  };
}

/** Neighbouring sensor on the 3×2 mat, used for weight-shift multi-contacts. */
export function pickAdjacentSensor(rng: Rng, sensorId: MatSensorId): MatSensorId {
  const spec = MAT_SENSORS.find((sensor) => sensor.id === sensorId);
  const neighbours = MAT_SENSORS.filter(
    (sensor) =>
      sensor.id !== sensorId &&
      spec !== undefined &&
      Math.abs(sensor.col - spec.col) <= 1 &&
      Math.abs(sensor.row - spec.row) <= 1,
  );
  return neighbours.length ? (pick(rng, neighbours).id as MatSensorId) : 'M2';
}

/**
 * Plausible footwork path across the mat: starts centred, then steps mostly
 * sideways while occasionally crossing the front/rear line. Never repeats a
 * sensor twice in a row.
 */
export function planFootworkSequence(rng: Rng, length?: number): MatSensorId[] {
  const total = length ?? randomInt(rng, 6, 9);
  const sequence: MatSensorId[] = [rng() < 0.5 ? 'M2' : 'M5'];

  while (sequence.length < total) {
    const current = sequence[sequence.length - 1] as MatSensorId;
    const spec = MAT_SENSORS.find((sensor) => sensor.id === current);
    const neighbours = MAT_SENSORS.filter(
      (sensor) =>
        sensor.id !== current &&
        spec !== undefined &&
        Math.abs(sensor.col - spec.col) <= 1 &&
        Math.abs(sensor.row - spec.row) <= 1,
    );
    const lateral = neighbours.filter((sensor) => sensor.row === spec?.row);
    const next = rng() < 0.55 && lateral.length ? pick(rng, lateral) : pick(rng, neighbours);
    sequence.push(next.id as MatSensorId);
  }
  return sequence;
}

/** Preferred zone transitions for boxing-style combinations. */
const ZONE_TRANSITIONS: Record<DummyZoneId, readonly DummyZoneId[]> = {
  HEAD: ['CHEST', 'LEFT_WAIST', 'RIGHT_WAIST'],
  CHEST: ['HEAD', 'LEFT_WAIST', 'RIGHT_WAIST'],
  LEFT_WAIST: ['CHEST', 'RIGHT_WAIST'],
  RIGHT_WAIST: ['CHEST', 'LEFT_WAIST'],
};

/** Combo of 3–6 zones; each step favours an anatomically plausible next target. */
export function planComboSequence(rng: Rng, length?: number): DummyZoneId[] {
  const total = length ?? randomInt(rng, 3, 6);
  const sequence: DummyZoneId[] = [];
  let previous: DummyZoneId | null = null;

  while (sequence.length < total) {
    const preferred: readonly DummyZoneId[] = previous
      ? ZONE_TRANSITIONS[previous]
      : DUMMY_ZONE_IDS;
    const next: DummyZoneId =
      rng() < 0.72 ? pick(rng, preferred) : pick(rng, DUMMY_ZONE_IDS);
    if (next === previous) continue;
    sequence.push(next);
    previous = next;
  }
  return sequence;
}

function addToBlock(block: CounterBlock, event: SensorEvent): CounterBlock {
  const bySensor = { ...block.bySensor };
  const byZone = { ...block.byZone };
  const byIntensity = { ...block.byIntensity };
  const byIntensityByDevice: CounterBlock['byIntensityByDevice'] = {
    MAT: { ...block.byIntensityByDevice.MAT },
    DUMMY: { ...block.byIntensityByDevice.DUMMY },
  };

  if (event.device === 'MAT') {
    bySensor[event.sensorId as MatSensorId] += 1;
  } else {
    byZone[event.sensorId as DummyZoneId] += 1;
  }
  byIntensity[event.intensity] += 1;
  byIntensityByDevice[event.device][event.intensity] += 1;

  return {
    total: block.total + 1,
    mat: block.mat + (event.device === 'MAT' ? 1 : 0),
    dummy: block.dummy + (event.device === 'DUMMY' ? 1 : 0),
    bySensor,
    byZone,
    byIntensity,
    byIntensityByDevice,
  };
}

/** Immutably add an event to the simulated/hardware counter blocks. */
export function addEventToCounters(
  counters: SessionCounters,
  event: SensorEvent,
): SessionCounters {
  return event.source === 'SIMULATED'
    ? { ...counters, simulated: addToBlock(counters.simulated, event) }
    : { ...counters, hardware: addToBlock(counters.hardware, event) };
}

/** Rebuild counters from scratch — used after a simulated-data reset. */
export function countEvents(events: readonly SensorEvent[]): SessionCounters {
  return events.reduce<SessionCounters>(
    (counters, event) => addEventToCounters(counters, event),
    { simulated: emptyCounterBlock(), hardware: emptyCounterBlock() },
  );
}

export function mergeCounterBlocks(a: CounterBlock, b: CounterBlock): CounterBlock {
  const bySensor = { ...a.bySensor };
  for (const id of Object.keys(b.bySensor) as MatSensorId[]) bySensor[id] += b.bySensor[id];
  const byZone = { ...a.byZone };
  for (const id of Object.keys(b.byZone) as DummyZoneId[]) byZone[id] += b.byZone[id];
  const byIntensity = { ...a.byIntensity };
  for (const id of Object.keys(b.byIntensity) as IntensityLevel[]) {
    byIntensity[id] += b.byIntensity[id];
  }
  return {
    total: a.total + b.total,
    mat: a.mat + b.mat,
    dummy: a.dummy + b.dummy,
    bySensor,
    byZone,
    byIntensity,
    byIntensityByDevice: {
      MAT: {
        light: a.byIntensityByDevice.MAT.light + b.byIntensityByDevice.MAT.light,
        medium: a.byIntensityByDevice.MAT.medium + b.byIntensityByDevice.MAT.medium,
        strong: a.byIntensityByDevice.MAT.strong + b.byIntensityByDevice.MAT.strong,
      },
      DUMMY: {
        light: a.byIntensityByDevice.DUMMY.light + b.byIntensityByDevice.DUMMY.light,
        medium: a.byIntensityByDevice.DUMMY.medium + b.byIntensityByDevice.DUMMY.medium,
        strong: a.byIntensityByDevice.DUMMY.strong + b.byIntensityByDevice.DUMMY.strong,
      },
    },
  };
}

/** Counters respecting the current source filter, so charts never mix sources. */
export function countersForFilter(counters: SessionCounters, filter: SourceFilter): CounterBlock {
  if (filter === 'SIMULATED') return counters.simulated;
  if (filter === 'HARDWARE') return counters.hardware;
  return mergeCounterBlocks(counters.simulated, counters.hardware);
}

export function filterEvents(
  events: readonly SensorEvent[],
  filter: SourceFilter,
): SensorEvent[] {
  return filter === 'ALL' ? [...events] : events.filter((event) => event.source === filter);
}

export function mostFrequent<T extends string>(counts: Record<T, number>): T | null {
  let best: T | null = null;
  let bestCount = 0;
  for (const key of Object.keys(counts) as T[]) {
    if (counts[key] > bestCount) {
      best = key;
      bestCount = counts[key];
    }
  }
  return best;
}

export interface SessionSummary {
  total: number;
  mat: number;
  dummy: number;
  simulated: number;
  hardware: number;
  mostActiveSensor: MatSensorId | null;
  mostActiveZone: DummyZoneId | null;
  durationMs: number;
  /** Events inside the trailing 60 s window; the window is one minute wide. */
  recentWindowCount: number;
  /** Equivalent to `recentWindowCount` because the window is 60 s. */
  eventsPerMinute: number;
}

export function summarizeSession(
  counters: SessionCounters,
  events: readonly SensorEvent[],
  filter: SourceFilter,
  sessionStartedAt: number | null,
  now: number,
): SessionSummary {
  const merged = countersForFilter(counters, filter);
  const visible = filterEvents(events, filter);
  const windowStart = now - 60_000;
  const recentWindowCount = visible.filter((event) => event.ts >= windowStart).length;

  return {
    total: merged.total,
    mat: merged.mat,
    dummy: merged.dummy,
    simulated: counters.simulated.total,
    hardware: counters.hardware.total,
    mostActiveSensor: mostFrequent(merged.bySensor),
    mostActiveZone: mostFrequent(merged.byZone),
    durationMs: sessionStartedAt === null ? 0 : Math.max(0, now - sessionStartedAt),
    recentWindowCount,
    eventsPerMinute: recentWindowCount,
  };
}

export interface ActivityBucket {
  /** Relative label: '-9m' … 'now'. Locale-free so SSR and client match. */
  label: string;
  mat: number;
  dummy: number;
}

/** Buckets events into trailing minute windows, oldest first. */
export function bucketActivity(
  events: readonly SensorEvent[],
  now: number,
  minutes = 10,
  bucketMs = 60_000,
): ActivityBucket[] {
  const buckets: ActivityBucket[] = Array.from({ length: minutes }, (_, index) => ({
    label: index === minutes - 1 ? 'now' : `${index - (minutes - 1)}m`,
    mat: 0,
    dummy: 0,
  }));

  for (const event of events) {
    const age = now - event.ts;
    if (age < 0 || age >= minutes * bucketMs) continue;
    const index = minutes - 1 - Math.floor(age / bucketMs);
    const bucket = buckets[index];
    if (!bucket) continue;
    if (event.device === 'MAT') bucket.mat += 1;
    else bucket.dummy += 1;
  }
  return buckets;
}

export interface DummyCombo {
  zones: DummyZoneId[];
  startedAt: number;
  lastAt: number;
}

/** Group dummy impacts separated by more than `gapMs` into combinations. */
export function groupDummyCombos(
  events: readonly SensorEvent[],
  gapMs = 1500,
): DummyCombo[] {
  const impacts = events
    .filter((event) => event.device === 'DUMMY')
    .slice()
    .sort((a, b) => a.ts - b.ts);

  const combos: DummyCombo[] = [];
  for (const event of impacts) {
    const current = combos[combos.length - 1];
    if (current && event.ts - current.lastAt <= gapMs) {
      current.zones.push(event.sensorId as DummyZoneId);
      current.lastAt = event.ts;
    } else {
      combos.push({
        zones: [event.sensorId as DummyZoneId],
        startedAt: event.ts,
        lastAt: event.ts,
      });
    }
  }
  return combos;
}

/** HH:MM:SS in 24-hour form, independent of the user's locale. */
export function formatClock(ts: number): string {
  const date = new Date(ts);
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => part.toString().padStart(2, '0'))
    .join(':');
}

export function formatSessionDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/** Re-export the device union for consumers that only import from the engine. */
export type { Device };
