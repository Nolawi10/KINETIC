import { useEffect, useRef, useState } from "react";
import { AlertTriangle, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNow, useSensorSim } from "@/hooks/use-sensor-sim";
import { countersForFilter, formatSessionDuration } from "@/lib/sensor-sim/engine";
import { sensorSimStore } from "@/lib/sensor-sim/store";
import type { SourceFilter } from "@/lib/sensor-sim/types";
import { MatSimulatorPanel } from "./sensor-sim/mat-panel";
import EventStream from "./sensor-sim/event-stream";

const SOURCE_FILTERS: readonly SourceFilter[] = ["ALL", "SIMULATED", "HARDWARE"];
const FILTER_LABELS: Record<SourceFilter, string> = {
  ALL: "All sources",
  SIMULATED: "Simulated",
  HARDWARE: "Hardware",
};

/**
 * Live Feed section that drives the shared mat/dummy event store.
 * Simulation mode is the default; hardware mode pauses generation and only
 * displays events tagged HARDWARE by the future receiver.
 */
export function SensorSimulator() {
  const state = useSensorSim();
  const now = useNow(1000);
  const [confirmReset, setConfirmReset] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stop background sequences when leaving the page and clear the reset timer.
  useEffect(
    () => () => {
      sensorSimStore.stop();
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const counters = countersForFilter(state.counters, state.sourceFilter);
  const duration = state.sessionStartedAt && now > 0 ? now - state.sessionStartedAt : 0;

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
    <section className="sim-section" aria-labelledby="sensor-sim-title">
      <div className="sim-head">
        <div className="sim-head-copy">
          <span className="section-index">02 // KINETIC SENSOR SIMULATOR</span>
          <h2 id="sensor-sim-title">SMART MAT &amp; FOUR-ZONE DUMMY</h2>
          <p className="micro-label">
            DEMO MODE · SIMULATED 12-BIT ADC COUNTS · NOT A VERIFIED PHYSICAL MEASUREMENT
          </p>
        </div>
        <div className="sim-mode">
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
          <span className="state-badge" data-sim-mode={state.mode}>
            {state.mode === "SIMULATION" ? "● DEMO MODE" : "● HARDWARE MODE"}
          </span>
        </div>
      </div>

      <div className="sim-toolbar">
        <div className="sim-toolbar-group">
          <span className="micro-label">SOURCE FILTER</span>
          <div className="sim-segment" role="group" aria-label="Event source filter">
            {SOURCE_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                className="sim-segment-btn"
                data-active={state.sourceFilter === filter}
                aria-pressed={state.sourceFilter === filter}
                onClick={() => sensorSimStore.setSourceFilter(filter)}
              >
                {FILTER_LABELS[filter]}
              </button>
            ))}
          </div>
        </div>

        <div className="sim-toolbar-group sim-toolbar-stats">
          <span className="micro-label">
            SESSION {formatSessionDuration(duration)} · {counters.total} EVENTS ·{" "}
            {state.counters.simulated.total} SIM / {state.counters.hardware.total} HW
          </span>
          <div className="sim-toolbar-actions">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => sensorSimStore.stop()}
              disabled={!state.running}
            >
              <Square /> Stop All
            </Button>
            <Button
              size="sm"
              variant={confirmReset ? "destructive" : "ghost"}
              onClick={requestReset}
              aria-live="polite"
            >
              {confirmReset ? <AlertTriangle /> : <RotateCcw />}
              {confirmReset ? "Confirm reset (demo only)" : "Reset demo data"}
            </Button>
          </div>
        </div>
      </div>

      {state.mode === "HARDWARE" ? (
        <p role="status" className="tactical-notice">
          Hardware mode selected. Simulation is paused — real events are accepted through the
          existing <code>POST /api/telemetry</code> receiver and tagged HARDWARE. Demo events are
          never sent to the backend or mixed into hardware counters.
        </p>
      ) : null}

      {state.sourceFilter === "HARDWARE" && state.counters.hardware.total === 0 ? (
        <p role="status" className="tactical-notice">
          No hardware events received in this session. Switch the source filter to All or Simulated
          to work with the simulator.
        </p>
      ) : null}

      <div className="sim-grid">
        <MatSimulatorPanel />
        <EventStream />
      </div>

      <EventStream />
    </section>
  );
}

export default SensorSimulator;
