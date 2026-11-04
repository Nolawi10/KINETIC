import { Footprints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNow, useSensorSim } from "@/hooks/use-sensor-sim";
import {
  countersForFilter,
  formatClock,
  guidedDemoElapsedMs,
  guidedDemoPercent,
} from "@/lib/sensor-sim/engine";
import { sensorSimStore } from "@/lib/sensor-sim/store";
import {
  INTENSITY_LABELS,
  INTENSITY_LEVELS,
  MAT_SENSORS,
  type MatSensorId,
} from "@/lib/sensor-sim/types";

type SensorState = "idle" | "active" | "cooldown";

function sensorState(lastTs: number | undefined, now: number): SensorState {
  if (!lastTs || now <= 0) return "idle";
  const age = now - lastTs;
  if (age < 450) return "active";
  if (age < 1400) return "cooldown";
  return "idle";
}

function sideFor(col: number): "LEFT" | "CENTER" | "RIGHT" {
  if (col === 0) return "LEFT";
  if (col === 2) return "RIGHT";
  return "CENTER";
}

/** Six-piezo smart mat with manual contacts, footwork playback, and guided demonstration. */
export function MatSimulatorPanel({ demoEnabled = true }: { demoEnabled?: boolean }) {
  const state = useSensorSim();
  const now = useNow(250);
  const counters = countersForFilter(state.counters, state.sourceFilter);
  const sequence = state.sequence?.kind === "footwork" ? state.sequence : null;
  const demo = state.guidedDemos.mat;
  const isGuidedRunning = demo.running;
  const demosRunning = state.guidedDemos.dummy.running || demo.running;
  const activeMatSensors = state.activeMatSensors;
  const movementLabel = state.activeMatLabel;
  const demoElapsed = guidedDemoElapsedMs(demo, now);
  const demoPercent = guidedDemoPercent(demo, now);

  const matEvents = state.events.filter((event) => event.device === "MAT");
  const latest = matEvents[0];
  const multiContact =
    matEvents.length > 1 &&
    latest !== undefined &&
    matEvents[1] !== undefined &&
    Math.abs(latest.ts - (matEvents[1]?.ts ?? 0)) < 120;

  const recentSequence = matEvents.slice(0, 8).reverse();
  const currentLabel = movementLabel ?? latest?.movementLabel ?? latest?.sensorId ?? null;

  return (
    <section className="training-panel mat-panel" aria-labelledby="mat-sim-title">
      <header className="panel-head">
        <div>
          <span className="panel-kicker">FOOTWORK GRID // 06 PIEZO ZONES</span>
          <h2 id="mat-sim-title">SMART TRAINING MAT</h2>
        </div>
        <span className="state-badge" data-active={multiContact || isGuidedRunning}>
          {isGuidedRunning
            ? `● DEMO ${demo.paused ? "PAUSED" : "ACTIVE"} · ${Math.round(demoPercent)}%`
            : multiContact
              ? "● MULTI-SENSOR CONTACT"
              : "● LISTENING"}
        </span>
      </header>

      <div className="mat-layout">
        <div className="mat-visual">
          <div className="mat-rail" aria-hidden="true">
            <span>FRONT LINE</span>
            <span>REAR LINE</span>
          </div>
          <div className="mat-grid" role="group" aria-label="Smart mat sensors M1 to M6">
            {MAT_SENSORS.map((sensor) => {
              const event = state.latestBySensor[sensor.id];
              const isTargeted = activeMatSensors.includes(sensor.id as MatSensorId);
              const current = isTargeted ? "active" : sensorState(event?.ts, now);
              const count = counters.bySensor[sensor.id];
              const side = sideFor(sensor.col);
              return (
                <button
                  key={sensor.id}
                  type="button"
                  className="mat-sensor"
                  data-state={current}
                  data-guided={isTargeted}
                  data-side={side.toLowerCase()}
                  style={{
                    gridColumn: sensor.col + 1,
                    gridRow: sensor.row + 1,
                  }}
                  aria-label={`Mat sensor ${sensor.id}, ${sensor.placement.toLowerCase()}, ${count} contacts`}
                  title={`Trigger a simulated contact on ${sensor.id} (${sensor.placement})`}
                  onClick={() => sensorSimStore.triggerMat(sensor.id as MatSensorId)}
                >
                  <span className="mat-sensor-top">
                    <span className="mat-sensor-id">{sensor.id}</span>
                    <span className="mat-sensor-side">
                      <Footprints size={12} /> {side}
                    </span>
                  </span>
                  <span className="mat-sensor-place">{sensor.placement}</span>
                  <span className="mat-sensor-value">
                    {event ? Math.round(event.peakAmplitude) : "—"}
                    <small>ADC</small>
                  </span>
                  <span className="mat-sensor-meta">
                    <span className="mat-sensor-time">{event ? formatClock(event.ts) : "NO EVENT"}</span>
                    <span className="mat-sensor-count">{count} hits</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="mat-side">
          <div className="mat-current" data-active={Boolean(movementLabel || latest)}>
            <span className="dummy-current-kicker">
              {isGuidedRunning ? "GUIDED FOOTWORK DEMONSTRATION" : "CURRENT FOOTWORK"}
            </span>
            <strong>{currentLabel ?? "AWAITING CONTACT"}</strong>
            <span className="dummy-current-meta">
              {latest
                ? `${latest.sensorId} · ${Math.round(latest.peakAmplitude)} ADC · ${formatClock(latest.ts)}`
                : "STEP ON A ZONE OR START A SESSION"}
            </span>
          </div>

          {isGuidedRunning ? (
            <div className="demo-progress" aria-label="Mat demonstration progress">
              <div className="demo-progress-meta">
                <span>{demo.paused ? "PAUSED" : "GUIDED DEMONSTRATION"}</span>
                <strong>
                  {Math.floor(demoElapsed / 1000)}s / {Math.floor(demo.totalMs / 1000)}s
                </strong>
              </div>
              <div className="demo-progress-track">
                <div className="demo-progress-fill" style={{ width: `${demoPercent}%` }} />
              </div>
            </div>
          ) : null}

          <div className="mat-recent">
            <span className="panel-kicker">RECENT CONTACT SEQUENCE</span>
            <div className="dummy-recent-chips">
              {recentSequence.length ? (
                recentSequence.map((event) => (
                  <span
                    key={event.id}
                    data-tone={event.intensity}
                    data-guided={event.source === "guided_demonstration"}
                    title={`${event.sensorId} · ${Math.round(event.peakAmplitude)} ADC`}
                  >
                    {event.movementLabel || event.sensorId}
                  </span>
                ))
              ) : (
                <em>No contacts yet. Tap a mat zone or run footwork.</em>
              )}
            </div>
          </div>

          <div className="mat-footer">
            <div className="sim-segment" role="group" aria-label="Mat contact intensity">
              {INTENSITY_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  className="sim-segment-btn"
                  data-active={state.matIntensity === level}
                  aria-pressed={state.matIntensity === level}
                  onClick={() => sensorSimStore.setIntensity("MAT", level)}
                >
                  {INTENSITY_LABELS[level]}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => sensorSimStore.simulateFootwork()}
              disabled={state.mode !== "SIMULATION" || demosRunning || !demoEnabled}
              title="Run a short manual footwork sequence"
            >
              <Footprints size={14} /> Simulate footwork
            </Button>
          </div>

          <div className="panel-stat-row">
            <div>
              <span>CONTACTS</span>
              <strong>{counters.mat}</strong>
            </div>
            <div>
              <span>LAST EVENT</span>
              <strong>{latest ? formatClock(latest.ts) : "—"}</strong>
            </div>
            <div>
              <span>SEQUENCE</span>
              <strong>
                {sequence
                  ? `${sequence.remaining}/${sequence.total} QUEUED`
                  : isGuidedRunning
                    ? "GUIDED DEMO"
                    : "IDLE"}
              </strong>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default MatSimulatorPanel;
