/**
 * Single shared event store for the KINETIC mat/dummy simulator.
 *
 * Live Feed writes events here; Analytics reads the same store. Simulated and
 * hardware events are counted separately and can be filtered, and simulated
 * data is never sent to the backend receiver or training pipeline.
 */

import {
  addEventToCounters,
  countEvents,
  createRng,
  pickAdjacentSensor,
  planComboSequence,
  planFootworkSequence,
  randomBetween,
  simulateDummyImpact,
  simulateMatContact,
  nextEventId,
  type Rng,
} from "./engine";
import {
  emptySessionCounters,
  type Device,
  type DummyZoneId,
  type EventType,
  type GuidedDemoKind,
  type GuidedDemoProgress,
  type GuidedDemoState,
  type ImuReading,
  type IntensityLevel,
  type MatSensorId,
  type SensorEvent,
  type SensorId,
  type SensorSimState,
  type SimMode,
  type SourceFilter,
} from "./types";

export const DEFAULT_MAX_EVENTS = 400;
/** Manual triggers on the same sensor are ignored inside this window. */
export const MANUAL_THROTTLE_MS = 120;

export interface SensorSimStoreOptions {
  seed?: number;
  maxEvents?: number;
  now?: () => number;
}

export interface HardwareEventInput {
  device: Device;
  sensorId: SensorId;
  peakAmplitude: number;
  durationMs: number;
  eventType?: EventType;
  intensity?: IntensityLevel;
  imu?: ImuReading;
  timestamp?: string;
  ts?: number;
  sessionId?: string;
  /** Only set by validated hardware inference, never by pose landmarks. */
  strikeType?: SensorEvent["strikeType"];
  classifierConfidence?: number;
  velocityMps?: number;
  powerW?: number;
}

interface TriggerOptions {
  /** Manual clicks are throttled per sensor; auto sequence steps are not. */
  manual?: boolean;
  scale?: number;
  now?: number;
}

let sessionSequence = 0;
function nextSessionId(now: number): string {
  sessionSequence += 1;
  return `sim_${now.toString(36)}_${sessionSequence.toString(36)}`;
}

interface GuidedStep {
  atMs: number;
  label: string;
  zone?: DummyZoneId;
  sensors?: readonly MatSensorId[];
}

/** Dummy sequence: 8 strikes, one every 5 s, completes at 40 s. */
const DUMMY_DEMO_STEPS: readonly GuidedStep[] = [
  { atMs: 0, zone: "HEAD", label: "HEAD — LEFT JAB" },
  { atMs: 5_000, zone: "CHEST", label: "CHEST — CROSS" },
  { atMs: 10_000, zone: "RIGHT_WAIST", label: "RIGHT WAIST — HOOK" },
  { atMs: 15_000, zone: "CHEST", label: "CHEST — UPPERCUT" },
  { atMs: 20_000, zone: "LEFT_WAIST", label: "BODY — BODY STRIKE" },
  { atMs: 25_000, zone: "HEAD", label: "HEAD — LEFT JAB" },
  { atMs: 30_000, zone: "CHEST", label: "CHEST — CROSS" },
  { atMs: 35_000, zone: "RIGHT_WAIST", label: "RIGHT WAIST — HOOK" },
];
export const DUMMY_DEMO_TOTAL_MS = 40_000;

/** Mat sequence: 6 footwork movements, one every 5 s, completes at 30 s. */
const MAT_DEMO_STEPS: readonly GuidedStep[] = [
  { atMs: 0, sensors: ["M1", "M4"], label: "LEFT-FOOT STEP" },
  { atMs: 5_000, sensors: ["M3", "M6"], label: "RIGHT-FOOT STEP" },
  { atMs: 10_000, sensors: ["M1", "M2", "M3"], label: "FORWARD MOVEMENT" },
  { atMs: 15_000, sensors: ["M4", "M5", "M6"], label: "BACKWARD MOVEMENT" },
  { atMs: 20_000, sensors: ["M1", "M2", "M3"], label: "LATERAL SHUFFLE" },
  { atMs: 25_000, sensors: ["M1", "M3", "M4", "M6"], label: "JUMP LANDING" },
];
export const MAT_DEMO_TOTAL_MS = 30_000;

