import { Footprints, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNow, useSensorSim } from '@/hooks/use-sensor-sim';
import { countersForFilter, formatClock } from '@/lib/sensor-sim/engine';
import { sensorSimStore } from '@/lib/sensor-sim/store';
import {
  INTENSITY_LABELS,
  INTENSITY_LEVELS,
  MAT_SENSORS,
  type MatSensorId,
} from '@/lib/sensor-sim/types';

type SensorState = 'idle' | 'active' | 'cooldown';

function sensorState(lastTs: number | undefined, now: number): SensorState {
  if (!lastTs || now <= 0) return 'idle';
  const age = now - lastTs;
  if (age < 450) return 'active';
  if (age < 1400) return 'cooldown';
  return 'idle';
}

/** Panel A — six-piezo smart mat with manual contacts and footwork playback. */
export function MatSimulatorPanel() {
  const state = useSensorSim();
  const now = useNow(250);
  const counters = countersForFilter(state.counters, state.sourceFilter);
  const sequence = state.sequence?.kind === 'footwork' ? state.sequence : null;

  const matEvents = state.events.filter((event) => event.device === 'MAT');
  const latest = matEvents[0];
  const multiContact =
    matEvents.length > 1 &&
    latest !== undefined &&
    matEvents[1] !== undefined &&
    Math.abs(latest.ts - (matEvents[1]?.ts ?? 0)) < 120;

  const recentSequence = matEvents.slice(0, 7).reverse();

  return (
    <section className="sim-panel" aria-labelledby="mat-sim-title">
      <div className="sim-panel-heading">
        <div>
          <span className="section-index">A // SMART TRAINING MAT</span>
          <h3 id="mat-sim-title">SIX-PIEZO FOOTWORK GRID</h3>
        </div>
        <span className="state-badge" data-active={multiContact}>
          {multiContact ? '● MULTI-SENSOR CONTACT' : '● LISTENING'}
        </span>
      </div>

      <div className="sim-panel-controls">
        <div className="sim-segment" role="group" aria-label="Mat contact intensity">
          {INTENSITY_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className="sim-segment-btn"
              data-active={state.matIntensity === level}
              aria-pressed={state.matIntensity === level}
              onClick={() => sensorSimStore.setIntensity('MAT', level)}
            >
              {INTENSITY_LABELS[level]}
            </button>
          ))}
        </div>
        <div className="sim-control-actions">
          <Button
            size="sm"
            variant="outline"
            onClick={() => sensorSimStore.simulateFootwork()}
            disabled={state.mode !== 'SIMULATION'}
          >
            <Footprints /> Simulate Footwork
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => sensorSimStore.stop()}
            disabled={!state.running}
          >
            <Square /> Stop Simulation
          </Button>
        </div>
      </div>

      <div className="mat-stage">
        <div className="mat-rail" aria-hidden="true">
          <span>FRONT LINE</span>
          <span>REAR LINE</span>
        </div>
        <div className="mat-grid" role="group" aria-label="Smart mat sensors M1 to M6">
          {MAT_SENSORS.map((sensor) => {
            const event = state.latestBySensor[sensor.id];
            const current = sensorState(event?.ts, now);
            const count = counters.bySensor[sensor.id];
            return (
              <button
                key={sensor.id}
                type="button"
                className="mat-sensor"
                data-state={current}
                style={{ gridColumn: sensor.col + 1, gridRow: sensor.row + 1 }}
                aria-label={`Mat sensor ${sensor.id}, ${sensor.placement.toLowerCase()}, ${count} contacts`}
                title={`Trigger a simulated contact on ${sensor.id} (${sensor.placement})`}
                onClick={() => sensorSimStore.triggerMat(sensor.id as MatSensorId)}
              >
                <span className="mat-sensor-id">{sensor.id}</span>
                <span className="mat-sensor-place">{sensor.placement}</span>
                <span className="mat-sensor-value">
                  {event ? Math.round(event.peakAmplitude) : '—'}
                  <small>ADC</small>
                </span>
                <span className="mat-sensor-time">
                  {event ? formatClock(event.ts) : 'NO EVENT'}
                </span>
                <span className="mat-sensor-count">{count} hits</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="sim-stats">
        <span>
          CONTACTS <strong>{counters.mat}</strong>
        </span>
        <span>
          LAST EVENT <strong>{latest ? formatClock(latest.ts) : '—'}</strong>
        </span>
        <span>
          SEQUENCE{' '}
          <strong>{sequence ? `${sequence.remaining}/${sequence.total} QUEUED` : 'IDLE'}</strong>
        </span>
      </div>

      <div className="sim-sequence">
        <span className="micro-label">RECENT CONTACT SEQUENCE</span>
        <div>
          {recentSequence.length ? (
            recentSequence.map((event) => (
              <span key={event.id} data-tone={event.intensity}>
                {event.sensorId}
              </span>
            ))
          ) : (
            <em>Click a sensor or run footwork to generate contacts.</em>
          )}
        </div>
      </div>
    </section>
  );
}
