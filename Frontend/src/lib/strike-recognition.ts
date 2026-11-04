/**
 * Verified strike recognition and combo detection for the Live Session HUD.
 *
 * This module is deliberately separate from the visual pose pipeline. BlazePose
 * landmarks are not proof of a punch. Only events explicitly classified as a
 * strike by `camera_inference` or validated `hardware_telemetry` may enter this
 * store. Guided demonstration events never reach it.
 */

import { nextEventId } from "./sensor-sim/engine";
import type { SensorEvent, StrikeType } from "./sensor-sim/types";

export type { StrikeType } from "./sensor-sim/types";

export const STRIKE_TYPES: readonly StrikeType[] = [
  "JAB",
  "CROSS",
  "HOOK",
  "UPPERCUT",
  "ROUNDHOUSE_KICK",
] as const;

export const STRIKE_LABELS: Record<StrikeType, string> = {
  JAB: "JAB",
  CROSS: "CROSS",
  HOOK: "HOOK",
  UPPERCUT: "UPPERCUT",
  ROUNDHOUSE_KICK: "ROUNDHOUSE KICK",
};

/** Initial combination window required by the product specification. */
export const COMBO_WINDOW_MS = 2_000;
/** Identical classifier events inside this window are treated as duplicates. */
export const DUPLICATE_WINDOW_MS = 120;

export type VerifiedStrikeSource = "camera_inference" | "hardware_telemetry";

export interface VerifiedStrike {
  id: string;
  type: StrikeType;
  ts: number;
  timestamp: string;
  source: VerifiedStrikeSource;
  confidence?: number;
  /** Reported by the classifier/hardware, never estimated from pose. */
  velocityMps?: number;
  /** Reported by the classifier/hardware, never estimated from pose. */
  powerW?: number;
  sessionId?: string;
}

export interface ComboEvent {
  id: string;
  label: string;
  strikes: readonly StrikeType[];
  startedAt: number;
  endedAt: number;
  source: VerifiedStrikeSource | "mixed";
}

export interface ClassifierStatus {
  available: boolean;
  message: string;
}

export interface StrikeRecognitionState {
  strikes: readonly VerifiedStrike[];
  combos: readonly ComboEvent[];
  totals: Record<StrikeType, number>;
  comboTotal: number;
  streak: number;
  bestStreak: number;
  classifier: ClassifierStatus;
  lastStrike: VerifiedStrike | null;
  lastCombo: ComboEvent | null;
  rejected: number;
  duplicates: number;
}

export interface VerifiedStrikeInput {
  id?: string;
  type: StrikeType;
  ts?: number;
  source: VerifiedStrikeSource;
  confidence?: number;
  velocityMps?: number;
  powerW?: number;
  sessionId?: string;
}

export interface IngestResult {
  accepted: boolean;
  reason?: "invalid_source" | "missing_strike_type" | "duplicate";
  strike?: VerifiedStrike;
  combo?: ComboEvent;
}

export const DEFAULT_CLASSIFIER_UNAVAILABLE =
  "Verified strike classifier not connected. Pose landmarks alone are not counted.";

function emptyTotals(): Record<StrikeType, number> {
  return { JAB: 0, CROSS: 0, HOOK: 0, UPPERCUT: 0, ROUNDHOUSE_KICK: 0 };
}

function initialState(): StrikeRecognitionState {
  return {
    strikes: [],
    combos: [],
    totals: emptyTotals(),
    comboTotal: 0,
    streak: 0,
    bestStreak: 0,
    classifier: {
      available: false,
      message: DEFAULT_CLASSIFIER_UNAVAILABLE,
    },
    lastStrike: null,
    lastCombo: null,
    rejected: 0,
    duplicates: 0,
  };
}

/**
 * Terminal boxing/kickboxing combinations. Longer patterns are checked first
 * so `JAB → CROSS → HOOK` reports `1-2-3 COMBO`, not only `1-2 COMBO`.
 */
export function comboLabelFor(types: readonly StrikeType[]): string | null {
  const last3 = types.slice(-3);
  if (last3.length === 3) {
    if (last3[0] === "JAB" && last3[1] === "JAB" && last3[2] === "CROSS") {
      return "DOUBLE JAB COMBO";
    }
    if (last3[0] === "JAB" && last3[1] === "CROSS" && last3[2] === "HOOK") {
      return "1-2-3 COMBO";
    }
  }

  const last2 = types.slice(-2);
  if (last2.length === 2) {
    if (last2[0] === "JAB" && last2[1] === "CROSS") return "1-2 COMBO";
    if (last2[0] === "CROSS" && last2[1] === "HOOK") return "2-3 COMBO";
  }
  return null;
}

function comboLength(label: string): number {
  return label === "1-2-3 COMBO" || label === "DOUBLE JAB COMBO" ? 3 : 2;
}

/** Streak value that expires naturally after the combination window closes. */
export function activeComboStreak(state: StrikeRecognitionState, now: number): number {
  if (!state.lastCombo) return 0;
  return now - state.lastCombo.endedAt <= COMBO_WINDOW_MS ? state.streak : 0;
}

export class VerifiedStrikeStore {
  private state: StrikeRecognitionState = initialState();
  private listeners = new Set<() => void>();
  private sequence: VerifiedStrike[] = [];
  private readonly clock: () => number;

  constructor(options: { now?: () => number } = {}) {
    this.clock = options.now ?? (() => Date.now());
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): StrikeRecognitionState => this.state;