function stoppedDemo(totalMs: number, totalSteps: number): GuidedDemoProgress {
  return {
    running: false,
    paused: false,
    startedAt: null,
    elapsedMs: 0,
    totalMs,
    nextStep: 0,
    totalSteps,
    label: null,
  };
}

function emptyGuidedDemos(): GuidedDemoState {
  return {
    dummy: stoppedDemo(DUMMY_DEMO_TOTAL_MS, DUMMY_DEMO_STEPS.length),
    mat: stoppedDemo(MAT_DEMO_TOTAL_MS, MAT_DEMO_STEPS.length),
  };
}

function initialGuidedDemos(): GuidedDemoState {
  return emptyGuidedDemos();
}

function initialState(now: number): SensorSimState {
  return {
    events: [],
    counters: emptySessionCounters(),
    sessionId: nextSessionId(now),
    sessionStartedAt: null,
    lastEventAt: null,
    latestBySensor: {},
    mode: "SIMULATION",
    running: false,
    matIntensity: "medium",
    dummyIntensity: "medium",
    sourceFilter: "ALL",
    sequence: null,
    guidedDemos: initialGuidedDemos(),
    activeDummyZone: null,
    activeMatSensors: [],
    activeDummyLabel: null,
    activeMatLabel: null,
  };
}

const DEMO_STEPS: Record<GuidedDemoKind, readonly GuidedStep[]> = {
  dummy: DUMMY_DEMO_STEPS,
  mat: MAT_DEMO_STEPS,
};

export class SensorSimStore {
  private state: SensorSimState;
  private listeners = new Set<() => void>();
  private readonly maxEvents: number;
  private readonly clock: () => number;
  private readonly rng: Rng;
  private readonly manualTriggeredAt = new Map<SensorId, number>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private sequenceToken = 0;
  private demoTicker: ReturnType<typeof setInterval> | null = null;

  constructor(options: SensorSimStoreOptions = {}) {
    this.maxEvents = options.maxEvents ?? DEFAULT_MAX_EVENTS;
    this.clock = options.now ?? (() => Date.now());
    this.rng = createRng(options.seed ?? Math.floor(Math.random() * 2 ** 31));
    this.state = initialState(this.clock());
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): SensorSimState => this.state;

  dispose(): void {
    this.sequenceToken += 1;
    this.clearTimers();
    this.clearDemoTicker();
    this.listeners.clear();
  }

  setMode(mode: SimMode): void {
    if (mode === "HARDWARE") {
      this.sequenceToken += 1;
      this.clearTimers();
      this.clearDemoTicker();
      this.patch({
        mode,
        running: false,
        sequence: null,
        guidedDemos: emptyGuidedDemos(),
        activeDummyZone: null,
        activeMatSensors: [],
        activeDummyLabel: null,
        activeMatLabel: null,
      });
      return;
    }
    this.patch({ mode });
  }

  setSourceFilter(sourceFilter: SourceFilter): void {
    this.patch({ sourceFilter });
  }

  setIntensity(device: Device, intensity: IntensityLevel): void {
    if (device === "MAT") this.patch({ matIntensity: intensity });
    else this.patch({ dummyIntensity: intensity });
  }

  setRunning(running: boolean): void {
    if (!running) {
      this.sequenceToken += 1;
      this.clearTimers();
      this.patch({ running: false, sequence: null });
      return;
    }
    this.patch({ running: true });
  }

  /** Manual mat contact. Returns null when throttled or in hardware mode. */
  triggerMat(sensorId: MatSensorId, options: TriggerOptions = {}): SensorEvent | null {
    if (!this.acceptTrigger(sensorId, options)) return null;
    const event = simulateMatContact(sensorId, {
      intensity: this.state.matIntensity,
      rng: this.rng,
      sessionId: this.state.sessionId,
      now: options.now ?? this.clock(),
      ...(options.scale === undefined ? {} : { scale: options.scale }),
    });
    this.pushEvent(event);
    return event;
  }

  /** Manual dummy impact. Returns null when throttled or in hardware mode. */
  triggerDummy(zoneId: DummyZoneId, options: TriggerOptions = {}): SensorEvent | null {
    if (!this.acceptTrigger(zoneId, options)) return null;
    const event = simulateDummyImpact(zoneId, {
      intensity: this.state.dummyIntensity,
      rng: this.rng,
      sessionId: this.state.sessionId,
      now: options.now ?? this.clock(),
      ...(options.scale === undefined ? {} : { scale: options.scale }),
    });
    this.pushEvent(event);
    return event;
  }

