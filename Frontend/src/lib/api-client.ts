const configuredApiUrl: string | undefined = import.meta.env["VITE_API_URL"];
const DEFAULT_LOCAL_API = "http://localhost:5000";
const normalizedApiUrl = configuredApiUrl?.replace(/\/+$/, "");
const targetsLocalFlask =
  !normalizedApiUrl ||
  normalizedApiUrl === DEFAULT_LOCAL_API ||
  normalizedApiUrl === "http://127.0.0.1:5000";

/**
 * In the browser during dev we talk to Vite on the same origin, and Vite proxies
 * the Flask endpoints listed in `vite.config.ts`. That removes CORS preflights
 * and a second TCP origin from every poll. A custom `VITE_API_URL` is always
 * respected; SSR and production builds talk to Flask directly.
 */
export const API_URL: string =
  targetsLocalFlask && import.meta.env.DEV && typeof window !== "undefined"
    ? ""
    : normalizedApiUrl || DEFAULT_LOCAL_API;

/** Human-readable backend address for tooltips/debugging (never the proxy path). */
export const API_DISPLAY_URL: string = normalizedApiUrl || DEFAULT_LOCAL_API;

export interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
  /** Number of model files on disk. Newer backends include this so the UI
   *  needs only one request per poll instead of health + models. */
  models?: number;
  models_loaded?: number;
}

export interface ModelsResponse {
  models: string[];
  count: number;
}

export interface TrainingSession {
  id: string;
  created_at: string;
  discipline: string;
  duration_seconds: number;
  strikes: number;
  max_speed: number;
  simulated: boolean;
  user_id?: string;
}

export interface PredictionRequest {
  model: string;
  features: number[];
}

export interface PredictionResponse {
  prediction: number;
  probability?: number;
  model: string;
}

export interface CoachingPreset {
  id: string;
  title: string;
  tag: string;
  tone: string;
  discipline: string;
  parameters: string[];
}

export interface RequestOptions extends RequestInit {
  /** Abort the request after this many milliseconds. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const PROBE_TIMEOUT_MS = 4_000;
const MODELS_TTL_MS = 60_000;

function isErrorPayload(value: unknown): value is { error: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error?: unknown }).error === "string"
  );
}

export class ApiClient {
  private baseUrl: string;
  private healthInFlight: Promise<HealthResponse> | null = null;
  private modelsInFlight: Promise<ModelsResponse> | null = null;
  private modelsCache: { data: ModelsResponse; expiresAt: number } | null = null;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = options;
    const controller = new AbortController();
    const outerSignal = init.signal ?? null;
    let timedOut = false;

    const abortFromOuter = () => controller.abort();
    if (outerSignal) {
      if (outerSignal.aborted) controller.abort();
      else outerSignal.addEventListener("abort", abortFromOuter, { once: true });
    }

    const timer = globalThis.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    // Content-Type is only meaningful (and only safe for CORS) when we send a
    // body. Sending `application/json` on a GET turns a simple request into a
    // preflighted one, doubling every health poll.
    const headers = new Headers(init.headers);
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    if (init.body !== undefined && init.body !== null && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    // Defensively collapse any accidental `/api/api/...` from cached bundles/HMR.
    let normalizedEndpoint = endpoint.replace(/^(\/api)+\//i, "/api/");
    if (this.baseUrl.endsWith("/api") && normalizedEndpoint.startsWith("/api/")) {
      normalizedEndpoint = normalizedEndpoint.slice(4) || "/";
    }

    try {
      const response = await fetch(`${this.baseUrl}${normalizedEndpoint}`, {
        ...init,
        headers,
        cache: init.cache ?? "no-store",
        signal: controller.signal,
      });

      const text = await response.text();
      let payload: unknown = null;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = null;
        }
      }

      if (!response.ok) {
        throw new Error(
          isErrorPayload(payload) ? payload.error : `API request failed (${response.status})`,
        );
      }

      if (!text) return undefined as T;
      if (payload === null) throw new Error("API returned an invalid JSON response");
      return payload as T;
    } catch (error) {
      if (timedOut) throw new Error(`KINETIC API timed out after ${timeoutMs} ms`);
      throw error;
    } finally {
      globalThis.clearTimeout(timer);
      outerSignal?.removeEventListener("abort", abortFromOuter);
    }
  }

  async healthCheck(): Promise<HealthResponse> {
    // Deduplicate polls: a page can mount several status consumers at once.
    if (!this.healthInFlight) {
      this.healthInFlight = this.request<HealthResponse>("/api/health", {
        timeoutMs: PROBE_TIMEOUT_MS,
      }).finally(() => {
        this.healthInFlight = null;
      });
    }
    return this.healthInFlight;
  }

  async listModels(force = false): Promise<ModelsResponse> {
    const now = Date.now();
    if (!force && this.modelsCache && this.modelsCache.expiresAt > now) {
      return this.modelsCache.data;
    }
    if (!this.modelsInFlight) {
      this.modelsInFlight = this.request<ModelsResponse>("/api/models", {
        timeoutMs: PROBE_TIMEOUT_MS,
      })
        .then((data) => {
          this.modelsCache = { data, expiresAt: Date.now() + MODELS_TTL_MS };
          return data;
        })
        .finally(() => {
          this.modelsInFlight = null;
        });
    }
    return this.modelsInFlight;
  }

  async predict(data: PredictionRequest): Promise<PredictionResponse> {
    return this.request("/api/predict", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getTrainingSessions(params?: {
    range?: string;
    discipline?: string;
  }): Promise<{ sessions: TrainingSession[]; count: number }> {
    const queryParams = new URLSearchParams();
    if (params?.range) queryParams.append("range", params.range);
    if (params?.discipline) queryParams.append("discipline", params.discipline);

    const endpoint = `/api/training-sessions${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    return this.request(endpoint);
  }

  async saveTrainingSession(data: Omit<TrainingSession, "id" | "created_at">): Promise<{
    message: string;
    session: TrainingSession;
  }> {
    return this.request("/api/training-sessions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async analyzeSparring(data: {
    video_url?: string;
    frames?: Array<{ time: number; image: string }>;
  }): Promise<{ analysis: string; insights: string[] }> {
    return this.request("/api/analyze-sparring", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async receiveTelemetry(data: {
    timestamp: number;
    impact_zone?: string;
    force?: number;
    imu_data?: Record<string, unknown>;
    pose_data?: Record<string, unknown>;
  }): Promise<{ status: string; timestamp: string }> {
    return this.request("/api/telemetry", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getCoachingPresets(): Promise<{ presets: CoachingPreset[] }> {
    return this.request("/api/coaching-presets");
  }

  /** Drop cached responses (used by tests and manual refresh). */
  clearCache(): void {
    this.modelsCache = null;
    this.modelsInFlight = null;
    this.healthInFlight = null;
  }
}

export const apiClient = new ApiClient();
