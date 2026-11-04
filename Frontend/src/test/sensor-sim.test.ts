import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bucketActivity,
  countersForFilter,
  createRng,
  formatSessionDuration,
  groupDummyCombos,
  guidedDemoElapsedMs,
  guidedDemoPercent,
  planComboSequence,
  planFootworkSequence,
  simulateDummyImpact,
  simulateMatContact,
  summarizeSession,
} from "@/lib/sensor-sim/engine";
import { MANUAL_THROTTLE_MS, SensorSimStore } from "@/lib/sensor-sim/store";
import { DUMMY_ZONE_IDS, INTENSITY_PRESETS, MAT_SENSOR_IDS } from "@/lib/sensor-sim/types";
import {
  COMBO_WINDOW_MS,
  DUPLICATE_WINDOW_MS,
  VerifiedStrikeStore,
  activeComboStreak,
  comboLabelFor,
} from "@/lib/strike-recognition";
import {
  pauseSessionTimer,
  resetSessionTimer,
  resumeSessionTimer,
  sessionElapsedMs,
  sessionRound,
  sessionSeconds,
  startSessionTimer,
} from "@/lib/session-timer";

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

  it("starts the dummy and mat demonstrations at the same instant", () => {
    const store = new SensorSimStore({ seed: 42, now: () => now });
    store.startGuidedDemonstrations();

    const snapshot = store.getSnapshot();
    expect(snapshot.guidedDemos.dummy.running).toBe(true);
    expect(snapshot.guidedDemos.mat.running).toBe(true);
    expect(snapshot.guidedDemos.dummy.paused).toBe(false);
    expect(snapshot.guidedDemos.mat.paused).toBe(false);
    expect(snapshot.guidedDemos.dummy.startedAt).toBe(BASE_TS);
    expect(snapshot.guidedDemos.mat.startedAt).toBe(BASE_TS);

    // Step 0 of both demos fires in the same tick.
    expect(snapshot.activeDummyZone).toBe("HEAD");
    expect(snapshot.activeDummyLabel).toBe("HEAD — LEFT JAB");
    expect(snapshot.activeMatSensors).toEqual(["M1", "M4"]);
    expect(snapshot.activeMatLabel).toBe("LEFT-FOOT STEP");
    expect(snapshot.events).toHaveLength(3);
    expect(snapshot.events.every((event) => event.source === "guided_demonstration")).toBe(true);

    store.stop();
    store.dispose();
  });

  it("pauses and resumes both demonstrations without duplicating steps", () => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TS);
    const store = new SensorSimStore({ seed: 24 });

    store.startGuidedDemonstrations();
    vi.advanceTimersByTime(5_000);
    const beforePause = store.getSnapshot();
    const dummyEventsBefore = beforePause.events.filter((e) => e.device === "DUMMY").length;
    const matEventsBefore = beforePause.events.filter((e) => e.device === "MAT").length;
    expect(dummyEventsBefore).toBe(2);
    expect(matEventsBefore).toBe(4);

    store.pauseGuidedDemonstrations();
    const paused = store.getSnapshot();
    expect(paused.guidedDemos.dummy.paused).toBe(true);
    expect(paused.guidedDemos.mat.paused).toBe(true);
    const frozenDummy = guidedDemoElapsedMs(paused.guidedDemos.dummy, BASE_TS + 5_000);

    // Ten seconds of wall time while paused must not advance anything.
    vi.advanceTimersByTime(10_000);
    const stillPaused = store.getSnapshot();
    expect(stillPaused.events).toHaveLength(beforePause.events.length);
    expect(guidedDemoElapsedMs(stillPaused.guidedDemos.dummy, BASE_TS + 15_000)).toBe(frozenDummy);
    expect(guidedDemoPercent(stillPaused.guidedDemos.mat, BASE_TS + 15_000)).toBeCloseTo(
      (5_000 / 30_000) * 100,
      5,
    );

    store.resumeGuidedDemonstrations();
    const resumed = store.getSnapshot();
    expect(resumed.guidedDemos.dummy.paused).toBe(false);
    expect(resumed.guidedDemos.mat.paused).toBe(false);

    // Resuming replays nothing; the next step is still scheduled at 10 s.
    vi.advanceTimersByTime(4_900);
    expect(store.getSnapshot().events).toHaveLength(beforePause.events.length);
    vi.advanceTimersByTime(100);

    const afterResume = store.getSnapshot();
    expect(afterResume.events.filter((e) => e.device === "DUMMY")).toHaveLength(3);
    expect(afterResume.events.filter((e) => e.device === "MAT")).toHaveLength(7);

    const ids = afterResume.events.map((event) => event.id);
    expect(new Set(ids).size).toBe(ids.length);
    store.stop();
    store.dispose();
  });

  it("runs simultaneous demos to completion at 40 s and 30 s", () => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TS);
    const store = new SensorSimStore({ seed: 21 });

    store.startGuidedDemonstrations();

    // Mat completes at 30 s while the dummy is still running.
    vi.advanceTimersByTime(30_000);
    const matDone = store.getSnapshot();
    expect(matDone.guidedDemos.mat.running).toBe(false);
    expect(matDone.guidedDemos.dummy.running).toBe(true);
    expect(matDone.activeMatSensors).toEqual([]);
    expect(matDone.activeMatLabel).toBeNull();

    vi.advanceTimersByTime(10_000);
    const finished = store.getSnapshot();
    expect(finished.guidedDemos.dummy.running).toBe(false);
    expect(finished.guidedDemos.mat.running).toBe(false);
    expect(finished.activeDummyZone).toBeNull();
    expect(finished.activeDummyLabel).toBeNull();
    expect(finished.running).toBe(false);
    expect(finished.events.filter((e) => e.device === "DUMMY")).toHaveLength(8);
    expect(finished.events.filter((e) => e.device === "MAT")).toHaveLength(17);

    // Nothing may fire after both demonstrations have completed.
    vi.advanceTimersByTime(20_000);
    expect(store.getSnapshot().events).toHaveLength(finished.events.length);
    store.dispose();
  });

  it("uses scheduled timestamps so a delayed tick cannot drift demo events", () => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TS);
    const store = new SensorSimStore({ seed: 25 });
    store.startGuidedDemonstrations();

    // Advance through several steps; each event keeps its exact 5 s offset even
    // though the driver tick lands up to 100 ms later.
    vi.advanceTimersByTime(10_500);
    const snapshot = store.getSnapshot();
    const scheduled = snapshot.events
      .filter((event) => event.device === "DUMMY")
      .map((event) => event.ts - BASE_TS)
      .sort((a, b) => a - b);
    expect(scheduled).toEqual([0, 5_000, 10_000]);

    const matOffsets = snapshot.events
      .filter((event) => event.device === "MAT" && event.sensorId === "M1")
      .map((event) => event.ts - BASE_TS)
      .sort((a, b) => a - b);
    expect(matOffsets).toEqual([0, 10_000]);

    store.stop();
    store.dispose();
  });

  it("restartSession resets timer, events, counters, highlights, and demo progress", () => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TS);
    const store = new SensorSimStore({ seed: 42 });
    store.startGuidedDemonstrations();
    vi.advanceTimersByTime(10_000);
    expect(store.getSnapshot().events.length).toBeGreaterThan(0);

    store.restartSession();
    const reset = store.getSnapshot();
    expect(reset.events).toHaveLength(0);
    expect(reset.counters.simulated.total).toBe(0);
    expect(reset.activeDummyZone).toBeNull();
    expect(reset.activeMatSensors).toEqual([]);
    expect(reset.activeDummyLabel).toBeNull();
    expect(reset.activeMatLabel).toBeNull();
    expect(reset.guidedDemos.dummy.running).toBe(false);
    expect(reset.guidedDemos.mat.running).toBe(false);
    expect(reset.guidedDemos.dummy.nextStep).toBe(0);
    expect(reset.running).toBe(false);

    // The cleared ticker must not emit stale events after a restart.
    vi.advanceTimersByTime(20_000);
    expect(store.getSnapshot().events).toHaveLength(0);

    // A restarted demonstration begins from step 0 with no duplicates.
    store.startGuidedDemonstrations();
    expect(store.getSnapshot().events.filter((e) => e.device === "DUMMY")).toHaveLength(1);
    store.stop();
    store.dispose();
  });

  it("stop clears both demos and their highlights", () => {
    const store = new SensorSimStore({ seed: 23, now: () => now });
    store.startGuidedDemonstrations();
    expect(store.getSnapshot().activeDummyZone).toBe("HEAD");

    store.stop();
    const stopped = store.getSnapshot();
    expect(stopped.guidedDemos.dummy.running).toBe(false);
    expect(stopped.guidedDemos.mat.running).toBe(false);
    expect(stopped.activeDummyZone).toBeNull();
    expect(stopped.activeMatSensors).toEqual([]);
    expect(stopped.activeDummyLabel).toBeNull();
    expect(stopped.activeMatLabel).toBeNull();
    store.dispose();
  });
});