  /** Multi-step footwork sequence with occasional two-sensor weight shifts. */
  simulateFootwork(): void {
    if (this.state.mode !== "SIMULATION") return;
    this.sequenceToken += 1;
    const token = this.sequenceToken;
    this.clearTimers();

    const sequence = planFootworkSequence(this.rng);
    this.patch({
      running: true,
      sequence: { kind: "footwork", remaining: sequence.length, total: sequence.length },
    });

    const step = (index: number) => {
      if (token !== this.sequenceToken) return;
      const sensorId = sequence[index];
      if (!sensorId) {
        this.patch({ sequence: null, running: false });
        return;
      }
      this.triggerMat(sensorId, { manual: false, now: this.clock() });
      if (this.rng() < 0.22) {
        const secondary = pickAdjacentSensor(this.rng, sensorId);
        this.triggerMat(secondary, { manual: false, scale: 0.55, now: this.clock() });
      }

      const remaining = sequence.length - index - 1;
      this.patch({
        sequence: remaining > 0 ? { kind: "footwork", remaining, total: sequence.length } : null,
        running: remaining > 0,
      });
      if (remaining > 0) {
        this.schedule(() => step(index + 1), Math.round(randomBetween(this.rng, 170, 340)));
      }
    };

    this.schedule(() => step(0), 0);
  }

  /** Multi-zone combination with plausible boxing transitions. */
  simulateCombo(): void {
    if (this.state.mode !== "SIMULATION") return;
    this.sequenceToken += 1;
    const token = this.sequenceToken;
    this.clearTimers();

    const sequence = planComboSequence(this.rng);
    this.patch({
      running: true,
      sequence: { kind: "combo", remaining: sequence.length, total: sequence.length },
    });

    const step = (index: number) => {
      if (token !== this.sequenceToken) return;
      const zoneId = sequence[index];
      if (!zoneId) {
        this.patch({ sequence: null, running: false });
        return;
      }
      this.triggerDummy(zoneId, { manual: false, now: this.clock() });

      const remaining = sequence.length - index - 1;
      this.patch({
        sequence: remaining > 0 ? { kind: "combo", remaining, total: sequence.length } : null,
        running: remaining > 0,
      });
      if (remaining > 0) {
        this.schedule(() => step(index + 1), Math.round(randomBetween(this.rng, 190, 430)));
      }
    };

    this.schedule(() => step(0), 0);
  }

  /** Stop manual sequences and both guided demonstrations. */
  stop(): void {
    this.sequenceToken += 1;
    this.clearTimers();
    this.clearDemoTicker();
    this.patch({
      running: false,
      sequence: null,
      guidedDemos: emptyGuidedDemos(),
      activeDummyZone: null,
      activeMatSensors: [],
      activeDummyLabel: null,
      activeMatLabel: null,
    });
  }

  /**
   * Start the dummy and mat demonstrations at exactly the same instant.
   * Called by Start Session and Restart Session; there are no per-panel start
   * buttons. Each demo keeps its own independent timestamp-based progress.
   */
  startGuidedDemonstrations(): void {
    if (this.state.mode !== "SIMULATION") return;
    this.sequenceToken += 1;
    this.clearTimers();

    const now = this.clock();
    this.patch({
      running: true,
      sequence: null,
      guidedDemos: {
        dummy: this.runningDemo("dummy", now),
        mat: this.runningDemo("mat", now),
      },
      activeDummyZone: null,
      activeMatSensors: [],
      activeDummyLabel: null,
      activeMatLabel: null,
    });
    this.ensureDemoTicker();
    this.tickGuidedDemos();
  }

  /** Start only the dummy demo without disturbing an active mat demo. */
  startGuidedDummyDemo(): void {
    this.startSingleDemo("dummy");
  }

  /** Start only the mat demo without disturbing an active dummy demo. */
  startGuidedMatDemo(): void {
    this.startSingleDemo("mat");
  }

