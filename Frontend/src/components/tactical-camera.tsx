import { useCallback, useEffect, useRef, useState } from "react";
import { knockoutClip as videoAsset } from "@/lib/media-assets";
import { drawPoseCanvas, loadPoseEngine, type NormalizedLandmarkLike } from "@/lib/pose-engine";
import { KneeRomTracker, readPose } from "@/lib/pose-telemetry";
import { Button } from "./ui/button";
import { Camera, ScanLine } from "lucide-react";

/** 'live' = user's webcam via getUserMedia · 'demo' = bundled knockout clip fallback. */
type Feed = "connecting" | "live" | "demo";
/** Pose engine lifecycle: 'idle' until first needed, 'unavailable' on load failure. */
type EngineState = "idle" | "loading" | "tracking" | "lost" | "unavailable";

interface LegAngles {
  kneeL: number;
  kneeR: number;
  hipL: number;
  hipR: number;
  conf: number;
  rom: number;
}

export function TacticalCamera({
  paused = false,
  compact = false,
}: {
  paused?: boolean;
  compact?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const gen = useRef(0);
  const lastTs = useRef(0);
  const [feed, setFeed] = useState<Feed>("connecting");
  const [resolution, setResolution] = useState("");
  const [pose, setPose] = useState(true);
  const [tick, setTick] = useState(0);
  const [engine, setEngine] = useState<EngineState>("idle");
  const [legs, setLegs] = useState<LegAngles | null>(null);

  const switchToDemoClip = useCallback(() => {
    const el = video.current;
    if (el) {
      el.srcObject = null;
      el.src = videoAsset.url;
      el.play().catch(() => {});
    }
    setResolution("");
    setFeed("demo");
  }, []);

  const startCamera = useCallback(async () => {
    const id = ++gen.current;
    setFeed("connecting");
    // If the permission prompt is never answered (blocked prompt, no device),
    // fall back to the demo clip instead of hanging on a blank feed.
    const timer = setTimeout(() => {
      if (gen.current === id) {
        switchToDemoClip();
      }
    }, 6000);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      clearTimeout(timer);
      if (gen.current !== id) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = media;
      const el = video.current;
      if (el) {
        el.src = "";
        el.srcObject = media;
        void el.play().catch(() => {});
      }
      const { width, height } = media.getVideoTracks()[0]?.getSettings() ?? {};
      setResolution(width && height ? `${width} × ${height}` : "");
      setFeed("live");
    } catch {
      clearTimeout(timer);
      if (gen.current === id) {
        switchToDemoClip();
      }
    }
  }, [switchToDemoClip]);

  const toggleFeed = useCallback(() => {
    if (feed === "live" || feed === "connecting") {
      gen.current++;
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      switchToDemoClip();
    } else {
      void startCamera();
    }
  }, [feed, switchToDemoClip, startCamera]);

  useEffect(() => {
    void startCamera();
    return () => {
      const currentGen = gen.current;
      gen.current++;
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    };
  }, [startCamera]);

  useEffect(() => {
    if (paused) video.current?.pause();
    else void video.current?.play().catch(() => {});
  }, [paused, feed]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, [paused]);

  // MediaPipe inference loop: runs on any playing feed (webcam or demo clip),
  // ~15 Hz detection, React state throttled to 150 ms.
  useEffect(() => {
    const v = video.current,
      c = canvas.current;
    if (!pose) {
      setLegs(null);
      setEngine("idle");
      return;
    }
    if (!v || !c || (feed !== "live" && feed !== "demo")) {
      setLegs(null);
      return;
    }
    let cancelled = false;
    let raf = 0;
    let lastDetect = 0;
    let lastState = 0;
    setEngine((prev) => (prev === "unavailable" ? prev : "loading"));
    loadPoseEngine()
      .then((landmarker) => {
        if (cancelled) return;
        setEngine("tracking");
        const tracker = new KneeRomTracker();
        const loop = () => {
          if (cancelled) return;
          raf = requestAnimationFrame(loop);
          if (paused || v.readyState < 2) return;
          const now = performance.now();
          if (now - lastDetect < 66) return;
          lastDetect = now;
          let ts = now;
          if (ts <= lastTs.current) ts = lastTs.current + 1;
          lastTs.current = ts;
          let result: { landmarks?: NormalizedLandmarkLike[][] } | null = null;
          try {
            result = landmarker.detectForVideo(v, ts);
          } catch {
            return;
          }
          const pts = result?.landmarks?.[0];
          const readout = readPose(pts);
          const knees: readonly [number, number] | undefined =
            readout && readout.confidence >= 0.5
              ? [readout.legs[0].knee, readout.legs[1].knee]
              : undefined;
          drawPoseCanvas(c, v, pts, feed === "live", knees);
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
      .catch(() => {
        if (!cancelled) setEngine("unavailable");
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      const ctx = c.getContext("2d");
      ctx?.clearRect(0, 0, c.width, c.height);
    };
  }, [pose, paused, feed]);

  const dropped = !compact && tick % 12 >= 9;
  const joint = 285 + Math.sin(tick) * 12;
  const live = feed === "live";
  const tracking = engine === "tracking" || engine === "lost";
  const overlayReal = pose && tracking;
  const fmt = (deg: number) => `${Math.round(deg)}°`;

  return (
    <div
      className={`tactical-camera ${compact ? "camera-compact" : ""}`}
      data-paused={paused}
      data-feed={feed}
      data-pose-engine={engine}
    >
      <video ref={video} autoPlay muted loop playsInline />
      <div className="camera-shade" />
      <canvas ref={canvas} className="camera-pose-canvas" aria-hidden="true" />
      <div className="camera-top">
        <span className={live ? "success-text" : undefined}>
          ●{" "}
          {feed === "connecting"
            ? "CONNECTING CAMERA…"
            : live
              ? "LIVE CAMERA FEED"
              : "SIMULATED RTSP FEED"}
          <br />
          <small>
            {live
              ? `USER CAM${resolution ? ` · ${resolution}` : ""} · POSE ${tracking ? "REAL-TIME" : "SIMULATED"}`
              : feed === "connecting"
                ? "AWAITING CAMERA PERMISSION · DEMO CLIP ON FALLBACK"
                : `${59 + (tick % 2)} FPS / ${17 + (tick % 3)} MS / 1920 × 1080`}
          </small>
        </span>
        <span className={paused || dropped ? "warning-text guard-warning" : "success-text"}>
          {paused ? "FEED PAUSED" : dropped ? "GUARD DROPPED" : "GUARD UP"}
        </span>
      </div>
      {!overlayReal && pose && (
        <svg
          className="camera-pose"
          viewBox="0 0 1000 562"
          role="img"
          aria-label="Illustrative interactive skeleton tracking"
        >
          <g className="tracking-skeleton" fill="none">
            <path
              d={`M600 170 L600 225 L540 245 L490 ${joint} L450 ${dropped ? 320 : 250} M600 225 L650 250 L690 220 L720 240 M600 225 L605 350 L560 425 L535 500 M605 350 L665 410 L710 485`}
            />
            <circle cx="600" cy="170" r="27" />
            {[
              [600, 225],
              [540, 245],
              [490, joint],
              [650, 250],
              [690, 220],
              [605, 350],
              [560, 425],
              [665, 410],
              [535, 500],
              [710, 485],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="6" />
            ))}
            <path className="guard-line" d="M430 230 H740" />
          </g>
          <text x="705" y="208">
            GUARD LINE
          </text>
          <text x="660" y="397">
            {133 + (tick % 5)}°
          </text>
          <text x="470" y="315">
            {90 + (tick % 4)}°
          </text>
        </svg>
      )}
      {!compact && (
        <div className="camera-legs" aria-live="polite">
          <span className="camera-legs-title">
            LEG JOINTS // MEDIAPIPE {engine === "loading" && "· LOADING MODEL…"}
          </span>
          <div>
            <span>L KNEE</span>
            <strong>{legs ? fmt(legs.kneeL) : "—"}</strong>
          </div>
          <div>
            <span>R KNEE</span>
            <strong>{legs ? fmt(legs.kneeR) : "—"}</strong>
          </div>
          <div>
            <span>L HIP</span>
            <strong>{legs ? fmt(legs.hipL) : "—"}</strong>
          </div>
          <div>
            <span>R HIP</span>
            <strong>{legs ? fmt(legs.hipR) : "—"}</strong>
          </div>
          <span className="camera-legs-rom">
            {legs
              ? `KNEE ROM ${legs.rom}° · CONF ${(legs.conf * 100).toFixed(0)}%`
              : engine === "unavailable"
                ? "POSE MODEL UNAVAILABLE"
                : engine === "lost"
                  ? "NO SUBJECT IN FRAME"
                  : "SEARCHING…"}
          </span>
        </div>
      )}
      <div className="camera-bottom">
        <span>
          CAM_01 // POSE SEGMENTATION
          <br />
          <small>
            {overlayReal
              ? "MediaPipe BlazePose · real-time joint angles"
              : "Illustrative overlay · not measured tracking"}
          </small>
        </span>
        <span className="camera-actions">
          <Button
            size="icon"
            variant="outline"
            aria-label={
              live || feed === "connecting" ? "Switch to demo clip" : "Enable camera feed"
            }
            title={live || feed === "connecting" ? "Switch to demo clip" : "Enable camera feed"}
            onClick={toggleFeed}
          >
            <Camera />
          </Button>
          <Button
            size="icon"
            variant="outline"
            aria-label="Toggle pose overlay"
            title="Toggle pose overlay"
            aria-pressed={pose}
            onClick={() => setPose(!pose)}
          >
            <ScanLine />
          </Button>
        </span>
      </div>
      {["tl", "tr", "bl", "br"].map((p) => (
        <span key={p} className={`combat-bracket bracket-${p}`} />
      ))}
    </div>
  );
}
