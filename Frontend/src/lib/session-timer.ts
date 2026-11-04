/**
 * Timestamp-based session timer. Elapsed time is always derived from wall-clock
 * timestamps rather than incremented by an interval, so a slow tab, a paused
 * interval, or a React re-render cannot make the clock drift.
 */

export interface SessionTimerState {
  /** Active milliseconds accumulated before the current run segment. */
  accumulatedMs: number;
  /** Wall-clock start of the current running segment, or null when stopped. */
  startedAt: number | null;
}

export const EMPTY_SESSION_TIMER: SessionTimerState = {
  accumulatedMs: 0,
  startedAt: null,
};

export function sessionElapsedMs(timer: SessionTimerState, now: number): number {
  if (timer.startedAt === null) return Math.max(0, timer.accumulatedMs);
  return Math.max(0, timer.accumulatedMs + Math.max(0, now - timer.startedAt));
}

/** Start (or restart) the timer at zero from `now`. */
export function startSessionTimer(now: number): SessionTimerState {
  return { accumulatedMs: 0, startedAt: now };
}

/** Freeze elapsed time exactly where it is. Safe to call repeatedly. */
export function pauseSessionTimer(timer: SessionTimerState, now: number): SessionTimerState {
  if (timer.startedAt === null) return timer;
  return {
    accumulatedMs: sessionElapsedMs(timer, now),
    startedAt: null,
  };
}

/** Continue from the frozen elapsed time. */
export function resumeSessionTimer(timer: SessionTimerState, now: number): SessionTimerState {
  if (timer.startedAt !== null) return timer;
  return { accumulatedMs: timer.accumulatedMs, startedAt: now };
}

export function resetSessionTimer(): SessionTimerState {
  return { ...EMPTY_SESSION_TIMER };
}

/** Whole elapsed seconds, floored so the display never runs ahead. */
export function sessionSeconds(timer: SessionTimerState, now: number): number {
  return Math.floor(sessionElapsedMs(timer, now) / 1000);
}

/** Rounds are three minutes each; the session UI has three rounds. */
export const ROUND_SECONDS = 180;
export const TOTAL_ROUNDS = 3;

export function sessionRound(seconds: number): number {
  return Math.min(TOTAL_ROUNDS, Math.max(1, Math.floor(seconds / ROUND_SECONDS) + 1));
}
