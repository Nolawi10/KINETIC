import { useCallback, useEffect, useState } from "react";
import {
  EMPTY_SESSION_TIMER,
  pauseSessionTimer,
  resetSessionTimer,
  resumeSessionTimer,
  sessionElapsedMs,
  sessionSeconds,
  startSessionTimer,
  type SessionTimerState,
} from "@/lib/session-timer";

/**
 * Live session timer with a 250 ms display tick. The tick only refreshes the
 * render; the value itself is always computed from timestamps, so duplicate
 * intervals and drift are impossible.
 */
export function useSessionTimer() {
  const [timer, setTimer] = useState<SessionTimerState>(EMPTY_SESSION_TIMER);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const start = useCallback(() => {
    const at = Date.now();
    setNow(at);
    setTimer(startSessionTimer(at));
  }, []);

  const pause = useCallback(() => {
    const at = Date.now();
    setNow(at);
    setTimer((current) => pauseSessionTimer(current, at));
  }, []);

  const resume = useCallback(() => {
    const at = Date.now();
    setNow(at);
    setTimer((current) => resumeSessionTimer(current, at));
  }, []);

  const reset = useCallback(() => {
    setNow(Date.now());
    setTimer(resetSessionTimer());
  }, []);

  return {
    timer,
    elapsedMs: sessionElapsedMs(timer, now),
    seconds: sessionSeconds(timer, now),
    start,
    pause,
    resume,
    reset,
  };
}