  /** Pause both demonstrations without losing their position. */
  pauseGuidedDemonstrations(): void {
    const now = this.clock();
    let changed = false;
    const next = { ...this.state.guidedDemos };
    for (const kind of ["dummy", "mat"] as const) {
      const demo = next[kind];
      if (!demo.running || demo.paused) continue;
      next[kind] = {
        ...demo,
        paused: true,
        startedAt: null,
        elapsedMs: demo.elapsedMs + Math.max(0, now - (demo.startedAt ?? now)),
      };
      changed = true;
    }
    if (!changed) return;
    this.patch({ guidedDemos: next });
    const active = [next.dummy, next.mat].some((demo) => demo.running && !demo.paused);
    if (!active) this.clearDemoTicker();
  }

  /** Resume both demonstrations from their frozen positions. */
  resumeGuidedDemonstrations(): void {
    const now = this.clock();
    let changed = false;
    const next = { ...this.state.guidedDemos };
    for (const kind of ["dummy", "mat"] as const) {
      const demo = next[kind];
      if (!demo.running || !demo.paused) continue;
      next[kind] = { ...demo, paused: false, startedAt: now };
      changed = true;
    }
    if (!changed) return;
    this.patch({ guidedDemos: next });
    this.ensureDemoTicker();
    this.tickGuidedDemos();
  }

  stopGuidedDummyDemo(): void {
    this.stopSingleDemo("dummy");
  }

  stopGuidedMatDemo(): void {
    this.stopSingleDemo("mat");
  }

  private runningDemo(kind: GuidedDemoKind, now: number): GuidedDemoProgress {
    const steps = DEMO_STEPS[kind];
    return {
      running: true,
      paused: false,
      startedAt: now,
      elapsedMs: 0,
      totalMs: kind === "dummy" ? DUMMY_DEMO_TOTAL_MS : MAT_DEMO_TOTAL_MS,
      nextStep: 0,
      totalSteps: steps.length,
      label: null,
    };
  }

  private startSingleDemo(kind: GuidedDemoKind): void {
    if (this.state.mode !== "SIMULATION") return;
    if (this.state.guidedDemos[kind].running) return;
    this.sequenceToken += 1;
    this.clearTimers();
    const now = this.clock();
    this.patch({
      running: true,
      sequence: null,
      guidedDemos: {
        ...this.state.guidedDemos,
        [kind]: this.runningDemo(kind, now),
      },
      ...(kind === "dummy" ? { activeDummyZone: null, activeDummyLabel: null } : {}),
      ...(kind === "mat" ? { activeMatSensors: [], activeMatLabel: null } : {}),
    });
    this.ensureDemoTicker();
    this.tickGuidedDemos();
  }

  private stopSingleDemo(kind: GuidedDemoKind): void {
    const demo = this.state.guidedDemos[kind];
    if (!demo.running) return;
    const remaining = [this.state.guidedDemos.dummy, this.state.guidedDemos.mat].filter(
      (entry) => entry.running && entry !== demo,
    );
    this.patch({
      guidedDemos: {
        ...this.state.guidedDemos,
        [kind]: stoppedDemo(demo.totalMs, demo.totalSteps),
      },
      running: remaining.some((entry) => entry.running),
      ...(kind === "dummy" ? { activeDummyZone: null, activeDummyLabel: null } : {}),
      ...(kind === "mat" ? { activeMatSensors: [], activeMatLabel: null } : {}),
    });
    if (!this.state.guidedDemos.dummy.running && !this.state.guidedDemos.mat.running) {
      this.clearDemoTicker();
    }
  }

  private ensureDemoTicker(): void {
    if (this.demoTicker !== null) return;
    this.demoTicker = setInterval(() => this.tickGuidedDemos(), 100);
  }

  private clearDemoTicker(): void {
    if (this.demoTicker === null) return;
    clearInterval(this.demoTicker);
    this.demoTicker = null;
  }

