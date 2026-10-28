import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bucketActivity,
  countersForFilter,
  createRng,
  formatSessionDuration,
  groupDummyCombos,
  planComboSequence,
  planFootworkSequence,
  simulateDummyImpact,
  simulateMatContact,
  summarizeSession,
} from "@/lib/sensor-sim/engine";
import { MANUAL_THROTTLE_MS, SensorSimStore } from "@/lib/sensor-sim/store";
import { DUMMY_ZONE_IDS, INTENSITY_PRESETS, MAT_SENSOR_IDS } from "@/lib/sensor-sim/types";

const BASE_TS = Date.UTC(2026, 0, 1, 12, 0, 0);
const SESSION = "sim_test_session";

describe("sensor simulation engine", () => {
  it("produces deterministic random streams for a seed", () => {
    const a = createRng(1234);
    const b = createRng(1234);
    const c = createRng(99);
    const fromA = [a(), a(), a(), a()];
    const fromB = [b(), b(), b(), b()];
    const fromC = [c(), c(), c(), c()];

    expect(fromA).toEqual(fromB);
    expect(fromA).not.toEqual(fromC);
    fromA.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    });
  });

  it("creates normalized mat contact events with plausible values", () => {
    const rng = createRng(7);
    const event = simulateMatContact("M3", {
      intensity: "strong",
      rng,
      sessionId: SESSION,
      now: BASE_TS,
    });
    const preset = INTENSITY_PRESETS.strong.mat;

    expect(event.device).toBe("MAT");
    expect(event.sensorId).toBe("M3");
    expect(event.eventType).toBe("contact");
    expect(event.source).toBe("SIMULATED");
    expect(event.sessionId).toBe(SESSION);
    expect(event.timestamp).toBe(new Date(BASE_TS).toISOString());
    expect(event.ts).toBe(BASE_TS);
    expect(event.peakAmplitude).toBeGreaterThanOrEqual(Math.floor(preset.peak[0]));
    expect(event.peakAmplitude).toBeLessThanOrEqual(Math.ceil(preset.peak[1]));
    expect(event.durationMs).toBeGreaterThanOrEqual(preset.durationMs[0]);
    expect(event.durationMs).toBeLessThanOrEqual(preset.durationMs[1]);
    expect(event.peakAmplitude).toBeLessThanOrEqual(4095);
    expect(event.imu).toBeUndefined();
  });

  it("creates dummy impacts with a three-axis IMU sample", () => {
    const event = simulateDummyImpact("LEFT_WAIST", {
      intensity: "medium",
      rng: createRng(11),
      sessionId: SESSION,
      now: BASE_TS,
    });

    expect(event.device).toBe("DUMMY");
    expect(event.eventType).toBe("impact");
    expect(event.sensorId).toBe("LEFT_WAIST");
    expect(event.imu).toBeDefined();
    expect(event.imu?.accelG).toHaveLength(3);
    expect(event.imu?.gyroDps).toHaveLength(3);
    for (const value of [...(event.imu?.accelG ?? []), ...(event.imu?.gyroDps ?? [])]) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it("plans multi-sensor footwork without immediate repeats", () => {
    const sequence = planFootworkSequence(createRng(21), 8);

    expect(sequence).toHaveLength(8);
    expect(new Set(sequence).size).toBeGreaterThan(1);
    sequence.forEach((sensorId, index) => {
      expect(MAT_SENSOR_IDS).toContain(sensorId);
      if (index > 0) expect(sensorId).not.toBe(sequence[index - 1]);
    });
  });

  it("plans multi-zone combos without immediate repeats", () => {
    const sequence = planComboSequence(createRng(33), 5);

    expect(sequence).toHaveLength(5);
    expect(new Set(sequence).size).toBeGreaterThan(1);
    sequence.forEach((zoneId, index) => {
      expect(DUMMY_ZONE_IDS).toContain(zoneId);
      if (index > 0) expect(zoneId).not.toBe(sequence[index - 1]);
    });
  });

  it("buckets activity into the trailing minute windows", () => {
    const events = [
      simulateMatContact("M1", {
        intensity: "light",
        rng: createRng(1),
        sessionId: SESSION,
        now: BASE_TS - 30_000,
      }),
      simulateDummyImpact("CHEST", {
        intensity: "light",
        rng: createRng(2),
        sessionId: SESSION,
        now: BASE_TS - 90_000,
      }),
    ];
    const buckets = bucketActivity(events, BASE_TS, 3);

    expect(buckets).toHaveLength(3);
    expect(buckets[2]?.label).toBe("now");
    expect(buckets[2]?.mat).toBe(1);
    expect(buckets[1]?.dummy).toBe(1);
    expect(buckets[0]?.mat).toBe(0);
  });

  it("groups dummy impacts into combinations by time gap", () => {
    const rng = createRng(5);
    const events = [
      simulateDummyImpact("HEAD", { intensity: "medium", rng, sessionId: SESSION, now: BASE_TS }),
      simulateDummyImpact("CHEST", {
        intensity: "medium",
        rng,
        sessionId: SESSION,
        now: BASE_TS + 400,
      }),
      simulateDummyImpact("LEFT_WAIST", {
        intensity: "medium",
        rng,
        sessionId: SESSION,
        now: BASE_TS + 800,
      }),
      simulateDummyImpact("RIGHT_WAIST", {
        intensity: "medium",
        rng,
        sessionId: SESSION,
        now: BASE_TS + 5000,
      }),
    ];
    const combos = groupDummyCombos(events, 1500);

    expect(combos).toHaveLength(2);
    expect(combos[0]?.zones).toEqual(["HEAD", "CHEST", "LEFT_WAIST"]);
    expect(combos[1]?.zones).toEqual(["RIGHT_WAIST"]);
  });
});

