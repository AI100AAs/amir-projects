// MediaPipe PoseLandmarker wrapper. Loads the WASM runtime + model fully from
// local /public, runs on the webcam video element, and draws an overlay.
import {
  FilesetResolver,
  PoseLandmarker,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import { LM } from "./landmarks.js";

export { LM };

let landmarker = null;
let currentModel = null;

export async function createPose(model = "lite") {
  const modelFile =
    model === "full"
      ? "/models/pose_landmarker_full.task"
      : "/models/pose_landmarker_lite.task";

  const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
  landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: modelFile, delegate: "GPU" },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  currentModel = model;
  return landmarker;
}

export function getModel() {
  return currentModel;
}

// Detect landmarks for the current video frame.
// Returns { landmarks, worldLandmarks } or null.
export function detect(video, timestampMs) {
  if (!landmarker) return null;
  const result = landmarker.detectForVideo(video, timestampMs);
  const landmarks = result.landmarks?.[0] || null;
  const worldLandmarks = result.worldLandmarks?.[0] || null;
  if (!landmarks) return null;
  return { landmarks, worldLandmarks };
}

// Draw the skeleton on a canvas overlay. `color` tints by form quality.
// `clear:false` composites onto existing pixels (used for the recording canvas).
export function drawPose(ctx, landmarks, { color = "#39d98a", mirror = true, clear = true } = {}) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.save();
  if (clear) ctx.clearRect(0, 0, w, h);
  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  const utils = new DrawingUtils(ctx);
  utils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
    color: "rgba(255,255,255,0.55)",
    lineWidth: 3,
  });
  utils.drawLandmarks(landmarks, {
    color,
    fillColor: color,
    radius: 4,
    lineWidth: 1,
  });
  ctx.restore();
}

export function disposePose() {
  try {
    landmarker?.close();
  } catch {
    /* noop */
  }
  landmarker = null;
  currentModel = null;
}
