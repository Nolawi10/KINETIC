import { useEffect, useRef, useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNow, useSensorSim } from "@/hooks/use-sensor-sim";
import {
  countersForFilter,
  formatSessionDuration,
  guidedDemosActive,
  guidedDemosPaused,
} from "@/lib/sensor-sim/engine";
import { sensorSimStore } from "@/lib/sensor-sim/store";
import type { SourceFilter } from "@/lib/sensor-sim/types";

const SOURCE_FILTERS: readonly { id: SourceFilter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "SIMULATED", label: "Simulated" },
  { id: "guided_demonstration", label: "Guided demo" },
  { id: "camera_inference", label: "Vision AI" },
  { id: "HARDWARE", label: "Hardware" },
];

/**
 * Simulation mode, source filter and demo reset, shared by the Live page and
 * the standalone SensorSimulator. All values still come from the real store.
 */
export function SensorControlBar({ demoEnabled = true }: { demoEnabled?: boolean }) {
  const state = useSensorSim();
  const now = useNow(1000);
  const [confirmReset, setConfirmReset] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Leave no background sequence running after the page unmounts.
  useEffect(
    () => () => {
      sensorSimStore.stop();
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const counters = countersForFilter(state.counters, state.sourceFilter);
  const duration = state.sessionStartedAt && now > 0 ? now - state.sessionStartedAt : 0;
  const demoActive = guidedDemosActive(state.guidedDemos);
  const demoPaused = guidedDemosPaused(state.guidedDemos);

  function requestReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = null;
    sensorSimStore.resetSimulated();
    setConfirmReset(false);
  }

  return (
    <div className="sensor-control-bar">
      <div className="sensor-control-row">
        <div className="sensor-control-group">
          <span className="sensor-control-label">DATA MODE</span>
          <div className="sim-segment" role="group" aria-label="Sensor data mode">
            <button
              type="button"
              className="sim-segment-btn"
              data-active={state.mode === "SIMULATION"}
              aria-pressed={state.mode === "SIMULATION"}
              onClick={() => sensorSimStore.setMode("SIMULATION")}
            >
              Simulation
            </button>
            <button
              type="button"
              className="sim-segment-btn"
              data-active={state.mode === "HARDWARE"}
              aria-pressed={state.mode === "HARDWARE"}
              onClick={() => sensorSimStore.setMode("HARDWARE")}
            >
              Hardware
            </button>
          </div>
          <span className="sensor-mode-state" data-mode={state.mode}>
            {state.mode === "SIMULATION" ? "DEMO MODE" : "HARDWARE MODE"}
          </span>
          {demoActive ? (
            <span className="state-badge" data-active="true" data-guided-demo="true">
              ● GUIDED DEMO {demoPaused ? "PAUSED" : "ACTIVE"}
            </span>
          ) : null}
        </div>

        <div className="sensor-control-group sensor-source-group">
          <span className="sensor-control-label">SOURCE FILTER</span>
          <div className="sensor-source-chips" role="group" aria-label="Event source filter">
            {SOURCE_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className="sim-chip"
                data-active={state.sourceFilter === filter.id}
                aria-pressed={state.sourceFilter === filter.id}
                onClick={() => sensorSimStore.setSourceFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="sensor-control-meta">
          <span className="sensor-control-label">SESSION</span>
          <strong>{formatSessionDuration(duration)}</strong>
          <span>
            {counters.total} EVENTS · {state.counters.simulated.total} SIM ·{" "}
            {state.counters.hardware.total} HW · {state.counters.guided.total} GUIDED
          </span>
        </div>

        <Button
          size="sm"
          variant={confirmReset ? "destructive" : "ghost"}
          onClick={requestReset}
          aria-live="polite"
        >
          {confirmReset ? <AlertTriangle size={14} /> : <RotateCcw size={14} />}
          {confirmReset ? "Confirm reset" : "Reset demo"}
        </Button>
      </div>

      {!demoEnabled ? (
        <p role="status" className="sensor-control-note">
          Guided demonstrations start automatically with a session. Press Start Session to run the
          dummy and mat sequences together; the camera and pose overlay stay live.
        </p>
      ) : null}

      {state.mode === "HARDWARE" ? (
        <p role="status" className="sensor-control-note">
          Hardware mode selected. Simulation is paused — real events are accepted through the
          existing <code>POST /api/telemetry</code> receiver and tagged HARDWARE.
        </p>
      ) : null}

      {state.sourceFilter === "HARDWARE" && state.counters.hardware.total === 0 ? (
        <p role="status" className="sensor-control-note">
          No hardware events received in this session. Switch the source filter to All or Simulated
          to work with the simulator.
        </p>
      ) : null}
    </div>
  );
}

export default SensorControlBar;