describe("session timer", () => {
  it("starts at zero and derives elapsed time from timestamps", () => {
    const timer = startSessionTimer(BASE_TS);
    expect(sessionElapsedMs(timer, BASE_TS)).toBe(0);
    expect(sessionSeconds(timer, BASE_TS + 999)).toBe(0);
    expect(sessionSeconds(timer, BASE_TS + 1_000)).toBe(1);

    // A late render does not accumulate rounding drift.
    expect(sessionElapsedMs(timer, BASE_TS + 60_000)).toBe(60_000);
    expect(sessionSeconds(timer, BASE_TS + 60_000)).toBe(60);
  });

  it("freezes on pause and continues from the same point on resume", () => {
    let timer = startSessionTimer(BASE_TS);
    timer = pauseSessionTimer(timer, BASE_TS + 12_000);
    expect(sessionSeconds(timer, BASE_TS + 12_000)).toBe(12);
    expect(sessionSeconds(timer, BASE_TS + 90_000)).toBe(12);

    timer = resumeSessionTimer(timer, BASE_TS + 90_000);
    expect(sessionSeconds(timer, BASE_TS + 95_000)).toBe(17);
    expect(sessionElapsedMs(timer, BASE_TS + 90_500)).toBe(12_500);
  });

  it("cannot be paused or resumed twice into a duplicate segment", () => {
    let timer = startSessionTimer(BASE_TS);
    timer = pauseSessionTimer(timer, BASE_TS + 5_000);
    const pausedTwice = pauseSessionTimer(timer, BASE_TS + 9_000);
    expect(pausedTwice).toBe(timer);

    timer = resumeSessionTimer(pausedTwice, BASE_TS + 10_000);
    const resumedTwice = resumeSessionTimer(timer, BASE_TS + 20_000);
    expect(resumedTwice).toBe(timer);
    expect(sessionSeconds(timer, BASE_TS + 13_000)).toBe(8);
  });

  it("resets to zero and rolls rounds over three-minute boundaries", () => {
    const reset = resetSessionTimer();
    expect(sessionElapsedMs(reset, BASE_TS)).toBe(0);

    expect(sessionRound(0)).toBe(1);
    expect(sessionRound(179)).toBe(1);
    expect(sessionRound(180)).toBe(2);
    expect(sessionRound(360)).toBe(3);
    expect(sessionRound(10_000)).toBe(3);
  });
});

