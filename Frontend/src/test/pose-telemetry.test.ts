import { describe, expect, it } from 'vitest';
import { KneeRomTracker, POSE, jointAngle, readPose, turnDirection, type Pt } from '@/lib/pose-telemetry';

describe('jointAngle', () => {
  it('returns 180° for a fully extended limb (straight line)', () => {
    const hip = { x: 0.5, y: 0.4 }, knee = { x: 0.5, y: 0.6 }, ankle = { x: 0.5, y: 0.8 };
    expect(jointAngle(hip, knee, ankle)).toBeCloseTo(180, 5);
  });

  it('returns 90° for a right angle', () => {
    const a = { x: 0, y: 0 }, b = { x: 0, y: 1 }, c = { x: 1, y: 1 };
    expect(jointAngle(a, b, c)).toBeCloseTo(90, 5);
  });

  it('returns ~135° for a moderate knee bend', () => {
    // thigh straight down, shin kicked back 45°
    const hip = { x: 0, y: 0 }, knee = { x: 0, y: 1 }, ankle = { x: 0.7071, y: 1.7071 };
    expect(jointAngle(hip, knee, ankle)).toBeCloseTo(135, 3);
  });

  it('is symmetric — mirroring left/right does not change the angle', () => {
    const hip = { x: 0.4, y: 0.4 }, knee = { x: 0.45, y: 0.6 }, ankle = { x: 0.55, y: 0.75 };
    const mirrored = { hip: { x: 0.6, y: 0.4 }, knee: { x: 0.55, y: 0.6 }, ankle: { x: 0.45, y: 0.75 } };
    expect(jointAngle(hip, knee, ankle)).toBeCloseTo(jointAngle(mirrored.hip, mirrored.knee, mirrored.ankle), 5);
  });

  it('returns 0 for degenerate/missing landmarks instead of NaN', () => {
    expect(jointAngle({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.9, y: 0.9 })).toBe(0);
    expect(jointAngle(undefined, { x: 0, y: 0 }, { x: 1, y: 1 })).toBe(0);
    expect(jointAngle({ x: 0, y: 0 }, undefined, { x: 1, y: 1 })).toBe(0);
  });
});

describe('turnDirection', () => {
  it('signs differ for clockwise vs counter-clockwise turns', () => {
    const cw = turnDirection({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 });
    const ccw = turnDirection({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 });
    expect(Math.sign(cw)).toBeGreaterThan(0);
    expect(Math.sign(ccw)).toBeLessThan(0);
  });
});

/** Build a sparse 33-slot BlazePose array from a few joints. */
function frame(joints: Partial<Record<number, Pt & { visibility?: number }>>): (Pt | undefined)[] {
  const pts: (Pt | undefined)[] = new Array(33).fill(undefined);
  for (const [idx, pt] of Object.entries(joints)) pts[Number(idx)] = pt;
  return pts;
}

const straightLegFrame = () => frame({
  [POSE.LEFT_SHOULDER]: { x: 0.4, y: 0.25 }, [POSE.RIGHT_SHOULDER]: { x: 0.6, y: 0.25 },
  [POSE.LEFT_HIP]: { x: 0.45, y: 0.5 }, [POSE.RIGHT_HIP]: { x: 0.55, y: 0.5 },
  [POSE.LEFT_KNEE]: { x: 0.45, y: 0.72 }, [POSE.RIGHT_KNEE]: { x: 0.55, y: 0.72 },
  [POSE.LEFT_ANKLE]: { x: 0.45, y: 0.94 }, [POSE.RIGHT_ANKLE]: { x: 0.55, y: 0.94 },
  [POSE.LEFT_HEEL]: { x: 0.45, y: 0.96 }, [POSE.RIGHT_HEEL]: { x: 0.55, y: 0.96 },
  [POSE.LEFT_FOOT_INDEX]: { x: 0.49, y: 0.97 }, [POSE.RIGHT_FOOT_INDEX]: { x: 0.59, y: 0.97 },
});

describe('readPose', () => {
  it('returns null without hip landmarks', () => {
    expect(readPose(undefined)).toBeNull();
    expect(readPose(frame({ [POSE.LEFT_SHOULDER]: { x: 0, y: 0 } }))).toBeNull();
  });

  it('reads ~180° knees on a straight standing stance', () => {
    const out = readPose(straightLegFrame());
    expect(out).not.toBeNull();
    expect(out!.legs[0].knee).toBeCloseTo(180, 0);
    expect(out!.legs[1].knee).toBeCloseTo(180, 0);
    expect(out!.legs[0].side).toBe('left');
    expect(out!.legs[1].side).toBe('right');
  });

  it('drops the knee angle when the leg is flexed', () => {
    const pts = straightLegFrame();
    pts[POSE.LEFT_ANKLE] = { x: 0.62, y: 0.9 }; // pull the left shin back
    const out = readPose(pts)!;
    expect(out.legs[0].knee).toBeLessThan(170);
    expect(out.legs[0].knee).toBeGreaterThan(100);
  });

  it('reports a near-level hip tilt when hips are horizontal', () => {
    const out = readPose(straightLegFrame())!;
    expect(Math.abs(out.stance.hipTilt)).toBeLessThan(5);
  });

  it('averages confidence over tracked joints from visibility', () => {
    const pts = straightLegFrame();
    for (const i of Object.keys(pts).map(Number)) {
      if (pts[i]) (pts[i] as { visibility?: number }).visibility = 1;
    }
    expect(readPose(pts)!.confidence).toBeCloseTo(1, 5);
    pts[POSE.LEFT_KNEE] = { ...pts[POSE.LEFT_KNEE]!, visibility: 0 } as (typeof pts)[number];
    expect(readPose(pts)!.confidence).toBeLessThan(1);
  });
});

describe('KneeRomTracker', () => {
  it('reports range of motion as max flexion depth in the window', () => {
    const t = new KneeRomTracker();
    t.push(178, 179); // extension
    t.push(120, 130); // chambered kick
    t.push(170, 172); // back to stance
    expect(t.rom()).toBe(179 - 120);
  });

  it('trims to the trailing window so old kicks age out', () => {
    const t = new KneeRomTracker(2);
    t.push(60, 60); // old deep kick
    t.push(175, 176);
    t.push(177, 178);
    t.push(176, 175);
    expect(t.rom()).toBeLessThan(20);
  });

  it('resets to empty', () => {
    const t = new KneeRomTracker();
    t.push(90, 100);
    t.reset();
    expect(t.rom()).toBe(0);
  });
});
