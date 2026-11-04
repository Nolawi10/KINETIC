import MusicPlayer from "@/components/music-player";
import KineticPerformanceCoach from "@/components/kinetic-performance-coach";
import Dummy3DContainer from "@/components/dummy-3d/dummy-3d-container";
import {
  ComboStreak,
  LiveStrikeCounter,
  RecentStrikeHistory,
  StrikeComboHud,
  VelocityPower,
} from "@/components/strike-hud";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { TacticalShell, tacticalHead } from "@/components/tactical-shell";
import {
  TacticalCamera,
  type CameraProvider,
  type CameraTelemetry,
} from "@/components/tactical-camera";
import { useAccount } from "@/components/kinetic-account";
import { supabase } from "@/integrations/supabase/client";
import { getPreset } from "@/lib/coaching-presets";
import { guidedDemosActive, guidedDemosPaused } from "@/lib/sensor-sim/engine";
import { sensorSimStore } from "@/lib/sensor-sim/store";
import { useSensorSim } from "@/hooks/use-sensor-sim";
import { useSessionTimer } from "@/hooks/use-session-timer";
import { useVerifiedStrikes } from "@/hooks/use-verified-strikes";
import { STRIKE_LABELS, verifiedStrikeStore } from "@/lib/strike-recognition";
import { ROUND_SECONDS, TOTAL_ROUNDS, sessionRound } from "@/lib/session-timer";
import { SessionHeader, type SessionStatus } from "@/components/live/session-header";
import { SectionHeading } from "@/components/live/section-heading";
import { SensorControlBar } from "@/components/sensor-sim/control-bar";
import { MatSimulatorPanel } from "@/components/sensor-sim/mat-panel";
import { DummySimulatorPanel } from "@/components/sensor-sim/dummy-panel";
import EventStream from "@/components/sensor-sim/event-stream";

export const Route = createFileRoute("/live")({
  validateSearch: (search: Record<string, unknown>) => ({
    preset: getPreset(search["preset"])?.id,
  }),
  head: () =>
    tacticalHead(
      "Live Session",
      "KINETIC tactical workout simulation with pose overlays, verified strike telemetry, coaching, and session recording.",
    ),
  component: LivePage,
});

interface CameraStatus {
  available: boolean;
  running: boolean;
  source: string;
  width?: number;
  height?: number;
  fps?: number;
  message?: string;
  error?: string;
}

const EMPTY_TELEMETRY: CameraTelemetry = {
  feed: "standby",
  provider: "webcam",
  resolution: "",
  engine: "idle",
  poseFps: 0,
};

