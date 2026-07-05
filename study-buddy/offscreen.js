// Offscreen document for playing study session sounds.

const ctx = new (window.AudioContext || window.webkitAudioContext)();

const SOUNDS = {
  start: { type: "sine", freq: 523.25, duration: 0.18, gain: 0.15 },
  warning: { type: "triangle", freq: 392, duration: 0.25, gain: 0.12 },
  intervention: { type: "sawtooth", freq: 261.63, duration: 0.35, gain: 0.1 },
  complete: { type: "sine", freq: 659.25, duration: 0.35, gain: 0.15 },
  stop: { type: "sine", freq: 329.63, duration: 0.3, gain: 0.12 },
};

function playTone({ type, freq, duration, gain }) {
  if (ctx.state === "suspended") ctx.resume();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  g.gain.setValueAtTime(0, ctx.currentTime);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.05);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "playSound" && SOUNDS[msg.name]) {
    playTone(SOUNDS[msg.name]);
  }
});
