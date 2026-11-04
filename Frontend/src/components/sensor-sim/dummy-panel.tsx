import type { CSSProperties } from "react";
import { Swords, Target } from "lucide-react";
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
  DUMMY_ZONES,
  INTENSITY_LABELS,
  INTENSITY_LEVELS,
  type DummyZoneId,
} from "@/lib/sensor-sim/types";

/** Screen placement of each clickable zone over the front-facing silhouette. */
const ZONE_LAYOUT: Record<DummyZoneId, CSSProperties> = {
  HEAD: { left: "31%", top: "4%", width: "38%", height: "22%" },
  CHEST: { left: "20%", top: "27%", width: "60%", height: "25%" },
  LEFT_WAIST: { left: "12%", top: "58%", width: "35%", height: "22%" },
  RIGHT_WAIST: { left: "53%", top: "58%", width: "35%", height: "22%" },
};

function isActive(lastTs: number | undefined, now: number): boolean {
  return lastTs !== undefined && now > 0 && now - lastTs < 450;
}

const fmt = (value: number | undefined, digits = 2): string =>
  value === undefined ? "—" : value.toFixed(digits);

/** Four-zone striking dummy with MPU6050-style motion readout and guided demonstration. */
export function DummySimulatorPanel({ demoEnabled = true }: { demoEnabled?: boolean }) {
  const state = useSensorSim();
  const now = useNow(250);
  const counters = countersForFilter(state.counters, state.sourceFilter);
  const dummyEvents = state.events.filter((event) => event.device === "DUMMY");
  const latest = dummyEvents[0];
  const imu = latest?.imu;

  const demo = state.guidedDemos.dummy;
  const isGuidedRunning = demo.running;
  const demosRunning = state.guidedDemos.mat.running || demo.running;
  const activeZone = state.activeDummyZone;
  const movementLabel = state.activeDummyLabel;
  const demoElapsed = guidedDemoElapsedMs(demo, now);
  const demoPercent = guidedDemoPercent(demo, now);
  const imuLabel =
    latest?.source === "guided_demonstration"
      ? "GUIDED DEMO VECTOR · SIMULATED"
      : latest?.source === "HARDWARE" || latest?.source === "hardware_telemetry"
        ? "HARDWARE VECTOR"
        : imu
          ? "SIMULATED VECTOR"
          : "NO HARDWARE DATA";

  const recentSequence = dummyEvents.slice(0, 8).reverse();
  const currentLabel = movementLabel ?? latest?.movementLabel ?? null;
  const currentZone = latest?.sensorId ?? null;

  return (
    <section className="training-panel dummy-panel" aria-labelledby="dummy-sim-title">
      <header className="panel-head">
        <div>
          <span className="panel-kicker">STRIKE TARGET // 04 ZONES</span>
          <h2 id="dummy-sim-title">STRIKING DUMMY</h2>
        </div>
        <span
          className="state-badge"
          data-active={Boolean(isGuidedRunning || (latest && isActive(latest.ts, now)))}
        >
          {isGuidedRunning
            ? `● DEMO ${demo.paused ? "PAUSED" : "ACTIVE"} · ${Math.round(demoPercent)}%`
            : latest && isActive(latest.ts, now)
              ? "● IMPACT"
              : "● READY"}
        </span>
      </header>

      <div className="dummy-current" data-active={Boolean(currentLabel)}>
        <div className="dummy-current-copy">
          <span className="dummy-current-kicker">
            {isGuidedRunning ? "GUIDED DEMONSTRATION STRIKE" : "CURRENT STRIKE"}
          </span>
          <strong>{currentLabel ?? "AWAITING STRIKE"}</strong>
          <span className="dummy-current-meta">
            {isGuidedRunning
              ? `${Math.round(demoPercent)}% THROUGH DEMONSTRATION`
              : currentZone
                ? `${currentZone.replace("_", " ")} · ${latest ? `${Math.round(latest.peakAmplitude)} ADC · ${formatClock(latest.ts)}` : "NO READING"}`
                : "TAP A ZONE OR START A SESSION"}
          </span>
        </div>
        <span className="dummy-current-total">
          {counters.dummy}
          <small>IMPACTS</small>
        </span>
      </div>

      {isGuidedRunning ? (
        <div className="demo-progress" aria-label="Dummy demonstration progress">
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

      <div className="dummy-stage" data-active={Boolean(activeZone)}>
        <svg
          className="dummy-silhouette"
          viewBox="0 0 240 320"
          role="img"
          aria-label="Front-facing four-zone striking dummy"
        >
          <defs>
            <radialGradient id="kineticDummyHead" cx="48%" cy="38%" r="62%">
              <stop offset="0%" stopColor="#3b4b63" />
              <stop offset="100%" stopColor="#182334" />
            </radialGradient>
            <linearGradient id="kineticDummyBody" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#35465d" />
              <stop offset="58%" stopColor="#202d40" />
              <stop offset="100%" stopColor="#111a28" />
            </linearGradient>
            <linearGradient id="kineticDummyStand" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#26364a" />
              <stop offset="100%" stopColor="#0d1521" />
            </linearGradient>
          </defs>

          <ellipse cx="120" cy="306" rx="72" ry="10" fill="#050b14" opacity="0.85" />
          <path
            d="M96 318 L144 318 L137 292 L103 292 Z"
            fill="url(#kineticDummyStand)"
            stroke="#475569"
            strokeWidth="1.5"
          />
          <rect x="112" y="250" width="16" height="46" fill="#2b3a4e" stroke="#475569" strokeWidth="1.5" />

          <path
            d="M120 92 C101 92 86 106 80 128 C74 150 78 178 84 202 C90 226 96 252 99 264 L141 264 C144 252 150 226 156 202 C162 178 166 150 160 128 C154 106 139 92 120 92 Z"
            fill="url(#kineticDummyBody)"
            stroke="#5b6c84"
            strokeWidth="1.6"
          />
          <rect x="110" y="72" width="20" height="22" rx="5" fill="#223044" stroke="#5b6c84" strokeWidth="1.2" />
          <ellipse
            cx="120"
            cy="46"
            rx="33"
            ry="39"
            fill="url(#kineticDummyHead)"
            stroke="#6b7d96"
            strokeWidth="1.6"
          />

          <circle cx="120" cy="46" r="15" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 4" opacity="0.55" />
          <path d="M96 126 L144 126" stroke="#64748b" strokeWidth="1" strokeDasharray="4 5" opacity="0.5" />
          <path d="M89 204 L151 204" stroke="#64748b" strokeWidth="1" strokeDasharray="4 5" opacity="0.4" />
          <path d="M120 92 L120 264" stroke="#64748b" strokeWidth="1" strokeDasharray="3 6" opacity="0.3" />
          <circle cx="120" cy="6" r="3" fill="#38bdf8" opacity="0.7" />
        </svg>

        <div className="dummy-zone-layer">
          {DUMMY_ZONES.map((zone) => {
            const lastEvt = state.latestBySensor[zone.id];
            const recentImpact = isActive(lastEvt?.ts, now);
            const isTargeted = activeZone === zone.id;
            const count = counters.byZone[zone.id];

            return (
              <button
                key={zone.id}
                type="button"
                className="dummy-target"
                data-active={isTargeted}
                data-hit={recentImpact && !isTargeted}
                style={ZONE_LAYOUT[zone.id]}
                onClick={() => sensorSimStore.triggerDummy(zone.id)}
                title={`Trigger impact on ${zone.label}`}
                aria-label={`Dummy zone ${zone.label}, ${count} hits`}
              >
                <span className="dummy-target-head">
                  <Target size={13} />
                  {zone.label}
                </span>
                <span className="dummy-target-value">
                  {lastEvt ? Math.round(lastEvt.peakAmplitude) : "—"}
                  <small>ADC</small>
                </span>
                <span className="dummy-target-meta">{count} HITS</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="dummy-recent">
        <span className="panel-kicker">RECENT IMPACT SEQUENCE</span>
        <div className="dummy-recent-chips">
          {recentSequence.length ? (
            recentSequence.map((event) => (
              <span
                key={event.id}
                data-tone={event.intensity}
                data-guided={event.source === "guided_demonstration"}
                title={`${event.sensorId.replace("_", " ")} · ${Math.round(event.peakAmplitude)} ADC`}
              >
                {event.movementLabel || event.sensorId.replace("_", " ")}
              </span>
            ))
          ) : (
            <em>No impacts yet. Strike a zone or start the guided demonstration.</em>
          )}
        </div>
      </div>

      <div className="dummy-footer">
        <div className="sim-segment" role="group" aria-label="Dummy impact intensity">
          {INTENSITY_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className="sim-segment-btn"
              data-active={state.dummyIntensity === level}
              aria-pressed={state.dummyIntensity === level}
              onClick={() => sensorSimStore.setIntensity("DUMMY", level)}
            >
              {INTENSITY_LABELS[level]}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => sensorSimStore.simulateCombo()}
          disabled={state.mode !== "SIMULATION" || demosRunning || !demoEnabled}
          title="Run a short manual combination sequence"
        >
          <Swords size={14} /> Simulate combo
        </Button>
      </div>

      <div className="panel-stat-row">
        <div>
          <span>LAST HIT</span>
          <strong>{latest ? formatClock(latest.ts) : "—"}</strong>
        </div>
        <div>
          <span>ZONE</span>
          <strong>{currentZone ? currentZone.replace("_", " ") : "—"}</strong>
        </div>
        <div>
          <span>PEAK</span>
          <strong>{latest ? `${Math.round(latest.peakAmplitude)} ADC` : "—"}</strong>
        </div>
      </div>

      <div className="dummy-imu">
        <div className="dummy-imu-head">
          <span>MPU6050-STYLE MOTION · SIMULATED</span>
          <strong data-live={Boolean(imu)}>{imuLabel}</strong>
        </div>
        <div className="dummy-imu-grid">
          <div>
            <span>ACCEL (g)</span>
            <strong>
              [{fmt(imu?.accelG[0])}, {fmt(imu?.accelG[1])}, {fmt(imu?.accelG[2])}]
            </strong>
          </div>
          <div>
            <span>GYRO (°/s)</span>
            <strong>
              [{fmt(imu?.gyroDps[0])}, {fmt(imu?.gyroDps[1])}, {fmt(imu?.gyroDps[2])}]
            </strong>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DummySimulatorPanel;
