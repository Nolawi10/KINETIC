import { readPose, type Pt } from '@/lib/pose-telemetry';

/**
 * MediaPipe BlazePose runtime. The WASM fileset and the .task model are served
 * from `public/` so everything works offline; the package itself is imported
 * lazily to keep it out of the SSR bundle.
 */

let enginePromise: Promise<PoseLandmarkerLike> | null = null;

interface PoseLandmarkerLike {
  detectForVideo(video: HTMLVideoElement, timestampMs: number): { landmarks?: NormalizedLandmarkLike[][] };
}
interface NormalizedLandmarkLike extends Pt { visibility?: number }

export function loadPoseEngine(): Promise<PoseLandmarkerLike> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
      const baseOptions = { modelAssetPath: '/models/pose_landmarker_lite.task' };
      try {
        return await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { ...baseOptions, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
        });
      } catch {
        return await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { ...baseOptions, delegate: 'CPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
        });
      }
    })().catch(err => { enginePromise = null; throw err; });
  }
  return enginePromise;
}

/** Full-body topology; `leg` segments get the emphasized combat-telemetry look. */
const CONNECTIONS: ReadonlyArray<readonly [number, number, 'leg' | 'core' | 'arm']> = [
  [11, 12, 'core'], [11, 23, 'core'], [12, 24, 'core'], [23, 24, 'core'],
  [11, 13, 'arm'], [13, 15, 'arm'], [12, 14, 'arm'], [14, 16, 'arm'],
  [23, 25, 'leg'], [25, 27, 'leg'], [27, 31, 'leg'],
  [24, 26, 'leg'], [26, 28, 'leg'], [28, 32, 'leg'],
];
const JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

/**
 * Draw the detected skeleton onto the overlay canvas, mapped through the same
 * `object-fit: cover` geometry the video uses. When `mirror` is true (front
 * camera, CSS-flipped video) x is flipped so the overlay stays glued to the
 * user's body. Clears the canvas; no-ops (empty canvas) when no pose.
 */
export function drawPoseCanvas(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  pts: readonly NormalizedLandmarkLike[] | undefined,
  mirror: boolean,
  kneeAngles?: readonly [number, number],
): void {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = Math.round(w * dpr), ch = Math.round(h * dpr);
  if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!pts?.length || !vw || !vh) return;

  // object-fit: cover mapping from video pixels to canvas pixels
  const scale = Math.max(w / vw, h / vh);
  const rw = vw * scale, rh = vh * scale, ox = (w - rw) / 2, oy = (h - rh) / 2;
  const at = (i: number) => {
    const lm = pts[i];
    if (!lm) return null;
    return { x: ox + (mirror ? 1 - lm.x : lm.x) * rw, y: oy + lm.y * rh };
  };

  const styles = getComputedStyle(canvas);
  const legColor = styles.getPropertyValue('--primary').trim() || '#22d3ee';
  const coreColor = styles.getPropertyValue('--muted-foreground').trim() || '#9aa0a6';

  ctx.lineCap = 'round';
  for (const [a, b, kind] of CONNECTIONS) {
    const p1 = at(a), p2 = at(b);
    if (!p1 || !p2) continue;
    ctx.strokeStyle = kind === 'leg' ? legColor : coreColor;
    ctx.globalAlpha = kind === 'core' ? 0.5 : kind === 'arm' ? 0.65 : 1;
    ctx.lineWidth = kind === 'leg' ? 3 : 1.5;
    ctx.shadowColor = kind === 'leg' ? legColor : 'transparent';
    ctx.shadowBlur = kind === 'leg' ? 8 : 0;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  for (const i of JOINTS) {
    const p = at(i);
    if (!p) continue;
    const isKnee = i === 25 || i === 26;
    ctx.fillStyle = isKnee ? legColor : coreColor;
    ctx.beginPath();
    ctx.arc(p.x, p.y, isKnee ? 5 : 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Knee goniometry labels next to each knee joint
  if (kneeAngles) {
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.fillStyle = legColor;
    const left = at(25), right = at(26);
    if (left) ctx.fillText(`${Math.round(kneeAngles[0])}°`, left.x + 10, left.y + 4);
    if (right) ctx.fillText(`${Math.round(kneeAngles[1])}°`, right.x - 34, right.y + 4);
  }
}

export type { NormalizedLandmarkLike };
