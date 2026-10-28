import { useEffect, useState, useSyncExternalStore } from "react";
import { sensorSimStore } from "@/lib/sensor-sim/store";
import type { SensorSimState } from "@/lib/sensor-sim/types";

/** Subscribe to the shared mat/dummy event store. */
export function useSensorSim(): SensorSimState {
  return useSyncExternalStore(
    sensorSimStore.subscribe,
    sensorSimStore.getSnapshot,
    sensorSimStore.getSnapshot,
  );
}

/**
 * Coarse clock for relative UI states (active/cooldown windows, durations).
 * Starts at 0 so server and first client render match, then updates on mount.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
