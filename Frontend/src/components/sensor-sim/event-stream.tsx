import { useSensorSim } from "@/hooks/use-sensor-sim";
import { formatClock } from "@/lib/sensor-sim/engine";
import { DEVICE_LABELS, INTENSITY_LABELS } from "@/lib/sensor-sim/types";
import type { SensorEvent, SourceFilter } from "@/lib/sensor-sim/types";

const SOURCE_LABELS: Record<string, string> = {
  guided_demonstration: "GUIDED DEMO",
  camera_inference: "VISION AI",
  hardware_telemetry: "HARDWARE",
  HARDWARE: "HARDWARE",
  SIMULATED: "SIMULATED",
};

const FILTER_LABELS: Record<SourceFilter, string> = {
  ALL: "ALL SOURCES",
  guided_demonstration: "GUIDED DEMO",
  camera_inference: "VISION AI",
  hardware_telemetry: "HARDWARE",
  SIMULATED: "SIMULATED",
  HARDWARE: "HARDWARE",
};

function sourceKey(source: SensorEvent["source"]): string {
  if (source === "hardware_telemetry" || source === "HARDWARE") return "hardware";
  if (source === "guided_demonstration") return "demo";
  if (source === "camera_inference") return "camera";
  return "simulated";
}

export default function EventStream() {
  const state = useSensorSim();
  const { events, sourceFilter } = state;

  const filtered =
    sourceFilter === "ALL"
      ? events
      : events.filter((event: SensorEvent) => {
          if (sourceFilter === "HARDWARE") {
            return event.source === "HARDWARE" || event.source === "hardware_telemetry";
          }
          return event.source === sourceFilter;
        });

  return (
    <section className="live-panel timeline-panel" aria-label="Event timeline">
      <div className="timeline-toolbar">
        <span className="timeline-filter-state">SHOWING {FILTER_LABELS[sourceFilter]}</span>
        <span className="state-badge">{filtered.length} EVENTS</span>
      </div>

      <p className="timeline-caption">
        Newest first. Guided demonstration and pose events are shown for context and are never
        counted as verified strikes.
      </p>

      {filtered.length ? (
        <div className="timeline-list" role="list">
          {filtered.slice(0, 40).map((event: SensorEvent) => {
            const key = sourceKey(event.source);
            return (
              <article
                key={event.id}
                className="timeline-row"
                data-source={key}
                role="listitem"
              >
                <time dateTime={event.timestamp} title={new Date(event.timestamp).toISOString()}>
                  {formatClock(event.ts)}
                </time>
                <span className="timeline-marker" aria-hidden="true" />
                <div className="timeline-content">
                  <div className="timeline-title">
                    <span className="timeline-source" data-source={key}>
                      {SOURCE_LABELS[event.source] ?? event.source}
                    </span>
                    <strong>{event.movementLabel || event.sensorId.replace("_", " ")}</strong>
                    <span className="timeline-device">{DEVICE_LABELS[event.device]}</span>
                  </div>
                  <div className="timeline-detail">
                    <span>{event.eventType.toUpperCase()}</span>
                    <span>{INTENSITY_LABELS[event.intensity]?.toUpperCase() ?? event.intensity}</span>
                    <span>{Math.round(event.peakAmplitude)} ADC</span>
                    <span>{event.durationMs} ms</span>
                  </div>
                </div>
                <span className="timeline-zone">{event.sensorId.replace("_", " ")}</span>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="timeline-empty">
          <strong>No events in this category yet.</strong>
          <p>
            Start a session to run the guided demonstrations, or tap a dummy zone / mat sensor to
            generate a simulated event.
          </p>
        </div>
      )}
    </section>
  );
}
