/**
 * MediaPipe Pose → combat telemetry.
 *
 * Landmark indices follow the MediaPipe BlazePose 33-point topology. This
 * module is deliberately free of DOM/Model APIs so the geometry is testable on
 * its own: the camera component owns the inference loop and hands us plain
 * landmark arrays.
 */

/** BlazePose 33-point topology (subset used for stance + leg tracking). */
export const POSE = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

export interface Pt {
  x: number;
  y: number;
  z?: number;
}

/**
 * Interior angle ABC in degrees, at vertex B, using x/y (2D). The camera feed
 * is a flat plane so 3D would only add noise. Returns 0..180.
 */
export function jointAngle(a: Pt | undefined, b: Pt | undefined, c: Pt | undefined): number {
  if (!a || !b || !c) return 0;
  const abx = a.x - b.x,
    aby = a.y - b.y;
  const cbx = c.x - b.x,
    cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (mag === 0) return 0;
  // clamp guards against float drift pushing acos outside its domain
  const cos = Math.min(1, Math.max(-1, dot / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Signed turn direction at B: >0 clockwise in screen space, <0 counter-clockwise. */
export function turnDirection(a: Pt | undefined, b: Pt | undefined, c: Pt | undefined): number {
  if (!a || !b || !c) return 0;
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

export interface LegReadout {
  /** Knee interior angle (hip–knee–ankle), ~180 = locked/extended, lower = flexed. */
  knee: number;
  /** Hip interior angle (shoulder–hip–knee), thigh vs torso. */
  hip: number;
  /** Ankle interior angle (knee–heel–foot-index), foot pitch. */
  ankle: number;
  /** Which screen side the limb is on, for left/right guarding readouts. */
  side: "left" | "right";
}

export interface StanceReadout {
  /** Pelvis tilt in degrees; +/- leans to the fighter's left/right. */
  hipTilt: number;
  /** Shoulder line tilt in degrees. */
  shoulderTilt: number;
  /** Base width between ankles normalized to shoulder width (>1 = wide base). */
  baseWidth: number;
  /** 0 = squared to camera, 1 = fully bladed/sideways stance. */
  bladed: number;
}

export interface PoseReadout {
  legs: [LegReadout, LegReadout];
  stance: StanceReadout;
  /** Confidence 0..1 from MediaPipe visibility, averaged over tracked joints. */
  confidence: number;
}

const lms = (p: readonly (Pt | undefined)[] | undefined, i: number): Pt | undefined => p?.[i];

function vis(p: readonly (Pt | undefined)[] | undefined, i: number): number {
  const v = p?.[i] as { visibility?: number } | undefined;
  return typeof v?.visibility === "number" ? v.visibility : 1;
}

function avgVis(p: readonly (Pt | undefined)[] | undefined, idxs: number[]): number {
  if (!idxs.length) return 0;
  return idxs.reduce((s, i) => s + vis(p, i), 0) / idxs.length;
}

/**
 * Derive leg-joint angles and stance metrics from a single frame of landmarks.
 * Coordinates are normalized (0..1) and y grows downward, as MediaPipe emits.
 */
export function readPose(pts: readonly (Pt | undefined)[] | undefined): PoseReadout | null {
  if (!pts) return null;
  const lShoulder = lms(pts, POSE.LEFT_SHOULDER),
    rShoulder = lms(pts, POSE.RIGHT_SHOULDER);
  const lHip = lms(pts, POSE.LEFT_HIP),
    rHip = lms(pts, POSE.RIGHT_HIP);
  const lKnee = lms(pts, POSE.LEFT_KNEE),
    rKnee = lms(pts, POSE.RIGHT_KNEE);
  const lAnkle = lms(pts, POSE.LEFT_ANKLE),
    rAnkle = lms(pts, POSE.RIGHT_ANKLE);
  const lHeel = lms(pts, POSE.LEFT_HEEL),
    rHeel = lms(pts, POSE.RIGHT_HEEL);
  const lFoot = lms(pts, POSE.LEFT_FOOT_INDEX),
    rFoot = lms(pts, POSE.RIGHT_FOOT_INDEX);

  // Need hips + at least one full leg to report anything meaningful.
  if (!lHip || !rHip) return null;

  const leftLeg: LegReadout = {
    knee: jointAngle(lHip, lKnee, lAnkle),
    hip: jointAngle(lShoulder, lHip, lKnee),
    ankle: jointAngle(lKnee, lHeel, lFoot),
    side: "left",
  };
  const rightLeg: LegReadout = {
    knee: jointAngle(rHip, rKnee, rAnkle),
    hip: jointAngle(rShoulder, rHip, rKnee),
    ankle: jointAngle(rKnee, rHeel, rFoot),
    side: "right",
  };

  // Pelvis tilt: horizontal reference vs the hip line.
  const hipDy = rHip.y - lHip.y,
    hipDx = rHip.x - lHip.x;
  const hipTilt = (Math.atan2(hipDy, hipDx) * 180) / Math.PI;
  const shoulderTilt =
    lShoulder && rShoulder
      ? (Math.atan2(rShoulder.y - lShoulder.y, rShoulder.x - lShoulder.x) * 180) / Math.PI
      : 0;

  const shoulderWidth =
    lShoulder && rShoulder ? Math.hypot(rShoulder.x - lShoulder.x, rShoulder.y - lShoulder.y) : 0;
  const ankleWidth = lAnkle && rAnkle ? Math.hypot(rAnkle.x - lAnkle.x, rAnkle.y - lAnkle.y) : 0;
  const baseWidth = shoulderWidth > 0 ? ankleWidth / shoulderWidth : 0;

  // "Bladed" = how sideways the hips are foreshortened relative to shoulders.
  const hipSpan = Math.abs(hipDx);
  const shoulderSpan = lShoulder && rShoulder ? Math.abs(rShoulder.x - lShoulder.x) : 0;
  const bladed = shoulderSpan > 0 ? Math.min(1, Math.max(0, 1 - hipSpan / shoulderSpan)) : 0;

  const confidence = avgVis(pts, [
    POSE.LEFT_SHOULDER,
    POSE.RIGHT_SHOULDER,
    POSE.LEFT_HIP,
    POSE.RIGHT_HIP,
    POSE.LEFT_KNEE,
    POSE.RIGHT_KNEE,
    POSE.LEFT_ANKLE,
    POSE.RIGHT_ANKLE,
  ]);

  return {
    legs: [leftLeg, rightLeg],
    stance: { hipTilt, shoulderTilt, baseWidth, bladed },
    confidence,
  };
}

/**
 * Rolling joint-angle tracker: feeds per-frame knee readings and reports the
 * flexion range of motion (ROM) over a trailing window, which is the number
 * that matters for kick retraction and stance work.
 */
export class KneeRomTracker {
  private samples: number[] = [];
  constructor(private readonly window: number = 90) {}

  push(leftKnee: number, rightKnee: number): void {
    this.samples.push(leftKnee, rightKnee);
    if (this.samples.length > this.window * 2)
      this.samples.splice(0, this.samples.length - this.window * 2);
  }

  /** Max flexion depth reached in the window (degrees below full extension). */
  rom(): number {
    if (!this.samples.length) return 0;
    const max = Math.max(...this.samples);
    const min = Math.min(...this.samples);
    return Math.round(max - min);
  }

  reset(): void {
    this.samples = [];
  }
}