  setClassifierStatus(available: boolean, message: string): void {
    this.patch({
      classifier: {
        available,
        message: available
          ? message
          : message || DEFAULT_CLASSIFIER_UNAVAILABLE,
      },
    });
  }

  /**
   * Accept a strike only when the caller can prove a verified source. Used by
   * the classifier bridge; no pose or guided-demo event may call this directly.
   */
  ingest(input: VerifiedStrikeInput): IngestResult {
    if (input.source !== "camera_inference" && input.source !== "hardware_telemetry") {
      this.patch({ rejected: this.state.rejected + 1 });
      return { accepted: false, reason: "invalid_source" };
    }

    const ts = input.ts ?? this.clock();
    const id = input.id ?? nextEventId(ts);

    if (this.state.strikes.some((strike) => strike.id === id)) {
      this.patch({ duplicates: this.state.duplicates + 1 });
      return { accepted: false, reason: "duplicate" };
    }

    const previous = this.state.strikes[0];
    if (
      previous &&
      previous.source === input.source &&
      previous.type === input.type &&
      Math.abs(ts - previous.ts) < DUPLICATE_WINDOW_MS
    ) {
      this.patch({ duplicates: this.state.duplicates + 1 });
      return { accepted: false, reason: "duplicate" };
    }

    const strike: VerifiedStrike = {
      id,
      type: input.type,
      ts,
      timestamp: new Date(ts).toISOString(),
      source: input.source,
      ...(input.confidence === undefined ? {} : { confidence: input.confidence }),
      ...(input.velocityMps === undefined ? {} : { velocityMps: input.velocityMps }),
      ...(input.powerW === undefined ? {} : { powerW: input.powerW }),
      ...(input.sessionId === undefined ? {} : { sessionId: input.sessionId }),
    };

    if (previous && ts - previous.ts > COMBO_WINDOW_MS) this.sequence = [];
    this.sequence.push(strike);

    const totals = { ...this.state.totals, [strike.type]: this.state.totals[strike.type] + 1 };
    const label = comboLabelFor(this.sequence.map((entry) => entry.type));
    let combo: ComboEvent | undefined;
    let streak = this.state.streak;
    let bestStreak = this.state.bestStreak;

    if (label) {
      const length = comboLength(label);
      const members = this.sequence.slice(-length);
      const first = members[0];
      const last = members[members.length - 1];
      const sources = new Set(members.map((entry) => entry.source));
      const source: ComboEvent["source"] =
        sources.size === 1 ? ([...sources][0] as VerifiedStrikeSource) : "mixed";

      combo = {
        id: `combo_${first?.id ?? id}`,
        label,
        strikes: members.map((entry) => entry.type),
        startedAt: first?.ts ?? ts,
        endedAt: last?.ts ?? ts,
        source,
      };

      const previousCombo = this.state.lastCombo;
      if (!previousCombo) {
        streak = 1;
      } else if (
        combo.startedAt <= previousCombo.endedAt &&
        combo.endedAt > previousCombo.endedAt
      ) {
        // The same burst grew from 1-2 into 1-2-3; it is one streak, not two.
        streak = Math.max(1, this.state.streak);
      } else if (combo.startedAt - previousCombo.endedAt <= COMBO_WINDOW_MS) {
        streak = this.state.streak + 1;
      } else {
        streak = 1;
      }
      bestStreak = Math.max(bestStreak, streak);
    }

    this.state = {
      ...this.state,
      strikes: [strike, ...this.state.strikes].slice(0, 120),
      combos: combo ? [combo, ...this.state.combos].slice(0, 60) : this.state.combos,
      totals,
      comboTotal: this.state.comboTotal + (combo ? 1 : 0),
      streak,
      bestStreak,
      lastStrike: strike,
      lastCombo: combo ?? this.state.lastCombo,
      classifier: {
        available: true,
        message: "Verified strike classifier is reporting events.",
      },
    };
    this.emit();
    return { accepted: true, strike, ...(combo ? { combo } : {}) };
  }

  /**
   * Bridge for SensorEvent objects. The source and explicit `strikeType` are
   * both required: a `camera_inference` event without a classifier label is
   * still not proof of a strike.
   */
  ingestSensorEvent(event: SensorEvent): IngestResult {
    if (event.source !== "camera_inference" && event.source !== "hardware_telemetry") {
      return { accepted: false, reason: "invalid_source" };
    }
    if (!event.strikeType) {
      this.patch({ rejected: this.state.rejected + 1 });
      return { accepted: false, reason: "missing_strike_type" };
    }
    return this.ingest({
      id: event.id,
      type: event.strikeType,
      ts: event.ts,
      source: event.source,
      ...(event.classifierConfidence === undefined
        ? {}
        : { confidence: event.classifierConfidence }),
      ...(event.velocityMps === undefined ? {} : { velocityMps: event.velocityMps }),
      ...(event.powerW === undefined ? {} : { powerW: event.powerW }),
      sessionId: event.sessionId,
    });
  }

  /** Clear session strikes and combos. Classifier availability is preserved. */
  reset(): void {
    this.sequence = [];
    this.state = {
      ...initialState(),
      classifier: this.state.classifier,
    };
    this.emit();
  }

  dispose(): void {
    this.listeners.clear();
  }

  private patch(partial: Partial<StrikeRecognitionState>): void {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  private emit(): void {
    for (const listener of [...this.listeners]) listener();
  }
}

/** App-wide singleton used by the Live Session HUD and coach. */
export const verifiedStrikeStore = new VerifiedStrikeStore();