describe("shared sensor event store", () => {
  let now: number;

  beforeEach(() => {
    now = BASE_TS;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("records manual events in one shared snapshot", () => {
    const store = new SensorSimStore({ seed: 1, now: () => now });
    const event = store.triggerMat("M2");

    expect(event).not.toBeNull();
    const state = store.getSnapshot();
    expect(state.events).toHaveLength(1);
    expect(state.events[0]?.sensorId).toBe("M2");
    expect(state.counters.simulated.mat).toBe(1);
    expect(state.counters.simulated.bySensor.M2).toBe(1);
    expect(state.latestBySensor.M2?.id).toBe(event?.id);
    expect(state.sessionStartedAt).toBe(BASE_TS);
    store.dispose();
  });

  it("throttles repeated manual clicks on the same sensor", () => {
    const store = new SensorSimStore({ seed: 2, now: () => now });

    expect(store.triggerMat("M1")).not.toBeNull();
    expect(store.triggerMat("M1")).toBeNull();

    now += MANUAL_THROTTLE_MS;
    expect(store.triggerMat("M1")).not.toBeNull();
    expect(store.getSnapshot().counters.simulated.total).toBe(2);
    store.dispose();
  });

  it("keeps simulated and hardware sources separate", () => {
    const store = new SensorSimStore({ seed: 3, now: () => now });
    store.triggerMat("M1");
    store.triggerDummy("HEAD");
    const hardware = store.ingestHardware({
      device: "MAT",
      sensorId: "M4",
      peakAmplitude: 1500,
      durationMs: 45,
      sessionId: "hardware_session",
    });

    const state = store.getSnapshot();
    expect(hardware.source).toBe("HARDWARE");
    expect(countersForFilter(state.counters, "SIMULATED").total).toBe(2);
    expect(countersForFilter(state.counters, "HARDWARE").total).toBe(1);
    expect(countersForFilter(state.counters, "ALL").total).toBe(3);

    store.setSourceFilter("HARDWARE");
    expect(store.getSnapshot().sourceFilter).toBe("HARDWARE");
    store.dispose();
  });

  it("pauses generation in hardware mode until simulation is reselected", () => {
    const store = new SensorSimStore({ seed: 4, now: () => now });
    store.setMode("HARDWARE");

    expect(store.triggerMat("M1")).toBeNull();
    expect(store.triggerDummy("CHEST")).toBeNull();

    store.setMode("SIMULATION");
    expect(store.triggerMat("M1")).not.toBeNull();
    store.dispose();
  });

  it("resets simulated statistics but preserves hardware events", () => {
    const store = new SensorSimStore({ seed: 5, now: () => now });
    store.triggerMat("M1");
    store.ingestHardware({
      device: "DUMMY",
      sensorId: "CHEST",
      peakAmplitude: 2100,
      durationMs: 60,
      sessionId: "hardware_session",
    });
    const previousSession = store.getSnapshot().sessionId;

    store.resetSimulated();
    const state = store.getSnapshot();
    expect(state.counters.simulated.total).toBe(0);
    expect(state.counters.hardware.total).toBe(1);
    expect(state.events).toHaveLength(1);
    expect(state.events[0]?.source).toBe("HARDWARE");
    expect(state.sessionId).not.toBe(previousSession);
    store.dispose();
  });

  it("bounds in-memory history while keeping session totals", () => {
    const store = new SensorSimStore({ seed: 6, maxEvents: 5, now: () => now });

    for (let index = 0; index < 10; index += 1) {
      store.triggerMat(
        MAT_SENSOR_IDS[index % MAT_SENSOR_IDS.length] as (typeof MAT_SENSOR_IDS)[number],
      );
      now += MANUAL_THROTTLE_MS;
    }

    const state = store.getSnapshot();
    expect(state.events).toHaveLength(5);
    expect(state.counters.simulated.total).toBe(10);
    expect(state.counters.simulated.mat).toBe(10);
    store.dispose();
  });

  it("runs a footwork sequence, then stops cleanly", () => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TS);
    const store = new SensorSimStore({ seed: 8 });
    store.simulateFootwork();

    vi.advanceTimersByTime(4000);
    const afterSequence = store.getSnapshot();
    const matEvents = afterSequence.events.filter((event) => event.device === "MAT");
    expect(matEvents.length).toBeGreaterThanOrEqual(6);
    expect(new Set(matEvents.map((event) => event.sensorId)).size).toBeGreaterThan(1);
    expect(afterSequence.running).toBe(false);
    expect(afterSequence.sequence).toBeNull();

    store.dispose();
  });

  it("stops background generation when Stop is pressed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TS);
    const store = new SensorSimStore({ seed: 9 });
    store.simulateCombo();
    vi.advanceTimersByTime(250);

    const runningCount = store.getSnapshot().events.length;
    expect(runningCount).toBeGreaterThan(0);

    store.stop();
    vi.advanceTimersByTime(5000);
    expect(store.getSnapshot().events).toHaveLength(runningCount);
    expect(store.getSnapshot().running).toBe(false);
    store.dispose();
  });

  it("summarizes the session from counters and events", () => {
    const store = new SensorSimStore({ seed: 10, now: () => now });
    store.triggerMat("M1");
    now += 150;
    store.triggerMat("M1");
    now += 150;
    store.triggerDummy("HEAD");
    now += 30_000;

    const state = store.getSnapshot();
    const summary = summarizeSession(
      state.counters,
      state.events,
      "ALL",
      state.sessionStartedAt,
      now,
    );

    expect(summary.total).toBe(3);
    expect(summary.mat).toBe(2);
    expect(summary.dummy).toBe(1);
    expect(summary.mostActiveSensor).toBe("M1");
    expect(summary.mostActiveZone).toBe("HEAD");
    expect(summary.durationMs).toBe(30_300);
    expect(formatSessionDuration(summary.durationMs)).toBe("00:30");
    expect(summary.eventsPerMinute).toBeGreaterThanOrEqual(1);
    store.dispose();
  });

  it("tracks intensity by device for the analytics distribution", () => {
    const store = new SensorSimStore({ seed: 12, now: () => now });
    store.setIntensity("MAT", "light");
    store.setIntensity("DUMMY", "strong");
    store.triggerMat("M1");
    now += 150;
    store.triggerDummy("CHEST");

    const counters = countersForFilter(store.getSnapshot().counters, "ALL");
    expect(counters.byIntensityByDevice.MAT.light).toBe(1);
    expect(counters.byIntensityByDevice.DUMMY.strong).toBe(1);
    expect(counters.byIntensity.light).toBe(1);
    expect(counters.byIntensity.strong).toBe(1);
    store.dispose();
  });
});
