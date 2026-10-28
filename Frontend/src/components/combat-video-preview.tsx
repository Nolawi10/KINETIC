import { useEffect, useRef, useState } from "react";
import { Maximize2, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { knockoutClip as clip } from "@/lib/media-assets";
import { getImpactTarget, type Discipline } from "@/lib/knockout-preview";

export function CombatVideoPreview({
  discipline,
  suspended = false,
  onExpand,
}: {
  discipline: Discipline;
  suspended?: boolean;
  onExpand?: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (suspended) video.pause();
    else video.play().catch(() => setPlaying(false));
  }, [suspended]);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      if (ref.current) setTime(ref.current.currentTime);
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);
  const target = getImpactTarget(time);
  return (
    <div className="combat-player">
      <div className="combat-video-frame">
        <video
          ref={ref}
          autoPlay
          loop
          muted={muted}
          playsInline
          preload="metadata"
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setFailed(true)}
          aria-label="MMA knockout fight clip"
        >
          <source src={clip.url} type="video/mp4" />
        </video>
        <div className="combat-video-top">
          <span>
            <span className="status-light" /> COMBAT REPLAY
          </span>
          <span>{discipline.toUpperCase()} // ANNOTATED PREVIEW</span>
        </div>
        <div className="combat-bracket bracket-tl" />
        <div className="combat-bracket bracket-tr" />
        <div className="combat-bracket bracket-bl" />
        <div className="combat-bracket bracket-br" />
        {target && (
          <svg
            className="combat-impact-overlay"
            viewBox="0 0 1000 562.5"
            aria-label="Illustrative right-hook impact target"
          >
            <g transform={`translate(${target.x * 10} ${target.y * 5.625})`}>
              <circle className="impact-target" r="25" />
              <circle className="impact-core" r="5" />
              <path className="impact-leader" d="M25 0L66 -26H340" />
              <rect className="impact-label-bg" x="65" y="-61" width="300" height="32" rx="3" />
              <text className="impact-label" x="77" y="-40">
                STRIKE FORCE: HIGH // RIGHT HOOK
              </text>
            </g>
          </svg>
        )}
        <div className="combat-outcome">
          <span>
            CLASS: <strong>135-LB WEEKLASS</strong>
          </span>
          <span>
            OUTCOME: <strong>{time >= 4.3 ? "KNOCKOUT" : "PENDING"}</strong>
          </span>
          <span className="combat-timestamp">{time.toFixed(2)} S</span>
        </div>
        {failed && (
          <div className="video-failure">
            The fight clip could not load.{" "}
            <Button
              variant="outline"
              onClick={() => {
                setFailed(false);
                ref.current?.load();
              }}
            >
              RETRY
            </Button>
          </div>
        )}
      </div>
      <div className="combat-controls">
        <Button
          variant="ghost"
          size="icon"
          aria-label={playing ? "Pause video" : "Play video"}
          title={playing ? "Pause video" : "Play video"}
          onClick={() => {
            const video = ref.current;
            if (!video) return;
            if (video.paused) video.play().catch(() => setPlaying(false));
            else video.pause();
          }}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Replay knockout"
          title="Replay knockout"
          onClick={() => {
            const video = ref.current;
            if (!video) return;
            video.currentTime = 3.4;
            video.play().catch(() => setPlaying(false));
          }}
        >
          <RotateCcw />
        </Button>
        <input
          type="range"
          aria-label="Video playback position"
          min="0"
          max={duration || 38.44}
          step="0.01"
          value={time}
          onChange={(event) => {
            if (ref.current) ref.current.currentTime = Number(event.target.value);
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label={muted ? "Unmute video" : "Mute video"}
          title={muted ? "Unmute video" : "Mute video"}
          onClick={() => setMuted(!muted)}
        >
          {muted ? <VolumeX /> : <Volume2 />}
        </Button>
        {onExpand && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Expand telemetry preview"
            title="Expand telemetry preview"
            onClick={onExpand}
          >
            <Maximize2 />
          </Button>
        )}
      </div>
    </div>
  );
}