function LivePage() {
  const { preset: presetId } = Route.useSearch();
  const preset = getPreset(presetId);
  const simState = useSensorSim();
  const verified = useVerifiedStrikes();

  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("idle");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const { user } = useAccount();
  const timer = useSessionTimer();

  // null means "not detected yet". TacticalCamera probes the backend before it
  // opens any device, so a Pi never races its browser for the camera.
  const [cameraProvider, setCameraProvider] = useState<CameraProvider | null>(null);
  const [cameraTelemetry, setCameraTelemetry] = useState<CameraTelemetry>(EMPTY_TELEMETRY);
  const [hardwareConnected, setHardwareConnected] = useState(false);
  const [mounted, setMounted] = useState(false);

  /** Sensor events already offered to the verified-strike bridge. */
  const seenSensorEventIdsRef = useRef<Set<string>>(new Set());

  const handleProviderChange = useCallback((provider: CameraProvider) => {
    setCameraProvider(provider);
  }, []);

  // A stable observer keeps the camera's telemetry effect from looping.
  const handleCameraTelemetry = useCallback((telemetry: CameraTelemetry) => {
    setCameraTelemetry((previous) =>
      previous.feed === telemetry.feed &&
      previous.provider === telemetry.provider &&
      previous.resolution === telemetry.resolution &&
      previous.engine === telemetry.engine &&
      previous.poseFps === telemetry.poseFps
        ? previous
        : telemetry,
    );
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Poll backend for camera and hardware telemetry status.
  useEffect(() => {
    let active = true;
    const checkStatus = async () => {
      try {
        const [camRes, hwRes] = await Promise.all([
          fetch("/api/camera/status").catch(() => null),
          fetch("/api/hardware/nodes").catch(() => null),
        ]);

        if (camRes && camRes.ok) {
          const camData: CameraStatus = await camRes.json();
          if (active) {
            if (camData.available && camData.running && camData.source === "raspberry_pi_camera") {
              setCameraProvider((current) => current ?? "picamera");
            }
          }
        }

        if (hwRes && hwRes.ok) {
          const hwData = await hwRes.json();
          if (active) {
            const nodes = hwData.nodes || [];
            setHardwareConnected(nodes.length > 0 && nodes.some((n: { stale?: boolean }) => !n.stale));
          }
        } else if (active) {
          setHardwareConnected(false);
        }
      } catch {
        if (active) setHardwareConnected(false);
      }
    };

    void checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Offer each sensor event to the verified bridge exactly once. The bridge
  // rejects guided demonstration events and camera events without an explicit
  // strike classification, so BlazePose landmarks can never inflate the HUD.
  useEffect(() => {
    for (const event of simState.events) {
      if (seenSensorEventIdsRef.current.has(event.id)) continue;
      seenSensorEventIdsRef.current.add(event.id);
      if (event.source === "camera_inference" || event.source === "hardware_telemetry") {
        verifiedStrikeStore.ingestSensorEvent(event);
      }
    }
  }, [simState.events]);

  const resetSessionView = () => {
    seenSensorEventIdsRef.current.clear();
    verifiedStrikeStore.reset();
  };

  const startSession = () => {
    resetSessionView();
    sensorSimStore.restartSession();
    sensorSimStore.startGuidedDemonstrations();
    timer.start();
    setSessionStatus("running");
    setNotice(
      "Session started. Camera, pose estimation, and both guided demonstrations are active.",
    );
  };

  const togglePause = () => {
    if (sessionStatus === "running") {
      timer.pause();
      sensorSimStore.pauseGuidedDemonstrations();
      setSessionStatus("paused");
      setNotice("Session paused. Timer and both demonstrations are frozen; camera and pose stay live.");
    } else if (sessionStatus === "paused") {
      timer.resume();
      sensorSimStore.resumeGuidedDemonstrations();
      setSessionStatus("running");
      setNotice("Session resumed. Timer and both demonstrations continue from where they stopped.");
    }
  };

  const restartSession = () => {
    resetSessionView();
    sensorSimStore.restartSession();
    sensorSimStore.startGuidedDemonstrations();
    timer.start();
    setSessionStatus("running");
    setNotice(
      "Session restarted. Timer, round, strikes, combos, events, and highlights reset; both demonstrations restarted.",
    );
  };

  const endSession = async () => {
    if (sessionStatus === "ended") return;
    timer.pause();
    sensorSimStore.stop();
    setSessionStatus("ended");

    if (!user) {
      setNotice("Session ended. Sign in if you want future sessions saved to your account.");
      return;
    }

    const maxVelocity = verified.strikes.reduce(
      (peak, strike) => Math.max(peak, strike.velocityMps ?? 0),
      0,
    );
    setSaving(true);
    const { error } = await supabase.from("training_sessions").insert({
      user_id: user.id,
      discipline: preset?.discipline ?? "MMA",
      duration_seconds: timer.seconds,
      strikes: verified.strikes.length,
      // 0 means "no validated velocity source"; never a placeholder measurement.
      max_speed: maxVelocity,
      simulated: true,
    });
    setSaving(false);
    setNotice(
      error
        ? `Session ended, but saving failed: ${error.message}`
        : "Session ended and saved.",
    );
  };

  const demoActive = guidedDemosActive(simState.guidedDemos);
  const demoPaused = guidedDemosPaused(simState.guidedDemos);
  const cameraEnabled = sessionStatus === "running" || sessionStatus === "paused";
  const currentRound = sessionRound(timer.seconds);

  const cameraLabel = !cameraEnabled
    ? "STANDBY"
    : cameraTelemetry.feed === "unavailable"
      ? "OFFLINE"
      : cameraTelemetry.feed === "connecting"
        ? "LINKING"
        : cameraProvider === "picamera"
          ? "PI CAMERA"
          : cameraProvider === "webcam"
            ? "WEBCAM"
            : "DETECTING";

  const cameraAside = (
    <span className="section-meta-chip" data-tone={cameraTelemetry.feed === "live" ? "ok" : "idle"}>
      {cameraTelemetry.feed === "live"
        ? `${cameraTelemetry.resolution || "LIVE"} · ${cameraTelemetry.poseFps || 0} POSE FPS`
        : cameraLabel}
    </span>
  );

  return (
    <TacticalShell title="LIVE SESSION" index="REAL-TIME COMBAT INTELLIGENCE">
      <SessionHeader
        status={sessionStatus}
        seconds={timer.seconds}
        currentRound={currentRound}
        totalRounds={TOTAL_ROUNDS}
        roundSeconds={ROUND_SECONDS}
        discipline={preset?.discipline ?? "MMA / KICKBOXING"}
        presetTitle={preset?.title}
        presetTag={preset?.tag}
        presetParameters={preset?.parameters}
        cameraLabel={cameraLabel}
        hardwareConnected={hardwareConnected}
        classifierOnline={verified.classifier.available}
        demoActive={demoActive}
        demoPaused={demoPaused}
        saving={saving}
        onStart={startSession}
        onTogglePause={togglePause}
        onRestart={restartSession}
        onEnd={() => void endSession()}
      />

      {notice ? (
        <p role="status" className="tactical-notice live-notice">
          {notice}
        </p>
      ) : null}

      <section className="live-section" aria-labelledby="training-section-title">
        <SectionHeading
          id="training-section-title"
          index="02 // MAIN TRAINING AREA"
          title="VISION & STRIKE TARGETS"
          description="Live pose estimation beside the four-zone dummy. Camera and simulator events share one timeline."
          aside={cameraAside}
        />

        <div className="training-grid">
          <section className="training-panel camera-panel" aria-labelledby="camera-panel-title">
            <header className="panel-head">
              <div>
                <span className="panel-kicker">CAMERA FEED // POSE OVERLAY</span>
                <h2 id="camera-panel-title">LIVE VISION ENGINE</h2>
              </div>
              <span
                className="state-badge"
                data-active={cameraTelemetry.feed === "live"}
                data-tone={cameraTelemetry.feed === "unavailable" ? "bad" : undefined}
              >
                ● {cameraLabel}
              </span>
            </header>

            {/* Unified TacticalCamera with the real MediaPipe BlazePose pipeline.
                Starting a session enables the camera; pausing never stops it. */}
            <TacticalCamera
              enabled={cameraEnabled}
              paused={sessionStatus === "ended"}
              preferredProvider={cameraProvider ?? undefined}
              onProviderChange={handleProviderChange}
              onTelemetry={handleCameraTelemetry}
            />
          </section>

          <DummySimulatorPanel demoEnabled={cameraEnabled} />
        </div>
      </section>

      <section className="live-section" aria-labelledby="mat-section-title">
        <SectionHeading
          id="mat-section-title"
          index="03 // FOOTWORK"
          title="SMART TRAINING MAT"
          description="Six piezo zones in a 3×2 grid. Left and right footwork highlight independently as contacts land."
          aside={
            <span className="section-meta-chip" data-tone={simState.activeMatSensors.length ? "ok" : "idle"}>
              {simState.activeMatSensors.length
                ? `${simState.activeMatSensors.join(" · ")} ACTIVE`
                : "MAT STANDBY"}
            </span>
          }
        />
        <MatSimulatorPanel demoEnabled={cameraEnabled} />
      </section>

      <section className="live-section" aria-labelledby="performance-section-title">
        <SectionHeading
          id="performance-section-title"
          index="04 // PERFORMANCE DASHBOARD"
          title="VERIFIED PERFORMANCE"
          description="Strike, combo and streak metrics only count classifier-verified strikes. Demo and pose events stay separate."
          aside={
            <span
              className="section-meta-chip"
              data-tone={verified.classifier.available ? "ok" : "idle"}
            >
              {verified.strikes.length} VERIFIED STRIKES
            </span>
          }
        />

        <div className="performance-grid">
          <div className="performance-cell perf-span-4">
            <LiveStrikeCounter />
          </div>
          <div className="performance-cell perf-span-5">
            <StrikeComboHud />
          </div>
          <div className="performance-cell perf-span-3">
            <RecentStrikeHistory />
          </div>
          <div className="performance-cell perf-span-4">
            <VelocityPower />
          </div>
          <div className="performance-cell perf-span-4">
            <ComboStreak />
          </div>
          <div className="performance-cell perf-span-4">
            <KineticPerformanceCoach
              sessionState={{
                running: sessionStatus === "running",
                paused: sessionStatus === "paused",
                seconds: timer.seconds,
                count: verified.strikes.length,
                events: verified.strikes.map((strike) => ({
                  zone: STRIKE_LABELS[strike.type],
                  timestamp: strike.ts,
                })),
                classifierAvailable: verified.classifier.available,
              }}
            />
          </div>
        </div>
      </section>

      <section className="live-section" aria-labelledby="timeline-section-title">
        <SectionHeading
          id="timeline-section-title"
          index="05 // EVENT TIMELINE"
          title="CHRONOLOGICAL EVENT LOG"
          description="Camera, demonstration and hardware activity in one stream. Filter the source without changing the data."
          aside={<span className="section-meta-chip">{simState.events.length} LOGGED</span>}
        />
        <SensorControlBar demoEnabled={cameraEnabled} />
        <EventStream />
      </section>

      <section className="live-section" aria-labelledby="modules-section-title">
        <SectionHeading
          id="modules-section-title"
          index="06 // SESSION MODULES"
          title="3D TARGET & AUDIO"
          description="Supplementary tools: a rotatable 3D dummy and the session music player."
        />
        <div className="session-modules">
          <div className="training-panel module-panel">
            <header className="panel-head">
              <div>
                <span className="panel-kicker">SUPPLEMENTARY // HIT ZONES</span>
                <h2>3D DUMMY SIMULATOR</h2>
              </div>
              <span className="state-badge">ROTATING · HIT ZONES</span>
            </header>
            {mounted ? (
              <div className="module-canvas">
                <Dummy3DContainer />
              </div>
            ) : (
              <div className="module-canvas module-placeholder">3D DUMMY SIMULATOR · LOADING</div>
            )}
          </div>

          <div className="training-panel module-panel">
            <header className="panel-head">
              <div>
                <span className="panel-kicker">SUPPLEMENTARY // PLAYLIST</span>
                <h2>MUSIC PLAYER</h2>
              </div>
              <span className="state-badge">SESSION AUDIO</span>
            </header>
            <div className="module-player">
              {mounted ? <MusicPlayer /> : <div style={{ height: "120px" }} />}
            </div>
          </div>
        </div>
      </section>
    </TacticalShell>
  );
}

export default LivePage;
