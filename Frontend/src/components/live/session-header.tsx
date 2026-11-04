import { Cpu, Pause, Play, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/kinetic-data";

export type SessionStatus = "idle" | "running" | "paused" | "ended";

export interface SessionHeaderProps {
  status: SessionStatus;
  seconds: number;
  currentRound: number;
  totalRounds: number;
  roundSeconds: number;
  discipline: string;
  presetTitle?: string | undefined;
  presetTag?: string | undefined;
  presetParameters?: readonly string[] | undefined;
  cameraLabel: string;
  hardwareConnected: boolean;
  classifierOnline: boolean;
  demoActive: boolean;
  demoPaused: boolean;
  saving: boolean;
  onStart: () => void;
  onTogglePause: () => void;
  onRestart: () => void;
  onEnd: () => void;
}

const STATUS_LABELS: Record<SessionStatus, string> = {
  idle: "READY",
  running: "LIVE",
  paused: "PAUSED",
  ended: "COMPLETE",
};

function roundStatus(
  round: number,
  currentRound: number,
  status: SessionStatus,
): string {
  if (status === "idle") return round === 1 ? "READY" : "UP NEXT";
  if (round < currentRound) return "COMPLETE";
  if (round > currentRound) return "UP NEXT";
  if (status === "ended") return "COMPLETE";
  if (status === "paused") return "PAUSED";
  return "IN PROGRESS";
}

/** Section 1 — session status, timer, round information and session controls. */
export function SessionHeader({
  status,
  seconds,
  currentRound,
  totalRounds,
  roundSeconds,
  discipline,
  presetTitle,
  presetTag,
  presetParameters = [],
  cameraLabel,
  hardwareConnected,
  classifierOnline,
  demoActive,
  demoPaused,
  saving,
  onStart,
  onTogglePause,
  onRestart,
  onEnd,
}: SessionHeaderProps) {
  return (
    <section className="session-header" data-state={status} aria-label="Session control">
      <div className="session-header-main">
        <div className="session-state-block">
          <span className="session-state" data-state={status}>
            <i aria-hidden="true" /> {STATUS_LABELS[status]}
          </span>
          <span className="session-state-caption">
            {status === "idle"
              ? "START A SESSION TO OPEN THE CAMERA"
              : status === "ended"
                ? "SESSION CLOSED · DATA RETAINED"
                : status === "paused"
                  ? "TIMER AND DEMOS FROZEN"
                  : "CAMERA, POSE AND DEMOS ACTIVE"}
          </span>
        </div>

        <div className="session-timer-block">
          <span className="session-figure-label">SESSION TIME</span>
          <strong>{formatTime(seconds)}</strong>
        </div>

        <div className="session-round-block">
          <span className="session-figure-label">ROUND</span>
          <strong>
            {currentRound}
            <small> / {totalRounds}</small>
          </strong>
          <span className="session-figure-sub">
            {discipline} · {Math.round(roundSeconds / 60)} MIN ROUNDS
          </span>
        </div>

        <div className="session-controls">
          {status === "idle" ? (
            <Button variant="default" onClick={onStart}>
              <Play size={16} /> Start Session
            </Button>
          ) : (
            <Button variant="outline" onClick={onTogglePause} disabled={status === "ended"}>
              {status === "paused" ? <Play size={16} /> : <Pause size={16} />}
              {status === "paused" ? "Resume" : "Pause"}
            </Button>
          )}
          <Button variant="outline" onClick={onRestart}>
            <RotateCcw size={16} /> Restart
          </Button>
          <Button
            variant="destructive"
            onClick={onEnd}
            disabled={saving || status === "idle" || status === "ended"}
          >
            <Square size={16} /> {saving ? "Saving…" : "End"}
          </Button>
        </div>
      </div>

      <div className="session-status-row">
        <span className="session-status-pill" data-tone={classifierOnline ? "ok" : "idle"}>
          <i aria-hidden="true" /> {classifierOnline ? "STRIKE CLASSIFIER ONLINE" : "STRIKE CLASSIFIER OFFLINE"}
        </span>
        <span className="session-status-pill" data-tone={hardwareConnected ? "ok" : "idle"}>
          <Cpu size={12} /> {hardwareConnected ? "ESP8266 CONNECTED" : "ESP8266 DISCONNECTED"}
        </span>
        <span className="session-status-pill" data-tone={cameraLabel === "STANDBY" ? "idle" : "ok"}>
          <i aria-hidden="true" /> CAMERA {cameraLabel}
        </span>
        {demoActive ? (
          <span className="session-status-pill" data-tone="demo">
            <i aria-hidden="true" /> GUIDED DEMONSTRATION{demoPaused ? " PAUSED" : " ACTIVE"}
          </span>
        ) : (
          <span className="session-status-pill" data-tone="idle">
            <i aria-hidden="true" /> GUIDED DEMONSTRATION IDLE
          </span>
        )}
      </div>

      {presetTitle ? (
        <div className="session-preset-band">
          <span className="session-figure-label">ACTIVE PRESET // {presetTag ?? "PROTOCOL"}</span>
          <strong>{presetTitle}</strong>
          {presetParameters.length ? (
            <div className="session-preset-tags">
              {presetParameters.map((parameter) => (
                <span key={parameter}>{parameter}</span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="round-track" aria-label="Round progress">
        {Array.from({ length: totalRounds }, (_, index) => index + 1).map((round) => {
          const state = roundStatus(round, currentRound, status);
          return (
            <div
              key={round}
              data-active={status !== "idle" && currentRound === round}
              data-complete={state === "COMPLETE"}
            >
              <span>ROUND 0{round}</span>
              <strong>{state}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default SessionHeader;