  /**
   * Timestamp-based guided demo driver. Steps fire when the active elapsed
   * time passes their scheduled offset, so pausing freezes progress and
   * resuming cannot repeat a step or accumulate timer drift.
   */
  private tickGuidedDemos(): void {
    const now = this.clock();
    const nextDemos: GuidedDemoState = { ...this.state.guidedDemos };
    const newEvents: SensorEvent[] = [];
    let changed = false;
    let zone = this.state.activeDummyZone;
    let sensors = this.state.activeMatSensors;

    for (const kind of ["dummy", "mat"] as const) {
      const demo = nextDemos[kind];
      if (!demo.running || demo.paused || demo.startedAt === null) continue;
      const steps = DEMO_STEPS[kind];
      const activeElapsed = demo.elapsedMs + Math.max(0, now - demo.startedAt);
      let nextStep = demo.nextStep;
      let label = demo.label;

      while (nextStep < steps.length && (steps[nextStep]?.atMs ?? Infinity) <= activeElapsed) {
        const step = steps[nextStep];
        if (!step) break;
        // Compute the exact scheduled timestamp for this step, including any
        // time already accumulated before a pause/resume segment.
        const eventTs = demo.startedAt + (step.atMs - demo.elapsedMs);
        const events = this.buildGuidedEvents(kind, step, eventTs);
        newEvents.push(...events);
        label = step.label;
        if (kind === "dummy") zone = step.zone ?? null;
        else sensors = step.sensors ?? [];
        nextStep += 1;
        changed = true;
      }

      if (activeElapsed >= demo.totalMs) {
        nextDemos[kind] = {
          ...demo,
          running: false,
          paused: false,
          startedAt: null,
          elapsedMs: demo.totalMs,
          nextStep: steps.length,
          label: null,
        };
        if (kind === "dummy") zone = null;
        else sensors = [];
        changed = true;
      } else {
        nextDemos[kind] = {
          ...demo,
          nextStep,
          label,
        };
      }
    }

    if (!changed) {
      this.stopTickerIfIdle(nextDemos);
      return;
    }

    this.pushEvents(newEvents, {
      guidedDemos: nextDemos,
      activeDummyZone: zone,
      activeMatSensors: sensors,
      activeDummyLabel: nextDemos.dummy.label,
      activeMatLabel: nextDemos.mat.label,
      running: nextDemos.dummy.running || nextDemos.mat.running,
    });
    this.stopTickerIfIdle(nextDemos);
  }

  private stopTickerIfIdle(demos: GuidedDemoState): void {
    const active = [demos.dummy, demos.mat].some((demo) => demo.running && !demo.paused);
    if (!active) this.clearDemoTicker();
  }

  private buildGuidedEvents(kind: GuidedDemoKind, step: GuidedStep, ts: number): SensorEvent[] {
    if (kind === "dummy" && step.zone) {
      const event = simulateDummyImpact(step.zone, {
        intensity: "strong",
        rng: this.rng,
        sessionId: this.state.sessionId,
        now: ts,
        source: "guided_demonstration",
      });
      event.movementLabel = step.label;
      return [event];
    }
    if (kind === "mat" && step.sensors) {
      return step.sensors.map((sensorId, index) => {
        const event = simulateMatContact(sensorId, {
          intensity: "strong",
          rng: this.rng,
          sessionId: this.state.sessionId,
          now: ts + index * 30,
          source: "guided_demonstration",
        });
        event.movementLabel = step.label;
        return event;
      });
    }
    return [];
  }

  /**
   * Reset session: resets session timer, event timeline, dummy highlights,
   * mat highlights, demonstration progress, and session counters.
   */
  restartSession(): void {
    this.sequenceToken += 1;
    this.clearTimers();
    this.clearDemoTicker();
    this.manualTriggeredAt.clear();
    const now = this.clock();
    this.patch({
      events: [],
      counters: emptySessionCounters(),
      sessionId: nextSessionId(now),
      sessionStartedAt: null,
      lastEventAt: null,
      latestBySensor: {},
      running: false,
      sequence: null,
      guidedDemos: emptyGuidedDemos(),
      activeDummyZone: null,
      activeMatSensors: [],
      activeDummyLabel: null,
      activeMatLabel: null,
    });
  }

