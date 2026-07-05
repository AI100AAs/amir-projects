// 2D geometry helpers over MediaPipe normalized landmarks.
import { LM } from "./landmarks.js";

export function pt(landmarks, idx) {
  const p = landmarks[idx];
  return p ? { x: p.x, y: p.y, z: p.z ?? 0, v: p.visibility ?? 1 } : null;
}

export function visible(landmarks, idx, thresh = 0.5) {
  const p = landmarks[idx];
  return !!p && (p.visibility ?? 1) >= thresh;
}

// Interior angle at point b (in degrees) formed by a-b-c, using x/y only.
export function angle(a, b, c) {
  if (!a || !b || !c) return null;
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const magAb = Math.hypot(abx, aby);
  const magCb = Math.hypot(cbx, cby);
  if (magAb === 0 || magCb === 0) return null;
  let cos = dot / (magAb * magCb);
  cos = Math.max(-1, Math.min(1, cos));
  return (Math.acos(cos) * 180) / Math.PI;
}

// Angle of the vector a->b relative to vertical (straight up), 0..180.
export function angleFromVertical(a, b) {
  if (!a || !b) return null;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const ang = (Math.atan2(Math.abs(dx), -dy) * 180) / Math.PI; // 0 = straight up
  return ang;
}

// Joint angle helper for a named side. Returns null if not confidently visible.
export function jointAngle(landmarks, aIdx, bIdx, cIdx, thresh = 0.4) {
  if (!visible(landmarks, aIdx, thresh) || !visible(landmarks, bIdx, thresh) || !visible(landmarks, cIdx, thresh))
    return null;
  return angle(pt(landmarks, aIdx), pt(landmarks, bIdx), pt(landmarks, cIdx));
}

// Average two angles, ignoring nulls.
export function avg(...vals) {
  const ok = vals.filter((v) => v != null && !Number.isNaN(v));
  if (!ok.length) return null;
  return ok.reduce((s, v) => s + v, 0) / ok.length;
}

// Elbow angle (shoulder-elbow-wrist) averaged across visible arms.
export function elbowAngle(lm) {
  const l = jointAngle(lm, LM.leftShoulder, LM.leftElbow, LM.leftWrist);
  const r = jointAngle(lm, LM.rightShoulder, LM.rightElbow, LM.rightWrist);
  return avg(l, r);
}

// Knee angle (hip-knee-ankle) averaged across visible legs.
export function kneeAngle(lm) {
  const l = jointAngle(lm, LM.leftHip, LM.leftKnee, LM.leftAnkle);
  const r = jointAngle(lm, LM.rightHip, LM.rightKnee, LM.rightAnkle);
  return avg(l, r);
}

// Deepest (most-bent) knee angle — used for lunges where one leg leads.
export function frontKneeAngle(lm) {
  const l = jointAngle(lm, LM.leftHip, LM.leftKnee, LM.leftAnkle);
  const r = jointAngle(lm, LM.rightHip, LM.rightKnee, LM.rightAnkle);
  const ok = [l, r].filter((v) => v != null);
  return ok.length ? Math.min(...ok) : null;
}

// Shoulder abduction: hip-shoulder-wrist. ~10 arms down, ~90 arms at shoulder.
export function shoulderAbduction(lm) {
  const l = jointAngle(lm, LM.leftHip, LM.leftShoulder, LM.leftWrist, 0.3);
  const r = jointAngle(lm, LM.rightHip, LM.rightShoulder, LM.rightWrist, 0.3);
  return avg(l, r);
}

// Hip/torso angle: shoulder-hip-knee. ~180 standing/extended, smaller when folded.
export function hipAngle(lm) {
  const l = jointAngle(lm, LM.leftShoulder, LM.leftHip, LM.leftKnee, 0.3);
  const r = jointAngle(lm, LM.rightShoulder, LM.rightHip, LM.rightKnee, 0.3);
  return avg(l, r);
}

// Body-line straightness: shoulder-hip-ankle. ~180 = plank-straight.
export function bodyLineAngle(lm) {
  const l = jointAngle(lm, LM.leftShoulder, LM.leftHip, LM.leftAnkle, 0.3);
  const r = jointAngle(lm, LM.rightShoulder, LM.rightHip, LM.rightAnkle, 0.3);
  return avg(l, r);
}

// Torso lean from vertical (mid-shoulder to mid-hip), in degrees.
export function torsoLean(lm) {
  const ls = pt(lm, LM.leftShoulder);
  const rs = pt(lm, LM.rightShoulder);
  const lh = pt(lm, LM.leftHip);
  const rh = pt(lm, LM.rightHip);
  if (!ls || !rs || !lh || !rh) return null;
  const sh = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
  const hp = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
  return angleFromVertical(hp, sh);
}

// Fraction of key landmarks that are confidently visible (0..1).
export function bodyVisibility(lm) {
  const keys = [
    LM.leftShoulder, LM.rightShoulder, LM.leftHip, LM.rightHip,
    LM.leftKnee, LM.rightKnee, LM.leftElbow, LM.rightElbow,
  ];
  const seen = keys.filter((k) => visible(lm, k, 0.5)).length;
  return seen / keys.length;
}
