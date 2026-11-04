import { Activity, Flame, Swords, Timer, Zap } from "lucide-react";
import { Instrument } from "@/components/tactical-shell";
import { useNow } from "@/hooks/use-sensor-sim";
import { useVerifiedStrikes } from "@/hooks/use-verified-strikes";
import { formatClock } from "@/lib/sensor-sim/engine";
import {
  STRIKE_LABELS,
  STRIKE_TYPES,
  activeComboStreak,
  type StrikeType,
} from "@/lib/strike-recognition";

function sourceLabel(source: string): string {
  return source === "camera_inference" ? "VISION AI" : "HARDWARE";
}

/** 1. Live counter for verified strikes only. */
export function LiveStrikeCounter() {
  const state = useVerifiedStrikes();
  const latest = state.lastStrike;

  return (
    <Instrument
      title="LIVE STRIKE COUNTER"
      tag={state.classifier.available ? "VERIFIED" : "CLASSIFIER OFFLINE"}
    >
      {latest ? (
        <div className="strike-notification" key={latest.id} role="status" aria-live="polite">
          <span>1×</span> {STRIKE_LABELS[latest.type]}
        </div>
      ) : (
        <div className="strike-idle">AWAITING VERIFIED STRIKE</div>
      )}

      <div className="strike-number">
        {state.strikes.length}
        <Activity />
      </div>

      <div className="strike-tags">
        {STRIKE_TYPES.map((type) => (
          <span key={type} data-active={latest?.type === type}>
            {STRIKE_LABELS[type]} <b>{state.totals[type]}</b>
          </span>
        ))}
      </div>

      <div className="hud-status" data-online={state.classifier.available}>
        <span className="hud-dot" />
        {state.classifier.available ? "CLASSIFIER ONLINE" : "NO VERIFIED CLASSIFIER"}
      </div>

      {!state.classifier.available && (
        <p className="metric-note">
          Real strike recognition is not yet available. BlazePose landmarks are not counted as
          punches, and guided demonstration events are excluded from this counter.
        </p>
      )}
    </Instrument>
  );
}

/** 2. Animated combo notifications with a two-second combination window. */
export function StrikeComboHud() {
  const state = useVerifiedStrikes();

  return (
    <Instrument title="STRIKE COMBO HUD" tag="2-SECOND WINDOW">
      {state.lastCombo ? (
        <div className="combo-notification" key={state.lastCombo.id} role="status" aria-live="polite">
          <Swords />
          <div>
            <strong>{state.lastCombo.label}</strong>
            <span>
              {state.lastCombo.strikes.map((type) => STRIKE_LABELS[type]).join(" → ")}
            </span>
          </div>
        </div>
      ) : (
        <div className="combo-idle">
          <Swords />
          <span>AWAITING VERIFIED COMBINATION</span>
        </div>
      )}

      <div className="combo-stats">
        <div>
          <span>COMBOS</span>
          <strong>{state.comboTotal}</strong>
        </div>
        <div>
          <span>STREAK</span>
          <strong>{state.streak}</strong>
        </div>
        <div>
          <span>BEST</span>
          <strong>{state.bestStreak}</strong>
        </div>
      </div>

      <div className="combo-history">
        <span className="micro-label">RECENT COMBINATIONS</span>
        {state.combos.length ? (
          state.combos.slice(0, 4).map((combo) => (
            <div key={combo.id}>
              <strong>{combo.label}</strong>
              <span>{formatClock(combo.endedAt)}</span>
            </div>
          ))
        ) : (
          <em>No verified combinations yet.</em>
        )}
      </div>
    </Instrument>
  );
}

/** 3. Recent verified strike history with type, source and timestamp. */
export function RecentStrikeHistory() {
  const state = useVerifiedStrikes();

  return (
    <Instrument title="RECENT STRIKE HISTORY" tag="VERIFIED ONLY">
      {state.strikes.length ? (
        <ol className="strike-history">
          {state.strikes.slice(0, 8).map((strike) => (
            <li key={strike.id}>
              <span className="strike-history-type">{STRIKE_LABELS[strike.type]}</span>
              <span className="strike-history-source">{sourceLabel(strike.source)}</span>
              <time dateTime={strike.timestamp}>{formatClock(strike.ts)}</time>
            </li>
          ))}
        </ol>
      ) : (
        <p className="metric-note">
          NO VERIFIED STRIKES THIS SESSION. Guided demonstration hits and pose landmarks are not
          recorded as real strikes.
        </p>
      )}
    </Instrument>
  );
}

/** 4. Velocity and power, shown only when the classifier reports real values. */
export function VelocityPower() {
  const state = useVerifiedStrikes();
  const velocities = state.strikes
    .map((strike) => strike.velocityMps)
    .filter((value): value is number => value !== undefined);
  const powers = state.strikes
    .map((strike) => strike.powerW)
    .filter((value): value is number => value !== undefined);
  const maxVelocity = velocities.length ? Math.max(...velocities) : null;
  const maxPower = powers.length ? Math.max(...powers) : null;

  return (
    <Instrument title="VELOCITY & POWER" tag="CLASSIFIER REPORTED">
      <div className="gauge-value">
        <span>Peak strike velocity</span>
        <strong>
          {maxVelocity === null ? "NOT AVAILABLE" : maxVelocity.toFixed(1)}
          {maxVelocity !== null && <small>m/s</small>}
        </strong>
      </div>
      <div className="gauge-value">
        <span>Peak reported power</span>
        <strong>
          {maxPower === null ? "NOT AVAILABLE" : Math.round(maxPower)}
          {maxPower !== null && <small>W</small>}
        </strong>
      </div>
      <p className="metric-note">
        {maxVelocity === null && maxPower === null
          ? "No validated velocity or power source is connected. Values are never estimated from pose."
          : "Reported directly by the verified classifier or validated hardware inference."}
      </p>
    </Instrument>
  );
}

/** 5. Combo streak with automatic expiry when the window closes. */
export function ComboStreak() {
  const state = useVerifiedStrikes();
  const now = useNow(250);
  const streak = activeComboStreak(state, now || Date.now());

  return (
    <Instrument title="COMBO STREAK" tag="2-SECOND WINDOW">
      <div className="combo-number">
        <Flame />
        {streak}
        <small>COMBOS IN A ROW</small>
      </div>
      <div className="combo-stats">
        <div>
          <span>BEST STREAK</span>
          <strong>{state.bestStreak}</strong>
        </div>
        <div>
          <span>COMBOS</span>
          <strong>{state.comboTotal}</strong>
        </div>
        <div>
          <span>STRIKES</span>
          <strong>{state.strikes.length}</strong>
        </div>
      </div>
    </Instrument>
  );
}

/** Small reusable badge for the session header. */
export function VerifiedStrikeStatus() {
  const state = useVerifiedStrikes();
  return (
    <span className="state-badge" data-online={state.classifier.available}>
      {state.classifier.available ? <Zap size={12} /> : <Timer size={12} />}
      {state.classifier.available ? "VERIFIED STRIKES ONLINE" : "STRIKE CLASSIFIER OFFLINE"}
    </span>
  );
}

export type { StrikeType };
