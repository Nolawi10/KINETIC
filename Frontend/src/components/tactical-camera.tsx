import { useCallback, useEffect, useRef, useState } from "react";
import { drawPoseCanvas, loadPoseEngine, type NormalizedLandmarkLike } from "@/lib/pose-engine";
import { KneeRomTracker, readPose } from "@/lib/pose-telemetry";
import { Button } from "./ui/button";
import { Camera, ScanLine, AlertCircle, RefreshCw, Radio } from "lucide-react";

export type CameraProvider = "webcam" | "picamera";
export type FeedStatus = "standby" | "connecting" | "live" | "unavailable";
export type EngineState = "idle" | "loading" | "tracking" | "lost" | "unavailable";

/** Live camera telemetry published to the page shell (never fabricated). */
export interface CameraTelemetry {
  feed: FeedStatus;
  provider: CameraProvider;
  resolution: string;
  engine: EngineState;
  poseFps: number;
}

interface LegAngles {
  kneeL: number;
  kneeR: number;
  hipL: number;
  hipR: number;
  conf: number;
  rom: number;
}

interface CameraStatusResponse {
  available: boolean;
  running: boolean;
  source: string;
  width?: number;
  height?: number;
  fps?: number;
}

export function TacticalCamera({
  enabled = true,
  paused = false,
  compact = false,
  preferredProvider,
  onProviderChange,
  onTelemetry,
}: {
  /** A session must be running or paused before any camera device is opened. */
  enabled?: boolean;
  paused?: boolean;
  compact?: boolean;
  preferredProvider?: CameraProvider | undefined;
  onProviderChange?: (provider: CameraProvider) => void;
  /** Optional observer for the real feed/pose telemetry shown around the page. */
  onTelemetry?: (telemetry: CameraTelemetry) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const genRef = useRef(0);
  const lastTsRef = useRef(0);

  const [provider, setProvider] = useState<CameraProvider>(preferredProvider || "webcam");
  const [providerResolved, setProviderResolved] = useState(false);
  const [piCameraAvailable, setPiCameraAvailable] = useState(false);
  const [piCameraDetails, setPiCameraDetails] = useState<CameraStatusResponse | null>(null);
  const [feed, setFeed] = useState<FeedStatus>(enabled ? "connecting" : "standby");
  const [errorMessage, setErrorMessage] = useState("");
  const [resolution, setResolution] = useState("");
  const [pose, setPose] = useState(true);
  const [tick, setTick] = useState(0);
  const [engine, setEngine] = useState<EngineState>("idle");
  const [legs, setLegs] = useState<LegAngles | null>(null);
  const [poseFps, setPoseFps] = useState(0);

  // Publish honest camera telemetry so the surrounding page never has to guess.
  useEffect(() => {
    onTelemetry?.({ feed, provider, resolution, engine, poseFps });
  }, [feed, provider, resolution, engine, poseFps, onTelemetry]);

  // Sync with prop if passed
  useEffect(() => {
    if (preferredProvider && preferredProvider !== provider) {
      setProvider(preferredProvider);
    }
  }, [preferredProvider]);

  // Probe the backend before opening *any* camera. On a Pi this prevents the
  // browser webcam from racing Picamera2 for the same physical sensor.
  useEffect(() => {
    let active = true;
    const checkPiCamera = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch("/api/camera/status", { signal: controller.signal });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data: CameraStatusResponse = await res.json();
        if (!active) return;
        setPiCameraDetails(data);
        const isPiService = Boolean(data.available && data.source === "raspberry_pi_camera");
        setPiCameraAvailable(isPiService);
        if (!preferredProvider) {
          const detected: CameraProvider = isPiService ? "picamera" : "webcam";
          setProvider(detected);
          onProviderChange?.(detected);
        }
        setProviderResolved(true);
      } catch {
        if (active) {
          // Backend unreachable: still allow the Windows browser-webcam path.
          setPiCameraAvailable(false);
          if (!preferredProvider) onProviderChange?.("webcam");
          setProviderResolved(true);
        }
      } finally {
        clearTimeout(timeout);
      }
    };
    void checkPiCamera();
    const interval = setInterval(checkPiCamera, 6000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [preferredProvider, onProviderChange]);

  // Start browser webcam (Windows laptop default or fallback)
  const startWebcam = useCallback(async () => {
    const id = ++genRef.current;
    setFeed("connecting");
    setErrorMessage("");

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Browser mediaDevices API not available.");
      }
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      if (genRef.current !== id) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = media;
      const el = videoRef.current;
      if (el) {
        el.srcObject = media;
        void el.play().catch(() => {});
      }

      const settings = media.getVideoTracks()[0]?.getSettings();
      if (settings?.width && settings?.height) {
        setResolution(`${settings.width} × ${settings.height}`);
      } else {
        setResolution("640 × 480");
      }
      setFeed("live");
    } catch (err) {
      if (genRef.current !== id) return;
      console.warn("Webcam start failed:", err);
      setFeed("unavailable");
      setErrorMessage(
        "Camera Unavailable: Could not access laptop webcam. Please ensure a camera is connected and browser permission is granted."
      );
    }
  }, []);

  // Connect to the backend Picamera2 MJPEG stream. If Picamera2 is installed
  // but not streaming, ask the backend to start it once, then verify.
  const startPiCameraStream = useCallback(async () => {
    const id = ++genRef.current;
    setFeed("connecting");
    setErrorMessage("");

    // Stop the browser webcam if it was running — never hold two devices.
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    try {
      const readStatus = async (): Promise<CameraStatusResponse> => {
        const res = await fetch("/api/camera/status", { cache: "no-store" });
        if (!res.ok) throw new Error(`camera status failed (${res.status})`);
        return (await res.json()) as CameraStatusResponse;
      };

      let data = await readStatus();
      if (genRef.current !== id) return;

      if (!data.available) {
        setPiCameraDetails(data);
        setFeed("unavailable");
        setErrorMessage(
          "Raspberry Pi Camera Unavailable: Picamera2 is not installed or no camera is detected by libcamera.",
        );
        return;
      }

      if (!data.running) {
        const startRes = await fetch("/api/camera/start", { method: "POST" });
        if (genRef.current !== id) return;
        if (!startRes.ok) {
          const detail = await startRes.text().catch(() => "");
          setFeed("unavailable");
          setErrorMessage(
            `Raspberry Pi Camera Unavailable: the backend could not start the camera. ${detail}`.trim(),
          );
          return;
        }
        data = await readStatus();
        if (genRef.current !== id) return;
      }

      setPiCameraDetails(data);
      if (!data.running) {
        setFeed("unavailable");
        setErrorMessage(
          "Raspberry Pi Camera Unavailable: the backend reports Picamera2 is installed but no frames are being produced.",
        );
        return;
      }

      setResolution(
        data.width && data.height ? `${data.width} × ${data.height}` : "640 × 480",
      );
      setFeed("live");
    } catch (err) {
      if (genRef.current !== id) return;
      setFeed("unavailable");
      setErrorMessage(`Backend camera stream error: ${String(err)}`);
    }
  }, []);

  // Release the device and show a neutral standby screen while no session runs.
  useEffect(() => {
    if (enabled) return;
    genRef.current++;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setFeed("standby");
    setErrorMessage("");
    setLegs(null);
    setEngine("idle");
  }, [enabled]);

  // Initialize the selected camera only after the provider probe has finished
  // AND a session is active, so the Live page never opens a device on mount.
  useEffect(() => {
    if (!providerResolved || !enabled) return;

    if (provider === "picamera") {
      void startPiCameraStream();
    } else {
      void startWebcam();
    }

    return () => {
      genRef.current++;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [enabled, providerResolved, provider, startWebcam, startPiCameraStream]);

  // Video play/pause effect
  useEffect(() => {
    if (provider === "webcam" && videoRef.current) {
      if (paused || !enabled) videoRef.current.pause();
      else void videoRef.current.play().catch(() => {});
    }
  }, [paused, enabled, provider]);

  // Clock tick for tactical HUD
  useEffect(() => {
    if (paused || !enabled) return;
    const timer = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, [paused, enabled]);

  // MediaPipe BlazePose inference loop: processes actual frames from webcam or Pi camera stream
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!enabled || !pose || feed !== "live" || !canvas) {
      setLegs(null);
      setPoseFps(0);
      if (!pose || !enabled) setEngine("idle");
      return;
    }

    let cancelled = false;
    let raf = 0;
    let lastDetect = 0;
    let lastState = 0;
    let fpsFrames = 0;
    let fpsWindowStart = performance.now();

    // Create offscreen capture canvas for image stream if needed
    if (!captureCanvasRef.current) {
      captureCanvasRef.current = document.createElement("canvas");
    }
    const captureCanvas = captureCanvasRef.current;

    setEngine((prev) => (prev === "unavailable" ? prev : "loading"));

    loadPoseEngine()
      .then((landmarker) => {
        if (cancelled) return;
        setEngine("tracking");
        const tracker = new KneeRomTracker();

        const loop = () => {
          if (cancelled) return;
          raf = requestAnimationFrame(loop);
          if (paused) return;

          let sourceElement: CanvasImageSource | null = null;
          let isMirror = false;

          if (provider === "webcam") {
            const v = videoRef.current;
            if (!v || v.readyState < 2) return;
            sourceElement = v;
            isMirror = true; // Front-facing webcam is mirrored
          } else {
            const img = imgRef.current;
            if (!img || !img.complete || img.naturalWidth === 0) return;
            // Draw image frame to capture canvas
            if (captureCanvas.width !== img.naturalWidth || captureCanvas.height !== img.naturalHeight) {
              captureCanvas.width = img.naturalWidth;
              captureCanvas.height = img.naturalHeight;
            }
            const ctx = captureCanvas.getContext("2d");
            if (!ctx) return;
            ctx.drawImage(img, 0, 0);
            sourceElement = captureCanvas;
            isMirror = false;
          }

          const now = performance.now();
          if (now - lastDetect < 66) return; // ~15 FPS inference rate
          lastDetect = now;

          let ts = now;
          if (ts <= lastTsRef.current) ts = lastTsRef.current + 1;
          lastTsRef.current = ts;

          let result: { landmarks?: NormalizedLandmarkLike[][] } | null = null;
          try {
            result = landmarker.detectForVideo(sourceElement, ts);
          } catch {
            return;
          }

          const pts = result?.landmarks?.[0];
          const readout = readPose(pts);
          const knees: readonly [number, number] | undefined =
            readout && readout.confidence >= 0.5
              ? [readout.legs[0].knee, readout.legs[1].knee]
              : undefined;

          // Draw REAL skeleton onto the overlay canvas
          drawPoseCanvas(canvas, sourceElement, pts, isMirror, knees);

          // Measure the actual inference rate instead of inventing a number.
          fpsFrames += 1;
          const fpsNow = performance.now();
          const fpsSpan = fpsNow - fpsWindowStart;
          if (fpsSpan >= 1000) {
            setPoseFps(Math.round((fpsFrames * 1000) / fpsSpan));
            fpsFrames = 0;
            fpsWindowStart = fpsNow;
          }

          if (readout && readout.confidence >= 0.5) {
            tracker.push(readout.legs[0].knee, readout.legs[1].knee);
            if (now - lastState > 150) {
              lastState = now;
              setEngine("tracking");
              setLegs({
                kneeL: readout.legs[0].knee,
                kneeR: readout.legs[1].knee,
                hipL: readout.legs[0].hip,
                hipR: readout.legs[1].hip,
                conf: readout.confidence,
                rom: tracker.rom(),
              });
            }
          } else if (now - lastState > 900) {
            lastState = now;
            setEngine("lost");
            setLegs(null);
          }
        };

        raf = requestAnimationFrame(loop);
      })
      .catch((err) => {
        console.warn("Pose engine initialization failed:", err);
        if (!cancelled) setEngine("unavailable");
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [enabled, pose, paused, feed, provider]);

  const dropped = !compact && tick % 12 >= 9;
  const isLive = feed === "live";
  const isTracking = engine === "tracking";
  const fmt = (deg: number) => `${Math.round(deg)}°`;

  const toggleProvider = () => {
    const next: CameraProvider = provider === "webcam" ? "picamera" : "webcam";
    setProvider(next);
    onProviderChange?.(next);
  };

  const retryCamera = () => {
    if (provider === "picamera") {
      void startPiCameraStream();
    } else {
      void startWebcam();
    }
  };

  return (
    <div className={`camera-shell ${compact ? "camera-shell-compact" : ""}`} data-compact={compact}>
      <div
        className={`tactical-camera ${compact ? "camera-compact" : ""}`}
        data-paused={paused}
        data-feed={feed}
        data-enabled={enabled}
        data-provider={provider}
        data-pose-engine={engine}
        style={{ background: "#050b14" }}
      >
      {/* Video element for browser webcam */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          display: provider === "webcam" && isLive ? "block" : "none",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "scaleX(-1)", // Front camera mirror
        }}
      />

      {/* Image element for Pi Camera MJPEG backend stream */}
      {provider === "picamera" && isLive && (
        <img
          ref={imgRef}
          src="/api/camera/stream"
          alt="Raspberry Pi Camera Stream"
          crossOrigin="anonymous"
          style={{
            width: "100%",
            height: "100%",
            // Must match drawPoseCanvas' object-fit: cover mapping.
            objectFit: "cover",
            background: "#000",
            display: "block",
          }}
          onError={() => {
            setFeed("unavailable");
            setErrorMessage("Failed to load /api/camera/stream from Raspberry Pi.");
          }}
        />
      )}

      {/* Camera Unavailable Banner - Explicit fallback message, never fake video */}
      {feed === "unavailable" && (
        <div
          role="alert"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "radial-gradient(ellipse at center, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.98) 100%)",
            color: "#f87171",
            textAlign: "center",
            zIndex: 10,
          }}
        >
          <AlertCircle size={44} style={{ marginBottom: "12px", color: "#ef4444" }} />
          <h4 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 8px 0", color: "#ffffff" }}>
            CAMERA UNAVAILABLE
          </h4>
          <p style={{ fontSize: "13px", maxWidth: "420px", margin: "0 0 16px 0", color: "#cbd5e1", lineHeight: 1.5 }}>
            {errorMessage || "No live video feed available. Please connect a physical camera or check device permissions."}
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <Button size="sm" variant="outline" onClick={retryCamera}>
              <RefreshCw size={14} /> Retry Camera
            </Button>
            {piCameraAvailable && (
              <Button size="sm" variant="outline" onClick={toggleProvider}>
                <Camera size={14} /> Switch to {provider === "webcam" ? "Pi Camera" : "Webcam"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Standby — no device has been opened because no session is running. */}
      {feed === "standby" && (
        <div
          role="status"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "24px",
            textAlign: "center",
            background:
              "radial-gradient(ellipse at center, rgba(15, 32, 48, 0.92) 0%, rgba(5, 11, 20, 0.98) 100%)",
            zIndex: 8,
          }}
        >
          <Camera size={40} color="#38bdf8" />
          <strong style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "14px", color: "#e2e8f0" }}>
            CAMERA STANDBY
          </strong>
          <p style={{ margin: 0, maxWidth: "420px", fontSize: "12px", lineHeight: 1.6, color: "#94a3b8" }}>
            Press Start Session to open the camera and begin pose tracking. No video device is held
            while the session is idle.
          </p>
        </div>
      )}

      {/* Connecting status */}
      {feed === "connecting" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#050b14",
            color: "#38bdf8",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "13px",
            zIndex: 5,
          }}
        >
          CONNECTING CAMERA FEED...
        </div>
      )}

      {/* Shade overlay */}
      <div className="camera-shade" />

      {/* Real pose canvas */}
      <canvas
        ref={canvasRef}
        className="camera-pose-canvas"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 4,
        }}
        aria-hidden="true"
      />

      {/* Top HUD */}
      <div className="camera-top" style={{ zIndex: 6 }}>
        <span className={isLive ? "success-text" : "warning-text"}>
          ●{" "}
          {feed === "standby"
            ? "CAMERA STANDBY"
            : feed === "connecting"
              ? "INITIALIZING CAMERA…"
              : feed === "unavailable"
                ? "CAMERA OFFLINE"
                : provider === "picamera"
                  ? "PI CAMERA FEED (PICAMERA2)"
                  : "LAPTOP WEBCAM FEED"}
          <br />
          <small>
            {isLive
              ? `${provider === "picamera" ? "RASPBERRY PI" : "USER WEBCAM"} · ${resolution} · POSE ${isTracking ? "REAL-TIME" : "SEARCHING"}`
              : feed === "standby"
                ? "START SESSION TO ACTIVATE CAMERA"
                : "HARDWARE CAMERA REQUIRED · NO FAKE SKELETONS"}
          </small>
        </span>
        <span className={paused || dropped ? "warning-text guard-warning" : "success-text"}>
          {feed === "standby"
            ? "STANDBY"
            : paused
              ? "FEED PAUSED"
              : isTracking
                ? "GUARD TRACKED"
                : "AWAITING FIGHTER"}
        </span>
      </div>

      {/* Bottom source tag — informational only so controls never cover the feed. */}
      <div className="camera-overlay-tag" style={{ zIndex: 6 }}>
        <span>CAM_01 // MEDIAPIPE BLAZEPOSE</span>
        <span data-live={isTracking}>{isTracking ? "LANDMARKS LIVE" : "LANDMARKS IDLE"}</span>
      </div>

      {["tl", "tr", "bl", "br"].map((p) => (
        <span key={p} className={`combat-bracket bracket-${p}`} />
      ))}
      </div>

      <div className="camera-control-bar">
        <div className="camera-telemetry" aria-label="Camera telemetry">
          <div>
            <span>SOURCE</span>
            <strong>{provider === "picamera" ? "PI CAMERA" : "WEBCAM"}</strong>
          </div>
          <div>
            <span>FEED</span>
            <strong data-tone={isLive ? "ok" : feed === "unavailable" ? "bad" : "idle"}>
              {feed === "connecting" ? "LINKING" : feed.toUpperCase()}
            </strong>
          </div>
          <div>
            <span>TRACKING</span>
            <strong data-tone={isTracking ? "ok" : engine === "unavailable" ? "bad" : "idle"}>
              {engine === "unavailable" ? "OFFLINE" : engine === "lost" ? "SEARCHING" : engine.toUpperCase()}
            </strong>
          </div>
          <div>
            <span>POSE FPS</span>
            <strong>{isLive && !paused ? poseFps || "—" : "0"}</strong>
          </div>
          <div>
            <span>RESOLUTION</span>
            <strong>{resolution || "—"}</strong>
          </div>
        </div>

        <div className="camera-actions">
          {piCameraAvailable && (
            <Button
              size="sm"
              variant="outline"
              title={`Switch camera source (Currently: ${provider === "picamera" ? "Pi Camera" : "Webcam"})`}
              onClick={toggleProvider}
            >
              <Radio size={13} />
              {provider === "picamera" ? "Use Webcam" : "Use Pi Cam"}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            aria-label="Refresh camera feed"
            title="Refresh camera feed"
            onClick={retryCamera}
          >
            <Camera size={14} />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            aria-label="Toggle pose overlay"
            title="Toggle pose overlay"
            aria-pressed={pose}
            onClick={() => setPose(!pose)}
          >
            <ScanLine size={14} />
            Pose {pose ? "On" : "Off"}
          </Button>
        </div>
      </div>

      {/* Leg goniometry lives outside the video so it never covers landmarks. */}
      {!compact && (
        <div className="camera-legs" aria-live="polite">
          <div className="camera-legs-head">
            <span className="camera-legs-title">
              LEG GONIOMETRY // BLAZEPOSE {engine === "loading" && "· LOADING MODEL…"}
            </span>
            <span className="camera-legs-rom">
              {legs
                ? `KNEE ROM ${legs.rom}° · CONF ${(legs.conf * 100).toFixed(0)}%`
                : engine === "unavailable"
                  ? "POSE MODEL UNAVAILABLE"
                  : engine === "lost"
                    ? "NO SUBJECT IN FRAME"
                    : "SEARCHING SUBJECT…"}
            </span>
          </div>
          <div className="camera-leg-grid">
            {[
              { label: "L KNEE", value: legs?.kneeL },
              { label: "R KNEE", value: legs?.kneeR },
              { label: "L HIP", value: legs?.hipL },
              { label: "R HIP", value: legs?.hipR },
            ].map(({ label, value }) => (
              <div className="camera-leg-tile" key={label} data-live={value !== undefined}>
                <span>{label}</span>
                <strong>{value === undefined ? "—" : fmt(value)}</strong>
                <i aria-hidden="true">
                  <b
                    style={{
                      width: `${
                        value === undefined ? 0 : Math.max(4, Math.min(100, (value / 180) * 100))
                      }%`,
                    }}
                  />
                </i>
              </div>
            ))}
          </div>
          <p className="camera-legs-note">
            Joint angles are measured live from the 33 BlazePose landmarks. Nothing is estimated
            while tracking is offline.
          </p>
        </div>
      )}
    </div>
  );
}

export default TacticalCamera;
