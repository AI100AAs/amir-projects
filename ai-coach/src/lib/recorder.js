// Records a canvas (video + skeleton overlay) to a downloadable WebM, optionally
// mixing in microphone audio. Fully local — nothing is uploaded.

function pickMime() {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm",
    "video/mp4",
  ];
  for (const m of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

export function recordingSupported() {
  return typeof MediaRecorder !== "undefined" && !!HTMLCanvasElement.prototype.captureStream;
}

export class SessionRecorder {
  constructor(canvas, { fps = 30, micStream = null } = {}) {
    this.canvas = canvas;
    const stream = canvas.captureStream(fps);
    if (micStream) micStream.getAudioTracks().forEach((t) => stream.addTrack(t));
    this.mime = pickMime();
    this.rec = new MediaRecorder(stream, this.mime ? { mimeType: this.mime, videoBitsPerSecond: 4_000_000 } : undefined);
    this.chunks = [];
    this.rec.ondataavailable = (e) => { if (e.data && e.data.size) this.chunks.push(e.data); };
    this.startedAt = 0;
  }

  start() {
    this.chunks = [];
    this.startedAt = Date.now();
    this.rec.start(1000);
  }

  get durationSec() {
    return this.startedAt ? Math.round((Date.now() - this.startedAt) / 1000) : 0;
  }

  // File extension matching the negotiated codec (Safari produces mp4, not webm).
  get extension() {
    return (this.mime || "video/webm").includes("mp4") ? "mp4" : "webm";
  }

  stop() {
    return new Promise((resolve) => {
      if (this.rec.state === "inactive") return resolve(null);
      this.rec.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mime || "video/webm" });
        resolve(blob);
      };
      this.rec.stop();
    });
  }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
