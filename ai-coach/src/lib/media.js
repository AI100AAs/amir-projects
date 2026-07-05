// Camera helpers + a clear, actionable reason when the browser blocks it.

const VIDEO = { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" };

// Returns a human message if the camera CAN'T work here, else null.
// The #1 cause on phones: the page is served over plain http on a LAN IP, which
// is not a "secure context", so getUserMedia is unavailable (no prompt at all).
export function secureContextError() {
  if (typeof window === "undefined") return null;
  if (window.isSecureContext && navigator.mediaDevices?.getUserMedia) return null;

  const host = location.hostname || "your-laptop-ip";
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(host)) {
    return "Camera access was blocked. Use a Chromium browser (Chrome or Edge) and allow the camera for this page.";
  }
  return (
    "📱 The camera needs a secure (HTTPS) connection on phones — this page is plain http, " +
    "so the browser won't allow it (that's why there's no permission prompt).\n\n" +
    "On the laptop, stop the dev server and run:\n   npm run dev:lan\n\n" +
    `Then on your phone (same Wi-Fi) open:\n   https://${host}:5173/\n\n` +
    "Safari will warn about the certificate → tap “Show details” → “visit this website”, then allow the camera.\n" +
    "(Plain http only works for the camera on the laptop itself, at http://localhost:5173.)"
  );
}

export function getCameraStream() {
  return navigator.mediaDevices.getUserMedia({ video: VIDEO, audio: false });
}

// Friendly text for a getUserMedia rejection.
export function cameraErrorText(e) {
  if (e?.name === "NotAllowedError") return "Camera permission was denied. Enable it for this site in your browser settings, then tap Enable camera again.";
  if (e?.name === "NotFoundError") return "No camera was found. Connect a webcam (or use a device with a camera) and reload.";
  if (e?.name === "NotReadableError") return "The camera is in use by another app. Close it (Zoom, FaceTime, Photo Booth…) and try again.";
  const m = String(e?.message || "");
  if (m.includes("wasm") || m.includes("forVisionTasks")) return "Couldn't load the pose model. Run `npm run setup:assets` on the laptop.";
  return "Camera setup failed: " + (e?.message || e);
}
