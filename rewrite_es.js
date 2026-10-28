const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/components/sensor-sim/event-stream.tsx';
const s = `import { useSensorSim } from '@/hooks/use-sensor-sim';
import { DEVICE_LABELS, INTENSITY_LABELS } from '@/lib/sensor-sim/types';
import type { SensorEvent } from '@/lib/sensor-sim/types';

export default function EventStream() {
  const { state, actions } = useSensorSim();
  const { events, sourceFilter } = state;

  const filtered = sourceFilter === 'ALL' ? events : events.filter((event) => event.source === sourceFilter);

  return (
    <section className="sim-stream">
      <header className="sim-stream-header">
        <div>
          <span className="section-index">IMPACT EVENT STREAM</span>
          <h3>Live hit log</h3>
          <p>Newest events first. Filter by source.</p>
        </div>
        <div className="sim-stream-filters">
          {(['ALL', 'SIMULATED', 'HARDWARE'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              className={\`sim-chip \${sourceFilter === filter ? 'sim-chip-active' : ''}\`}
              onClick={() => actions.setSourceFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </header>
      <div className="sim-stream-body">
        {filtered.length ? (
          <table className="sim-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Device</th>
                <th>Zone</th>
                <th>Type</th>
                <th>Peak</th>
                <th>Duration</th>
                <th>Intensity</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 40).map((event: SensorEvent) => (
                <tr key={event.id}>
                  <td>{new Date(event.timestamp).toLocaleTimeString()}</td>
                  <td>
                    <span className="sim-device-badge" data-device={event.device}>
                      {event.device}
                    </span>
                    <small>{DEVICE_LABELS[event.device]}</small>
                  </td>
                  <td className="accent-cyan">{event.sensorId.replace('_', ' ')}</td>
                  <td>{event.eventType.toUpperCase()}</td>
                  <td>{Math.round(event.peakAmplitude)}</td>
                  <td>{event.durationMs} ms</td>
                  <td>{INTENSITY_LABELS[event.intensity].toUpperCase()}</td>
                  <td>
                    <span className="sim-source-badge" data-source={event.source}>
                      {event.source}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="sim-empty sim-empty-inline">
            <strong>No events yet.</strong>
          </div>
        )}
      </div>
    </section>
  );
}
`;
fs.writeFileSync(p,s,'utf8');
console.log('ok');
