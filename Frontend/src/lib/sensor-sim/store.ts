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
} from './engine';
import {
  emptySessionCounters,
  type Device,
  type DummyZoneId,
  type EventType,
  type ImuReading,
  type IntensityLevel,
  type MatSensorId,
  type SensorEvent,
  type SensorId,
  type SensorSimState,
  type SimMode,
  type SourceFilter,
} from './types';

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

function initialState(now: number): SensorSimState {
  return {
    events: [],
    counters: emptySessionCounters(),
    sessionId: nextSessionId(now),
    sessionStartedAt: null,
    lastEventAt: null,
    latestBySensor: {},
    mode: 'SIMULATION',
    running: false,
    matIntensity: 'medium',
    dummyIntensity: 'medium',
    sourceFilter: 'ALL',
    sequence: null,
  };
}

export class SensorSimStore {
  private state: SensorSimState;
  private listeners = new Set<() => void>();
  private readonly maxEvents: number;
  private readonly clock: () => number;
  private readonly rng: Rng;
  private readonly manualTriggeredAt = new Map<SensorId, number>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private sequenceToken = 0;

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
    this.listeners.clear();
  }

  setMode(mode: SimMode): void {
    if (mode === 'HARDWARE') {
      this.sequenceToken += 1;
      this.clearTimers();
      this.patch({ mode, running: false, sequence: null });
      return;
    }
    this.patch({ mode });
  }

  setSourceFilter(sourceFilter: SourceFilter): void {
    this.patch({ sourceFilter });
  }

  setIntensity(device: Device, intensity: IntensityLevel): void {
    if (device === 'MAT') this.patch({ matIntensity: intensity });
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
    if (this.state.mode !== 'SIMULATION') return;
    this.sequenceToken += 1;
    const token = this.sequenceToken;
    this.clearTimers();

    const sequence = planFootworkSequence(this.rng);
    this.patch({
      running: true,
      sequence: { kind: 'footwork', remaining: sequence.length, total: sequence.length },
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
        sequence: remaining > 0 ? { kind: 'footwork', remaining, total: sequence.length } : null,
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
    if (this.state.mode !== 'SIMULATION') return;
    this.sequenceToken += 1;
    const token = this.sequenceToken;
    this.clearTimers();

    const sequence = planComboSequence(this.rng);
    this.patch({
      running: true,
      sequence: { kind: 'combo', remaining: sequence.length, total: sequence.length },
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
        sequence: remaining > 0 ? { kind: 'combo', remaining, total: sequence.length } : null,
        running: remaining > 0,
      });
      if (remaining > 0) {
        this.schedule(() => step(index + 1), Math.round(randomBetween(this.rng, 190, 430)));
      }
    };

    this.schedule(() => step(0), 0);
  }

  stop(): void {
    this.sequenceToken += 1;
    this.clearTimers();
    this.patch({ running: false, sequence: null });
  }

  /**
   * Clears simulated session statistics only. Hardware events and their
   * counters are preserved; a fresh session id is issued for new demo events.
   */
  resetSimulated(): void {
    this.sequenceToken += 1;
    this.clearTimers();

    const events = this.state.events.filter((event) => event.source === 'HARDWARE');
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
      eventType: input.eventType ?? (input.device === 'MAT' ? 'contact' : 'impact'),
      peakAmplitude: input.peakAmplitude,
      durationMs: input.durationMs,
      source: 'HARDWARE',
      sessionId: input.sessionId ?? this.state.sessionId,
      intensity: input.intensity ?? 'medium',
      ...(input.imu ? { imu: input.imu } : {}),
    };
    this.pushEvent(event);
    return event;
  }

  private acceptTrigger(sensorId: SensorId, options: TriggerOptions): boolean {
    if (this.state.mode !== 'SIMULATION') return false;
    if (options.manual === false) return true;

    const now = options.now ?? this.clock();
    const last = this.manualTriggeredAt.get(sensorId);
    if (last !== undefined && now - last < MANUAL_THROTTLE_MS) return false;
    this.manualTriggeredAt.set(sensorId, now);
    return true;
  }

  private pushEvent(event: SensorEvent): void {
    const events = [event, ...this.state.events].slice(0, this.maxEvents);
    this.state = {
      ...this.state,
      events,
      counters: addEventToCounters(this.state.counters, event),
      latestBySensor: { ...this.state.latestBySensor, [event.sensorId]: event },
      lastEventAt: event.ts,
      sessionStartedAt: this.state.sessionStartedAt ?? event.ts,
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
