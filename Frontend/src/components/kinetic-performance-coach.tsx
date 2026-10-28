import { useEffect, useState } from "react";
import { Brain, AlertTriangle, CheckCircle, Target } from "lucide-react";
import { Instrument } from "@/components/tactical-shell";

interface CoachState {
  currentInstruction: string;
  recentEvent: string;
  strengths: string[];
  improvements: string[];
  nextAction: string;
  progress: string;
  confidence: number;
  warnings: string[];
}

interface SessionState {
  running: boolean;
  paused: boolean;
  count: number;
  seconds: number;
  events: Array<{ zone: string; timestamp: number }>;
}

export default function KineticPerformanceCoach({ sessionState }: { sessionState: SessionState }) {
  const [coach, setCoach] = useState<CoachState>({
    currentInstruction: "Begin your session when ready.",
    recentEvent: "No events yet",
    strengths: [],
    improvements: [],
    nextAction: "Start training",
    progress: "0%",
    confidence: 0.8,
    warnings: [],
  });
  const [muted, setMuted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Simple coach logic based on session state
    const updateCoach = () => {
      const events = sessionState?.events || [];
      const seconds = sessionState?.seconds || 0;
      const count = sessionState?.count || 0;

      if (events.length > 0) {
        const lastEvent = events[events.length - 1];
        setCoach((prev) => ({
          ...prev,
          recentEvent: `Event at ${lastEvent}s`,
          strengths: count > 10 ? ["Good activity level"] : prev.strengths,
          improvements: count < 5 && seconds > 60 ? ["Increase engagement"] : prev.improvements,
          nextAction: seconds % 60 < 10 ? "Focus on form" : "Continue training",
          progress: `${Math.min(100, Math.floor((count / 50) * 100))}%`,
          currentInstruction:
            count > 20 ? "Maintain intensity and focus on technique." : "Keep up the good work.",
        }));
      } else {
        setCoach((prev) => ({
          ...prev,
          recentEvent: "No events yet",
          currentInstruction:
            seconds < 10
              ? "Get in position and begin your drill."
              : "Start your training sequence.",
          nextAction: "Begin first repetition",
        }));
      }
    };

    updateCoach();
    const interval = setInterval(updateCoach, 2000);
    return () => clearInterval(interval);
  }, [sessionState]);

  if (collapsed) {
    return (
      <Instrument title="PERFORMANCE COACH" tag="AI ASSIST">
        <button onClick={() => setCollapsed(false)} style={{ width: "100%", padding: "4px" }}>
          Expand Coach
        </button>
      </Instrument>
    );
  }

  return (
    <Instrument title="PERFORMANCE COACH" tag="AI ASSIST">
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
            Confidence: <strong>{Math.round(coach.confidence * 100)}%</strong>
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
