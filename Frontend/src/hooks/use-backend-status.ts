import { useSyncExternalStore } from 'react';
import { apiClient, API_DISPLAY_URL, type HealthResponse } from '@/lib/api-client';

export type BackendState = 'checking' | 'online' | 'offline';

export interface BackendStatus {
  /** Reachability of the Flask API (`/api/health`). */
  state: BackendState;
  /** Number of trained models reported by `/api/health` (0 while offline). */
  models: number;
  /** Base URL the client talks to, useful for tooltips/debugging. */
  apiUrl: string;
}

interface BackendSnapshot {
  state: BackendState;
  models: number;
}

/** Pure label formatter so footer copy is testable without rendering. */
export function formatBackendStatus({ state, models }: Pick<BackendStatus, 'state' | 'models'>): string {
  if (state === 'checking') return 'API: CONNECTING…';
  if (state === 'offline') return 'API: OFFLINE';
  return `API: ONLINE · ${models} MODEL${models === 1 ? '' : 'S'}`;
}

/** Landing-page wording ("STATUS: …"), kept separate from the footer chip. */
export function formatLandingStatus(state: BackendState): string {
  if (state === 'checking') return 'STATUS: CONNECTING…';
  if (state === 'offline') return 'STATUS: API OFFLINE';
  return 'STATUS: API ONLINE';
}

const POLL_INTERVAL_MS = 20_000;
const INITIAL_SNAPSHOT: BackendSnapshot = { state: 'checking', models: 0 };

/**
 * One module-level poller shared by every screen. The previous version created
 * an independent interval (and two sequential requests) per mounted hook, so
 * navigating between the landing page and the tactical shell restarted the
 * connection check each time. This store:
 *
 *   - keeps the last known state across SPA navigation (no CONNECTING flash),
 *   - makes a single `/api/health` request per poll,
 *   - pauses polling while the tab is hidden,
 *   - re-checks immediately when the tab becomes visible again,
 *   - deduplicates concurrent checks.
 */
let snapshot: BackendSnapshot = INITIAL_SNAPSHOT;
const listeners = new Set<() => void>();
let pollTimer: number | null = null;
let started = false;
let refreshing = false;
let lastRefreshAt = 0;
const MIN_REFRESH_GAP_MS = 1_000;

function emit(next: BackendSnapshot): void {
  if (next.state === snapshot.state && next.models === snapshot.models) return;
  snapshot = next;
  for (const listener of listeners) listener();
}

async function modelCount(health: HealthResponse): Promise<number> {
  if (typeof health.models === 'number') return health.models;
  try {
    return (await apiClient.listModels()).count;
  } catch {
    return snapshot.models;
  }
}

async function refresh(force = false): Promise<void> {
  if (refreshing) return;
  // React StrictMode mounts effects twice in dev; don't double the first poll.
  if (!force && Date.now() - lastRefreshAt < MIN_REFRESH_GAP_MS) return;
  refreshing = true;
  lastRefreshAt = Date.now();
  try {
    const health = await apiClient.healthCheck();
    emit({ state: 'online', models: await modelCount(health) });
  } catch {
    emit({ state: 'offline', models: 0 });
  } finally {
    refreshing = false;
  }
}

function stopTimer(): void {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startTimer(): void {
  stopTimer();
  if (document.hidden) return;
  pollTimer = window.setInterval(() => {
    void refresh();
  }, POLL_INTERVAL_MS);
}

function handleVisibilityChange(): void {
  if (document.hidden) {
    stopTimer();
  } else {
    startTimer();
    void refresh(true);
  }
}

function start(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  document.addEventListener('visibilitychange', handleVisibilityChange);
  void refresh();
  startTimer();
}

function stop(): void {
  if (!started) return;
  started = false;
  stopTimer();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

function getSnapshot(): BackendSnapshot {
  return snapshot;
}

function getServerSnapshot(): BackendSnapshot {
  return INITIAL_SNAPSHOT;
}

/** Live backend status from the shared connection store. */
export function useBackendStatus(): BackendStatus {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { state: current.state, models: current.models, apiUrl: API_DISPLAY_URL };
}