describe("verified strike recognition", () => {
  function cameraEvent(strikeType: "JAB" | "CROSS" | "HOOK" | "UPPERCUT" | "ROUNDHOUSE_KICK", ts: number) {
    const event = simulateDummyImpact("HEAD", {
      intensity: "medium",
      rng: createRng(1),
      sessionId: SESSION,
      now: ts,
      source: "camera_inference",
    });
    event.strikeType = strikeType;
    return event;
  }

  it("defaults to an unavailable classifier and rejects non-verified sources", () => {
    const store = new VerifiedStrikeStore({ now: () => BASE_TS });
    expect(store.getSnapshot().classifier.available).toBe(false);
    expect(store.getSnapshot().strikes).toHaveLength(0);

    const guided = simulateDummyImpact("HEAD", {
      intensity: "medium",
      rng: createRng(2),
      sessionId: SESSION,
      now: BASE_TS,
      source: "guided_demonstration",
    });
    expect(store.ingestSensorEvent(guided).accepted).toBe(false);

    const poseOnly = simulateDummyImpact("HEAD", {
      intensity: "medium",
      rng: createRng(3),
      sessionId: SESSION,
      now: BASE_TS,
      source: "camera_inference",
    });
    expect(store.ingestSensorEvent(poseOnly).reason).toBe("missing_strike_type");

    expect(store.ingest({ type: "JAB", source: "SIMULATED" as never }).accepted).toBe(false);
    expect(store.getSnapshot().strikes).toHaveLength(0);
  });

  it("accepts genuine classifier events and suppresses duplicates", () => {
    const store = new VerifiedStrikeStore({ now: () => BASE_TS });
    const event = cameraEvent("JAB", BASE_TS);

    expect(store.ingestSensorEvent(event).accepted).toBe(true);
    expect(store.ingestSensorEvent(event).reason).toBe("duplicate");

    const tooSoon = cameraEvent("JAB", BASE_TS + DUPLICATE_WINDOW_MS - 1);
    expect(store.ingestSensorEvent(tooSoon).reason).toBe("duplicate");

    const acceptedAgain = cameraEvent("JAB", BASE_TS + DUPLICATE_WINDOW_MS + 1);
    expect(store.ingestSensorEvent(acceptedAgain).accepted).toBe(true);

    const state = store.getSnapshot();
    expect(state.strikes).toHaveLength(2);
    expect(state.totals.JAB).toBe(2);
    expect(state.classifier.available).toBe(true);
    expect(state.lastStrike?.source).toBe("camera_inference");
  });

  it("labels terminal combinations in the two-second window", () => {
    expect(comboLabelFor(["JAB", "CROSS"])).toBe("1-2 COMBO");
    expect(comboLabelFor(["CROSS", "HOOK"])).toBe("2-3 COMBO");
    expect(comboLabelFor(["JAB", "CROSS", "HOOK"])).toBe("1-2-3 COMBO");
    expect(comboLabelFor(["JAB", "JAB", "CROSS"])).toBe("DOUBLE JAB COMBO");
    expect(comboLabelFor(["HOOK", "UPPERCUT"])).toBeNull();
  });

  it("emits one combo per burst and does not inflate totals on growth", () => {
    const store = new VerifiedStrikeStore({ now: () => BASE_TS });

    store.ingest({ type: "JAB", source: "camera_inference", ts: BASE_TS });
    const first = store.ingest({ type: "CROSS", source: "camera_inference", ts: BASE_TS + 400 });
    expect(first.combo?.label).toBe("1-2 COMBO");

    const grown = store.ingest({ type: "HOOK", source: "camera_inference", ts: BASE_TS + 800 });
    expect(grown.combo?.label).toBe("1-2-3 COMBO");

    const state = store.getSnapshot();
    expect(state.strikes).toHaveLength(3);
    expect(state.totals.JAB).toBe(1);
    expect(state.totals.CROSS).toBe(1);
    expect(state.totals.HOOK).toBe(1);
    expect(state.comboTotal).toBe(2);
    expect(state.streak).toBe(1);

    // A new burst inside the window extends the streak, it does not reset it.
    const next = store.ingest({ type: "JAB", source: "camera_inference", ts: BASE_TS + 1_200 });
    expect(next.combo).toBeUndefined();
    const cross = store.ingest({ type: "CROSS", source: "camera_inference", ts: BASE_TS + 1_400 });
    expect(cross.combo?.label).toBe("1-2 COMBO");
    expect(store.getSnapshot().streak).toBe(2);
  });

  it("clears strikes and combos on reset but preserves classifier status", () => {
    const store = new VerifiedStrikeStore({ now: () => BASE_TS });
    store.ingest({ type: "JAB", source: "camera_inference", ts: BASE_TS });
    expect(store.getSnapshot().classifier.available).toBe(true);

    store.reset();
    const state = store.getSnapshot();
    expect(state.strikes).toHaveLength(0);
    expect(state.combos).toHaveLength(0);
    expect(state.comboTotal).toBe(0);
    expect(state.streak).toBe(0);
    expect(state.classifier.available).toBe(true);
  });

  it("expires the active streak when the combo window closes", () => {
    const store = new VerifiedStrikeStore({ now: () => BASE_TS });
    store.ingest({ type: "JAB", source: "camera_inference", ts: BASE_TS });
    store.ingest({ type: "CROSS", source: "camera_inference", ts: BASE_TS + 300 });
    expect(store.getSnapshot().streak).toBe(1);

    expect(activeComboStreak(store.getSnapshot(), BASE_TS + 300 + COMBO_WINDOW_MS - 1)).toBe(1);
    expect(activeComboStreak(store.getSnapshot(), BASE_TS + 300 + COMBO_WINDOW_MS + 1)).toBe(0);
  });
});
