import { useMemo, useState } from "react";
import { Brain, AlertTriangle, CheckCircle, Target } from "lucide-react";
import { Instrument } from "@/components/tactical-shell";
import { formatClock } from "@/lib/sensor-sim/engine";

interface SessionState {
  running: boolean;
  paused: boolean;
  count: number;
  seconds: number;
  events: Array<{ zone: string; timestamp: number }>;
  classifierAvailable?: boolean;
}

interface CoachView {
  currentInstruction: string;
  recentEvent: string;
  strengths: string[];
  improvements: string[];
  nextAction: string;
  progress: string;
  warnings: string[];
}

/**
 * Coaching panel driven only by verified strikes. When the classifier is not
 * connected it says so instead of inventing feedback from pose landmarks or
 * guided demonstration events.
 */
function buildCoachView(sessionState: SessionState): CoachView {
  const events = sessionState.events ?? [];
  const seconds = sessionState.seconds ?? 0;
  const count = sessionState.count ?? 0;
  const classifierAvailable = sessionState.classifierAvailable ?? false;
  const lastEvent = events.length > 0 ? events[events.length - 1] : undefined;

  const strengths: string[] = [];
  const improvements: string[] = [];
  const warnings: string[] = [];

  if (!classifierAvailable) {
    warnings.push(
      "Verified strike classifier offline — pose landmarks and guided demos are not counted.",
    );
  }

  if (classifierAvailable && count > 10) strengths.push("Sustained verified strike volume");
  if (classifierAvailable && count >= 5 && count <= 10) {
    strengths.push("Consistent verified strike output");
  }
  if (classifierAvailable && count < 5 && seconds > 60) {
    improvements.push("Increase verified strike output — keep hands active");
  }
  if (sessionState.paused) warnings.push("Session paused — timer and demonstrations are frozen.");

  let currentInstruction: string;
  let nextAction: string;
  let progress: string;

  if (!classifierAvailable) {
    currentInstruction = sessionState.running
      ? "Session is running, but real strike recognition is not yet available."
      : "Real strike recognition is not yet available.";
    nextAction = "Connect a verified strike classifier to unlock strike and combo scoring";
    progress = "N/A";
  } else if (!sessionState.running && !sessionState.paused) {
    currentInstruction = "Begin your session when ready.";
    nextAction = "Start training";
    progress = "0%";
  } else if (count === 0) {
    currentInstruction =
      seconds < 10
        ? "Get in position and begin your drill."
        : "Start your training sequence — awaiting the first verified strike.";
    nextAction = "Begin first verified repetition";
    progress = "0%";
  } else {
    currentInstruction =
      count > 20
        ? "Maintain intensity and focus on technique."
        : "Keep up the good work — verified strikes are registering.";
    nextAction = seconds % 60 < 10 ? "Focus on form" : "Continue training";
    progress = `${Math.min(100, Math.floor((count / 50) * 100))}%`;
  }

  return {
    currentInstruction,
    recentEvent: lastEvent
      ? `${lastEvent.zone} at ${formatClock(lastEvent.timestamp)}`
      : classifierAvailable
        ? "No verified strikes yet"
        : "Verified strike recognition unavailable",
    strengths,
    improvements,
    nextAction,
    progress,
    warnings,
  };
}

export default function KineticPerformanceCoach({ sessionState }: { sessionState: SessionState }) {
  const [muted, setMuted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const coach = useMemo(() => buildCoachView(sessionState), [sessionState]);

  if (collapsed) {
    return (
      <Instrument title="PERFORMANCE COACH" tag="VERIFIED DATA">
        <button onClick={() => setCollapsed(false)} style={{ width: "100%", padding: "4px" }}>
          Expand Coach
        </button>
      </Instrument>
    );
  }

  return (
    <Instrument title="PERFORMANCE COACH" tag="VERIFIED DATA">
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <Brain size={14} />
            <strong>Instruction</strong>
          </div>
          <p
            style={{
              margin: 0,
              padding: "6px",
              background: "rgba(59, 130, 246, 0.1)",
              borderRadius: "4px",
            }}
          >
            {coach.currentInstruction}
          </p>
        </div>

        <div>
          <strong>Recent Event:</strong> {coach.recentEvent}
        </div>

        {coach.strengths.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <CheckCircle size={14} color="#22c55e" />
              <strong>Strengths</strong>
            </div>
            <ul style={{ margin: 0, paddingLeft: "18px" }}>
              {coach.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {coach.improvements.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <Target size={14} color="#f59e0b" />
              <strong>Improvements</strong>
            </div>
            <ul style={{ margin: 0, paddingLeft: "18px" }}>
              {coach.improvements.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <strong>Next Action:</strong> {coach.nextAction}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>
            Progress: <strong>{coach.progress}</strong>
          </span>
          <span>
            Data: <strong>{sessionState.classifierAvailable ? "VERIFIED" : "UNAVAILABLE"}</strong>
          </span>
        </div>

        {coach.warnings.length > 0 && (
          <div
            style={{ padding: "6px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "4px" }}
          >
            {coach.warnings.map((w, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <AlertTriangle size={12} color="#ef4444" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={() => setMuted(!muted)}
            style={{ flex: 1, padding: "4px", fontSize: "11px" }}
          >
            {muted ? "Unmute Coach" : "Mute Coach"}
          </button>
          <button
            onClick={() => setCollapsed(true)}
            style={{ flex: 1, padding: "4px", fontSize: "11px" }}
          >
            Collapse
          </button>
        </div>
      </div>
    </Instrument>
  );
}