  /**
   * Clears simulated session statistics only. Hardware events and their
   * counters are preserved; a fresh session id is issued for new demo events.
   */
  resetSimulated(): void {
    this.sequenceToken += 1;
    this.clearTimers();
    this.clearDemoTicker();

    const events = this.state.events.filter((event) => event.source === "HARDWARE");
    const counters = countEvents(events);
    const latestBySensor: Partial<Record<SensorId, SensorEvent>> = {};
    for (const event of [...events].reverse()) latestBySensor[event.sensorId] = event;

    const oldestHardware = events.length ? events[events.length - 1]?.ts : undefined;
    const newestHardware = events[0]?.ts;

    this.manualTriggeredAt.clear();
    this.patch({
      events,
      counters,
      latestBySensor,
      sessionId: nextSessionId(this.clock()),
      sessionStartedAt: oldestHardware ?? null,
      lastEventAt: newestHardware ?? null,
      running: false,
      sequence: null,
      guidedDemos: emptyGuidedDemos(),
      activeDummyZone: null,
      activeMatSensors: [],
      activeDummyLabel: null,
      activeMatLabel: null,
    });
  }

  /**
   * Entry point reserved for the future Raspberry Pi receiver. It tags events
   * as HARDWARE and never touches the simulation counters.
   */
  ingestHardware(input: HardwareEventInput): SensorEvent {
    const ts = input.ts ?? (input.timestamp ? Date.parse(input.timestamp) : this.clock());
    const event: SensorEvent = {
      id: nextEventId(ts),
      timestamp: input.timestamp ?? new Date(ts).toISOString(),
      ts,
      device: input.device,
      sensorId: input.sensorId,
      eventType: input.eventType ?? (input.device === "MAT" ? "contact" : "impact"),
      peakAmplitude: input.peakAmplitude,
      durationMs: input.durationMs,
      source: "HARDWARE",
      sessionId: input.sessionId ?? this.state.sessionId,
      intensity: input.intensity ?? "medium",
      ...(input.imu ? { imu: input.imu } : {}),
      ...(input.strikeType ? { strikeType: input.strikeType } : {}),
      ...(input.classifierConfidence === undefined
        ? {}
        : { classifierConfidence: input.classifierConfidence }),
      ...(input.velocityMps === undefined ? {} : { velocityMps: input.velocityMps }),
      ...(input.powerW === undefined ? {} : { powerW: input.powerW }),
    };
    this.pushEvent(event);
    return event;
  }

  private acceptTrigger(sensorId: SensorId, options: TriggerOptions): boolean {
    if (this.state.mode !== "SIMULATION") return false;
    if (options.manual === false) return true;

    const now = options.now ?? this.clock();
    const last = this.manualTriggeredAt.get(sensorId);
    if (last !== undefined && now - last < MANUAL_THROTTLE_MS) return false;
    this.manualTriggeredAt.set(sensorId, now);
    return true;
  }

  private pushEvent(event: SensorEvent): void {
    this.pushEvents([event]);
  }

  /**
   * Apply a batch of events and optional state changes in one snapshot so the
   * two simultaneous demos cannot emit a half-updated, glitchy frame.
   */
  private pushEvents(newEvents: readonly SensorEvent[], patch: Partial<SensorSimState> = {}): void {
    if (!newEvents.length) {
      if (Object.keys(patch).length) this.patch(patch);
      return;
    }

    const chronological = [...newEvents].sort((a, b) => a.ts - b.ts);
    let events = this.state.events;
    let counters = this.state.counters;
    const latestBySensor = { ...this.state.latestBySensor };

    for (const event of chronological) {
      events = [event, ...events].slice(0, this.maxEvents);
      counters = addEventToCounters(counters, event);
      latestBySensor[event.sensorId] = event;
    }

    const newest = chronological[chronological.length - 1];
    const oldest = chronological[0];
    this.state = {
      ...this.state,
      ...patch,
      events,
      counters,
      latestBySensor,
      lastEventAt:
        newest && (this.state.lastEventAt === null || newest.ts > this.state.lastEventAt)
          ? newest.ts
          : this.state.lastEventAt,
      sessionStartedAt:
        this.state.sessionStartedAt === null
          ? (oldest?.ts ?? null)
          : this.state.sessionStartedAt,
    };
    this.emit();
  }

  private patch(partial: Partial<SensorSimState>): void {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  private emit(): void {
    for (const listener of [...this.listeners]) listener();
  }

  private schedule(callback: () => void, delayMs: number): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delayMs);
    this.timers.add(timer);
  }

  private clearTimers(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }
}

/** App-wide singleton used by both Live Feed and Analytics. */
export const sensorSimStore = new SensorSimStore();
