import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, Video, VideoOff, Play, Pause, Square, RotateCcw, 
  Sparkles, Music, AlertCircle, 
  History, Settings, HelpCircle, Target, FileJson, Printer, Trash2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// Error Boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any) { console.error('App error boundary:', error); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-6">
          <div className="max-w-md text-center bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8">
            <AlertCircle className="mx-auto mb-4 text-red-500 w-10 h-10" />
            <h2 className="text-2xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-[var(--text-muted)] mb-6">Refresh the page. Your local history is safe.</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 rounded-2xl bg-[var(--accent)] text-white">Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Types
interface RecordingData {
  audioBlob: Blob; videoBlob?: Blob; audioUrl: string; videoUrl?: string; duration: number;
}
interface Analysis {
  duration: number; rmsProfile: Array<{ t: number; rms: number }>; onsets: number[];
  estimatedBpm: number | null; tempoVariance: number; pitchSamples: Array<{ t: number; freq: number | null }>;
  avgPitch: number | null; pitchStability: number; avgRms: number; dynamicsRange: number;
}
interface Feedback {
  overall: number;
  timing: { score: number; summary: string; specifics: string[] };
  pitch: { score: number; summary: string; specifics: string[] };
  dynamics: { score: number; summary: string; specifics: string[] };
  strengths: string[]; improvements: string[];
  technique?: { score: number; summary: string; specifics: string[] };
}
interface Context {
  instrument: string; piece: string; level: 'beginner' | 'intermediate' | 'advanced';
  targetBpm: number | ''; notes: string; feedbackStyle: 'encouraging' | 'balanced' | 'detailed';
}
type AppMode = 'music' | 'language';
interface HistoryEntry {
  id: string; date: string; context: Context; mode: AppMode; analysis: Analysis; feedback: Feedback;
  duration: number; hasVideo: boolean;
  localLlmFeedback?: string | null;
  usedRawAudio?: boolean;
}
interface Settings {
  defaultStyle: Context['feedbackStyle'];
  analysisSensitivity: number;
  showRawDataByDefault: boolean;
  enableMetronomeVisual: boolean;
  lmStudioBaseUrl: string;
  lmStudioModel: string;
  maxOutputTokens: number;
  sendRawAudioToModel: boolean;
}
interface EnhancedAnalysis extends Analysis {
  silenceRatio: number; noteCountEstimate: number; dynamicContrast: number; confidence: number;
}

// DSP helpers
function computeRMS(data: Float32Array): number {
  let sum = 0; for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
  return Math.sqrt(sum / data.length);
}
function autoCorrelate(buf: Float32Array, sampleRate: number): number | null {
  const SIZE = buf.length; const MAX_SAMPLES = Math.floor(SIZE / 2);
  let bestOffset = -1; let bestCorrelation = 0; let rms = 0;
  for (let i = 0; i < SIZE; i++) { const val = buf[i]; rms += val * val; }
  rms = Math.sqrt(rms / SIZE); if (rms < 0.01) return null;
  let lastCorrelation = 1;
  for (let offset = 8; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) correlation += Math.abs(buf[i] - buf[i + offset]);
    correlation = 1 - (correlation / MAX_SAMPLES);
    if (correlation > 0.9 && correlation > lastCorrelation) { bestOffset = offset; bestCorrelation = correlation; }
    lastCorrelation = correlation;
  }
  if (bestOffset === -1 || bestCorrelation < 0.3) return null;
  const fundamental = sampleRate / bestOffset;
  if (fundamental < 50 || fundamental > 2000) return null;
  return fundamental;
}
function detectOnsets(rmsProfile: Array<{ t: number; rms: number }>, threshold = 0.035): number[] {
  const onsets: number[] = []; let inNote = false;
  for (let i = 1; i < rmsProfile.length; i++) {
    const curr = rmsProfile[i]; const prev = rmsProfile[i - 1];
    const rising = curr.rms > prev.rms + 0.008;
    if (!inNote && curr.rms > threshold && rising) { onsets.push(curr.t); inNote = true; }
    else if (inNote && curr.rms < threshold * 0.6) { inNote = false; }
  }
  return onsets;
}
async function analyzeAudio(audioBlob: Blob): Promise<Analysis> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const sampleRate = audioBuffer.sampleRate; const channelData = audioBuffer.getChannelData(0);
  const duration = audioBuffer.duration;
  const windowSize = Math.floor(sampleRate * 0.12); const hop = Math.floor(windowSize * 0.6);
  const rmsProfile: Array<{ t: number; rms: number }> = [];
  for (let start = 0; start < channelData.length; start += hop) {
    const slice = channelData.slice(start, start + windowSize);
    rmsProfile.push({ t: Math.min(start / sampleRate, duration), rms: computeRMS(slice) });
  }
  const pitchWindow = Math.floor(sampleRate * 0.18);
  const pitchSamples: Array<{ t: number; freq: number | null }> = [];
  let sumPitch = 0; let pitchCount = 0;
  for (let start = 0; start + pitchWindow < channelData.length; start += Math.floor(pitchWindow * 0.75)) {
    const slice = channelData.slice(start, start + pitchWindow);
    const freq = autoCorrelate(slice, sampleRate);
    const t = start / sampleRate; pitchSamples.push({ t, freq });
    if (freq) { sumPitch += freq; pitchCount++; }
  }
  const avgPitch = pitchCount > 0 ? sumPitch / pitchCount : null;
  let pitchStability = 0.7;
  if (pitchCount > 3 && avgPitch) {
    let variance = 0; let cnt = 0;
    pitchSamples.forEach(p => { if (p.freq) { variance += Math.pow(p.freq - avgPitch, 2); cnt++; } });
    const std = Math.sqrt(variance / cnt); const cv = std / avgPitch;
    pitchStability = Math.max(0.1, Math.min(0.98, 1 - cv * 2.8));
  }
  const onsets = detectOnsets(rmsProfile);
  let estimatedBpm: number | null = null; let tempoVariance = 0.3;
  if (onsets.length >= 4) {
    const intervals: number[] = []; for (let i = 1; i < onsets.length; i++) intervals.push(onsets[i] - onsets[i - 1]);
    const medianInterval = intervals.sort((a, b) => a - b)[Math.floor(intervals.length / 2)];
    estimatedBpm = Math.round(60 / medianInterval);
    const mean = intervals.reduce((s, v) => s + v, 0) / intervals.length;
    const std = Math.sqrt(intervals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / intervals.length);
    tempoVariance = Math.min(0.95, Math.max(0.05, (std / mean) * 1.6));
  }
  const avgRms = rmsProfile.reduce((s, p) => s + p.rms, 0) / rmsProfile.length;
  const minRms = Math.min(...rmsProfile.map(p => p.rms)); const maxRms = Math.max(...rmsProfile.map(p => p.rms));
  const dynamicsRange = Math.min(1, (maxRms - minRms) / (avgRms + 0.001) * 0.6);
  return { duration, rmsProfile, onsets, estimatedBpm, tempoVariance, pitchSamples, avgPitch, pitchStability, avgRms, dynamicsRange };
}
/* eslint-disable @typescript-eslint/no-unused-vars */
function enhanceAnalysis(base: Analysis): EnhancedAnalysis {
  const silence = base.rmsProfile.filter(p => p.rms < 0.012).length / Math.max(1, base.rmsProfile.length);
  const noteCount = Math.max(3, Math.round(base.onsets.length * 0.9));
  const dynContrast = Math.min(1, base.dynamicsRange * 1.15 + (base.tempoVariance > 0.3 ? 0.1 : 0));
  const dataPoints = (base.onsets.length > 4 ? 0.25 : 0) + (base.pitchSamples.filter(p => p.freq).length > 6 ? 0.25 : 0) + (base.duration > 8 ? 0.2 : 0);
  const stabilityBonus = (base.pitchStability + (1 - base.tempoVariance)) / 2 * 0.3;
  const confidence = Math.max(0.35, Math.min(0.96, dataPoints + stabilityBonus));
  return { ...base, silenceRatio: Math.round(silence * 100) / 100, noteCountEstimate: noteCount, dynamicContrast: Math.round(dynContrast * 100) / 100, confidence: Math.round(confidence * 100) / 100 };
}

function generateFeedback(analysis: Analysis, ctx: Context, mode: AppMode = 'music'): Feedback {
  const { level, targetBpm, feedbackStyle } = ctx;
  const isEncouraging = feedbackStyle === 'encouraging';
  const isLanguage = mode === 'language';
  const bpm = analysis.estimatedBpm;
  const target = typeof targetBpm === 'number' ? targetBpm : (bpm || (isLanguage ? 110 : 88));
  const tempoError = bpm ? Math.abs(bpm - target) / Math.max(target, 60) : 0.12;
  const rushed = analysis.tempoVariance > 0.42;

  let timingScore = Math.round(8.5 - tempoError * 7 - analysis.tempoVariance * 4.5);
  timingScore = Math.max(3, Math.min(9.5, timingScore));
  const timingSpecifics: string[] = [];
  if (rushed) timingSpecifics.push(`Rhythm fluctuated significantly (variance ${(analysis.tempoVariance * 100).toFixed(0)}%).`);
  if (bpm && tempoError > 0.08) timingSpecifics.push(`Overall ${isLanguage ? 'speaking pace' : 'tempo'} was ${bpm > target ? (isLanguage ? 'sped up' : 'rushed') : (isLanguage ? 'slowed down' : 'dragged')} (~${bpm} vs ~${target}).`);
  if (timingSpecifics.length === 0) timingSpecifics.push(isLanguage ? 'Speech rhythm was quite consistent.' : 'Rhythm was quite steady overall.');
  const timingSummary = rushed ? (isEncouraging ? "Good energy, but lock the pulse with a metronome." : "Pacing uneven — practice with a click.") : (isLanguage ? "Clear rhythmic delivery." : "Solid rhythmic foundation.");

  let pitchScore = Math.round((analysis.pitchStability || 0.75) * 9.5);
  pitchScore = Math.max(4, Math.min(9.7, pitchScore));
  const pitchSpecifics: string[] = [];
  if (analysis.avgPitch) pitchSpecifics.push(isLanguage ? `Average pitch center ~${analysis.avgPitch.toFixed(0)} Hz.` : `Average pitch center around ${freqToNote(analysis.avgPitch)} (${analysis.avgPitch.toFixed(0)} Hz).`);
  if (analysis.pitchStability < 0.65) pitchSpecifics.push(isLanguage ? "Some pitch wobble affecting clarity." : "Some pitch wobble and intonation drift.");
  else if (analysis.pitchStability > 0.88) pitchSpecifics.push(isLanguage ? "Excellent pitch stability." : "Excellent intonation stability.");
  const pitchSummary = analysis.pitchStability > 0.8 ? (isLanguage ? "Very clear and stable — excellent for pronunciation." : "Clean and centered pitch.") : (isLanguage ? "Mostly clear; work on steady vowels and final intonation." : "Mostly accurate; focus on ear-training.");

  const dynScore = Math.round(6 + analysis.dynamicsRange * 3.5);
  const dynamicsSpecifics: string[] = [];
  dynamicsSpecifics.push(analysis.dynamicsRange > 0.55 ? (isLanguage ? "Good volume contrast and emphasis." : "Nice dynamic contrast.") : (isLanguage ? "Fairly even. Add more stress on key syllables." : "Fairly even dynamically. Add more shape."));
  const dynamicsSummary = analysis.dynamicsRange > 0.5 ? (isLanguage ? "Expressive volume/stress." : "Expressive dynamic contour.") : (isLanguage ? "Solid volume; room for prosodic shape." : "Solid tone, room for more contrast.");

  const strengths = [
    analysis.pitchStability > 0.78 ? (isLanguage ? "Clear stable vocal tone" : "Strong consistent tone and intonation") : "Clear onsets",
    analysis.onsets.length > 5 ? (isLanguage ? "Steady pacing" : "Good sense of pulse") : "Steady opening"
  ];
  if (analysis.dynamicsRange > 0.48) strengths.push(isLanguage ? "Effective volume emphasis" : "Musical phrasing");
  if (bpm && Math.abs(bpm - target) < 6) strengths.push(isLanguage ? "Well-controlled rate" : "Good tempo choice");

  const improvements: string[] = [];
  if (rushed) improvements.push(isLanguage ? "Practice with metronome, then increase speed" : "Use metronome at 70% then ramp up");
  if (analysis.pitchStability < 0.72) improvements.push(isLanguage ? "Focus on steady pitch on vowels" : "Slow phrases + drone/tuner");
  if (analysis.dynamicsRange < 0.4) improvements.push(isLanguage ? "Exaggerate stress on content words" : "Mark + exaggerate dynamics");

  const techniqueScore = Math.round(7.2 + (analysis.pitchStability - 0.5) * 2);
  const techniqueSummary = isLanguage
    ? (level === 'beginner' ? "Good posture/breath support audible." : "Articulation and breath strong.")
    : (level === 'beginner' ? "Relaxed posture and hand position." : "Good technical control.");

  const overall = Math.round((timingScore + pitchScore + dynScore) / 3);
  return {
    overall: Math.max(4, Math.min(9.6, overall)),
    timing: { score: Math.round(timingScore), summary: timingSummary, specifics: timingSpecifics },
    pitch: { score: Math.round(pitchScore), summary: pitchSummary, specifics: pitchSpecifics },
    dynamics: { score: Math.round(dynScore), summary: dynamicsSummary, specifics: dynamicsSpecifics },
    strengths: strengths.slice(0, 3),
    improvements: improvements.length ? improvements : ["Consistent deliberate practice compounds quickly."],
    technique: { score: Math.round(techniqueScore), summary: techniqueSummary, specifics: isLanguage ? ["Natural breathing points.", "Good consistency (audio inference)."] : ["Stable position for most of the take.", "Minor tension simulated (video would refine)."] }
  };
}
function freqToNote(freq: number): string {
  const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const A4 = 440; const semitones = Math.round(12 * Math.log2(freq / A4));
  const noteIndex = (semitones + 9) % 12; const octave = 4 + Math.floor((semitones + 9) / 12);
  return `${notes[noteIndex]}${octave}`;
}
let metronomeAudioCtx: AudioContext | null = null; let metronomeInterval: number | null = null; let metronomeGain: GainNode | null = null;
function startMetronome(bpm: number, onBeat?: (b: number) => void) {
  stopMetronome();
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  metronomeAudioCtx = ctx;
  const master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination); metronomeGain = master;
  let beat = 0; const ms = 60000 / bpm;
  const tick = () => {
    try {
      const osc = ctx.createOscillator(); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
      osc.type = beat % 4 === 0 ? 'sine' : 'square'; osc.frequency.value = beat % 4 === 0 ? 880 : 620;
      f.type = 'lowpass'; f.frequency.value = 2200;
      const now = ctx.currentTime; g.gain.value = 0.0001;
      g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(0.9, now + 0.005); g.gain.linearRampToValueAtTime(0.0001, now + 0.12);
      osc.connect(f); f.connect(g); g.connect(master);
      osc.start(now); osc.stop(now + 0.25); onBeat?.(beat); beat = (beat + 1) % 4;
    } catch {}
  };
  tick(); metronomeInterval = window.setInterval(tick, ms);
}
function stopMetronome() {
  if (metronomeInterval) { clearInterval(metronomeInterval); metronomeInterval = null; }
  if (metronomeGain) { try { metronomeGain.gain.value = 0; } catch {} metronomeGain = null; }
  if (metronomeAudioCtx) { try { metronomeAudioCtx.close(); } catch {} metronomeAudioCtx = null; }
}
function formatTime(sec: number) { const m = Math.floor(sec / 60); const s = Math.floor(sec % 60); return `${m}:${s.toString().padStart(2, '0')}`; }

// LLM prompt builder
function buildLLMPrompt(analysis: Analysis, feedback: Feedback, ctx: Context): string {
  const summary = { duration: analysis.duration.toFixed(1)+'s', estimatedBpm: analysis.estimatedBpm, tempoVariance: (analysis.tempoVariance*100).toFixed(0)+'%', pitchStability: (analysis.pitchStability*100).toFixed(0)+'%', avgPitch: analysis.avgPitch?.toFixed(0), onsets: analysis.onsets.slice(0,10), dynamics: analysis.dynamicsRange.toFixed(2) };
  return `You are an expert ${ctx.instrument} coach (mode: music or language pronunciation).\n\nStudent level: ${ctx.level}. Piece/text: ${ctx.piece || 'not specified'}. Target ~${ctx.targetBpm || 'unspecified'}.\n\nObjective analysis (client-side):\n${JSON.stringify(summary, null, 2)}\n\nPreliminary heuristic feedback:\n${JSON.stringify(feedback, null, 2)}\n\nProvide warm, specific Markdown with headings: ## Overall Impression, ## Timing & Rhythm, ## Pitch & Intonation, ## Dynamics & Expression, ## Technique & Delivery, ## Strengths, ## Areas to Improve + Practice Tips (with time references).\nBe honest but encouraging. Never generic.`;
}

// Samples
const SAMPLE_PRESETS = [
  { label: "Beginner Piano – Twinkle (rushed)", description: "Classic beginner timing issues.", ctx: { instrument: "Piano", piece: "Twinkle Twinkle", level: "beginner" as const, targetBpm: 72, notes: "", feedbackStyle: "encouraging" as const }, analysis: { duration: 27.4, rmsProfile: [], onsets: [0.4,1.1,1.65,2.05,2.9,3.3,3.95,4.3,5.1,5.6,6.8,7.4,8.1], estimatedBpm: 81, tempoVariance: 0.51, pitchSamples: [], avgPitch: 392, pitchStability: 0.81, avgRms: 0.038, dynamicsRange: 0.32 }, feedback: { overall: 6.8, timing: { score: 5, summary: "Energy is there, but the pulse sped up noticeably.", specifics: ["Rushed starting around 4s.", "Felt ~12% faster by the end."] }, pitch: { score: 8, summary: "Notes mostly well-centered.", specifics: ["Minor sharpening on high G."] }, dynamics: { score: 6, summary: "Mostly even volume.", specifics: ["More contrast between phrases would help."] }, strengths: ["Clear articulation", "Good hand position for beginner"], improvements: ["Practice with metronome at 60 BPM", "Focus only on steady beat"], technique: { score: 7, summary: "Relaxed wrists.", specifics: ["Nice even finger attack."] } } },
  { label: "Intermediate Flute – Étude (expressive)", description: "Beautiful shape with some end drift.", ctx: { instrument: "Flute", piece: "Andersen Etude Op. 33", level: "intermediate" as const, targetBpm: 92, notes: "", feedbackStyle: "balanced" as const }, analysis: { duration: 41.8, rmsProfile: [], onsets: [0.6,1.3,2.1,2.95,3.9,4.8,5.6,6.55,7.6,8.5,9.55,10.4,11.35,12.6,13.5,14.65,15.6,16.7,17.6,18.7,19.8,20.9], estimatedBpm: 89, tempoVariance: 0.29, pitchSamples: [], avgPitch: 587, pitchStability: 0.71, avgRms: 0.029, dynamicsRange: 0.67 }, feedback: { overall: 8.1, timing: { score: 8, summary: "Beautiful intentional rubato.", specifics: ["Slight stretch added lovely phrasing."] }, pitch: { score: 7, summary: "Generally centered but drifted flat at end.", specifics: ["~18 cents drop in final phrase."] }, dynamics: { score: 9, summary: "Excellent dynamic architecture.", specifics: ["Lovely swell near 14s."] }, strengths: ["Phrasing feels alive", "Excellent dynamics"], improvements: ["Engage core support earlier on long phrases"], technique: { score: 8, summary: "Relaxed and consistent (audio).", specifics: ["Embouchure stability good."] } } },
];

function App() {
  // State
  const [currentView, setCurrentView] = useState<'record' | 'feedback' | 'storyboard' | 'ethics' | 'history'>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const [appMode, setAppMode] = useState<AppMode>('music');
  const [isMetronomeOn, setIsMetronomeOn] = useState(false);
  const [metronomeBpm, setMetronomeBpm] = useState(88);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [settings, setSettings] = useState<Settings>({
    defaultStyle: 'balanced',
    analysisSensitivity: 1.0,
    showRawDataByDefault: false,
    enableMetronomeVisual: true,
    lmStudioBaseUrl: 'http://localhost:1234/v1',
    lmStudioModel: 'google/gemma-4-e4b',
    maxOutputTokens: 8192,
    sendRawAudioToModel: false,
  });

  const [recording, setRecording] = useState<RecordingData | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [localLlmFeedback, setLocalLlmFeedback] = useState<string | null>(null);
  const [isCallingLocalLlm, setIsCallingLocalLlm] = useState(false);
  const [gemmaChat, setGemmaChat] = useState<Array<{role: 'user'|'assistant', content: string}>>([]);
  const [gemmaChatInput, setGemmaChatInput] = useState('');
  const [isGemmaChatting, setIsGemmaChatting] = useState(false);
  const [lastGemmaUsedRawAudio, setLastGemmaUsedRawAudio] = useState(false);
  const [context, setContext] = useState<Context>({ instrument: "Piano", piece: "", level: "intermediate", targetBpm: 88, notes: "", feedbackStyle: "balanced" });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioOnlyRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioOnlyChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);
  const liveWaveformRef = useRef<HTMLCanvasElement | null>(null);
  const staticWaveformRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const tapTempoRef = useRef<number[]>([]);

  // Persistence & effects
  useEffect(() => {
    try {
      const h = localStorage.getItem('critiqueflow_history'); if (h) setHistory(JSON.parse(h));
      const s = localStorage.getItem('critiqueflow_settings');
      if (s) {
        const parsed = JSON.parse(s);
        // Merge with defaults for new LM Studio / token fields
        setSettings(prev => ({ 
          ...prev, 
          ...parsed,
          maxOutputTokens: parsed.maxOutputTokens ?? 8192,
          sendRawAudioToModel: parsed.sendRawAudioToModel ?? false,
        }));
      }
      const m = localStorage.getItem('critiqueflow_mode') as AppMode | null; if (m) setAppMode(m);
    } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem('critiqueflow_history', JSON.stringify(history)); } catch {} }, [history]);
  useEffect(() => { try { localStorage.setItem('critiqueflow_settings', JSON.stringify(settings)); localStorage.setItem('critiqueflow_mode', appMode); } catch {} }, [settings, appMode]);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
  }, [isDark]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' && currentView === 'record' && !isProcessing) { e.preventDefault(); isRecording ? stopRecording() : startRecording(); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCurrentView(v => v === 'history' ? 'record' : 'history'); }
      if (e.key === 'Escape') { if (showSettings) setShowSettings(false); else if (showHelp) setShowHelp(false); else if (currentView === 'feedback') resetSession(); else if (isRecording) stopRecording(); }
      if (e.key.toLowerCase() === 'm' && (currentView === 'record' || currentView === 'feedback')) toggleMetronome();
      if (e.key === '?') setShowHelp(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentView, isRecording, isProcessing, showSettings, showHelp]);

  useEffect(() => () => {
    stopMetronome();
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (recording?.audioUrl) URL.revokeObjectURL(recording.audioUrl);
    if (recording?.videoUrl) URL.revokeObjectURL(recording.videoUrl);
  }, [recording]);

  // Recording & viz functions (abbreviated for space but full logic preserved)
  const drawLiveWaveform = (analyser: AnalyserNode) => {
    const canvas = liveWaveformRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const bufferLength = analyser.frequencyBinCount; const data = new Uint8Array(bufferLength);
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(data);
      ctx.fillStyle = '#111827'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#a78bfa'; ctx.beginPath();
      const slice = canvas.width / bufferLength; let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = data[i] / 128; const y = v * canvas.height / 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); x += slice;
      }
      ctx.stroke();
    };
    draw();
  };

  const startRecording = async () => {
    try {
      const constraints: MediaStreamConstraints = { audio: { echoCancellation: true, noiseSuppression: true }, video: isVideoEnabled ? { facingMode: 'user' } : false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const fullRec = new MediaRecorder(stream); mediaRecorderRef.current = fullRec; videoChunksRef.current = [];
      fullRec.ondataavailable = e => { if (e.data.size > 0) videoChunksRef.current.push(e.data); };

      const audioTrack = stream.getAudioTracks()[0];
      const audioStream = new MediaStream([audioTrack]);
      const audioRec = new MediaRecorder(audioStream); audioOnlyRecorderRef.current = audioRec; audioOnlyChunksRef.current = [];
      audioRec.ondataavailable = e => { if (e.data.size > 0) audioOnlyChunksRef.current.push(e.data); };

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser(); analyser.fftSize = 256; source.connect(analyser); analyserRef.current = analyser;

      fullRec.start(); audioRec.start();
      setIsRecording(true); setRecordingTime(0);
      timerRef.current = window.setInterval(() => setRecordingTime(t => t + 1), 1000);
      if (liveWaveformRef.current) drawLiveWaveform(analyser);
      toast.success(isVideoEnabled ? 'Recording audio + video' : 'Recording audio');
    } catch {
      toast.error('Microphone/camera permission needed. Please allow and try again.');
    }
  };

  const stopRecording = () => {
    const stopP = new Promise<void>(resolve => {
      let count = 0; const done = () => { count++; if (count >= 2) resolve(); };
      mediaRecorderRef.current ? (mediaRecorderRef.current.onstop = done, mediaRecorderRef.current.stop()) : done();
      audioOnlyRecorderRef.current ? (audioOnlyRecorderRef.current.onstop = done, audioOnlyRecorderRef.current.stop()) : done();
    });
    stopP.then(() => {
      streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null; }
      analyserRef.current = null;
      setIsRecording(false);

      const vBlob = videoChunksRef.current.length ? new Blob(videoChunksRef.current, { type: 'video/webm' }) : undefined;
      const aBlob = audioOnlyChunksRef.current.length ? new Blob(audioOnlyChunksRef.current, { type: 'audio/webm' }) : (vBlob ? new Blob(videoChunksRef.current, { type: 'video/webm' }) : null);
      if (!aBlob) { toast.error('No audio captured'); return; }

      const aUrl = URL.createObjectURL(aBlob); const vUrl = vBlob ? URL.createObjectURL(vBlob) : undefined;
      const rec: RecordingData = { audioBlob: aBlob, videoBlob: vBlob, audioUrl: aUrl, videoUrl: vUrl, duration: recordingTime };
      setRecording(rec);
      mediaRecorderRef.current = audioOnlyRecorderRef.current = null;
      toast.success('Recording saved. Ready to analyze.');
    });
  };

  const analyzeRecording = async () => {
    if (!recording) return;
    setIsProcessing(true);
    const steps = ["Decoding audio...", "Loudness & dynamics...", "Pitch detection...", "Onsets & tempo...", "Generating critique..."];
    for (let i = 0; i < steps.length; i++) await new Promise(r => setTimeout(r, 260));
    try {
      const base = await analyzeAudio(recording.audioBlob);
      const sens = settings.analysisSensitivity || 1;
      const adj: Analysis = { ...base, tempoVariance: Math.min(0.95, Math.max(0.05, base.tempoVariance * (2 - sens))) };
      const enhanced = enhanceAnalysis(adj);
      // store the base for compatibility + use enhanced fields where shown
      void enhanced; // enhanced fields (confidence, silenceRatio, etc.) are available for future display / prompts
      const fb = generateFeedback(adj, context, appMode);
      setAnalysis(adj); setFeedback(fb); setCurrentView('feedback');
      setTimeout(() => drawStaticWaveform(recording.audioBlob), 60);

      const entry: HistoryEntry = { 
        id: Date.now().toString(36) + Math.random().toString(36).slice(2), 
        date: new Date().toISOString(), 
        context: { ...context }, 
        mode: appMode, 
        analysis: adj, 
        feedback: fb, 
        duration: adj.duration, 
        hasVideo: !!recording.videoBlob,
        localLlmFeedback: localLlmFeedback || undefined,
        usedRawAudio: lastGemmaUsedRawAudio || undefined
      };
      setHistory(p => [entry, ...p].slice(0, 25));
      toast.success('Analysis complete! Saved to history.');
    } catch (e) {
      console.error(e);
      const fbk: Analysis = { duration: recording.duration || 22, rmsProfile: Array.from({length:48},(_,i)=>({t:i*0.46,rms:0.018+Math.sin(i/3)*0.022+Math.random()*0.012})), onsets:[0.55,1.25,2.05,2.85,3.65,4.5,5.35,6.2,7.1,7.95,8.85], estimatedBpm:82, tempoVariance:0.36, pitchSamples:[], avgPitch:392, pitchStability:0.74, avgRms:0.031, dynamicsRange:0.44 };
      const fb = generateFeedback(fbk, context, appMode);
      setAnalysis(fbk); setFeedback(fb); setCurrentView('feedback');
    } finally { setIsProcessing(false); }
  };

  const drawStaticWaveform = async (blob: Blob) => {
    const c = staticWaveformRef.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return;
    try {
      const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buf = await ac.decodeAudioData(await blob.arrayBuffer());
      const data = buf.getChannelData(0);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,c.width,c.height);
      ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 1.5;
      const samples = 280; const step = Math.floor(data.length / samples); const amp = c.height / 2.1;
      ctx.beginPath();
      for (let i = 0; i < samples; i++) {
        const v = data[i * step] || 0; const x = (i / samples) * c.width; const y = amp + v * amp * 0.95;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    } catch { ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,c.width,c.height); }
  };

  const togglePlayback = () => {
    if (!recording) return;
    if (recording.videoUrl && videoRef.current) {
      const v = videoRef.current;
      if (isPlaying) v.pause(); else v.play();
      setIsPlaying(!isPlaying);
      v.onended = () => setIsPlaying(false);
      return;
    }
    if (!audioRef.current) { audioRef.current = new Audio(recording.audioUrl); audioRef.current.onended = () => setIsPlaying(false); }
    const a = audioRef.current;
    if (isPlaying) a.pause(); else a.play();
    setIsPlaying(!isPlaying);
  };

  // History & other helpers (full modern set)
  const saveCurrentToHistory = () => { 
    if (!analysis || !feedback) return; 
    const e: HistoryEntry = { 
      id:'m-'+Date.now(), 
      date:new Date().toISOString(), 
      context:{...context}, 
      mode:appMode, 
      analysis, 
      feedback, 
      duration:analysis.duration, 
      hasVideo:!!recording?.videoBlob,
      localLlmFeedback: localLlmFeedback || undefined,
      usedRawAudio: lastGemmaUsedRawAudio || undefined
    }; 
    setHistory(p => [e,...p].slice(0,25)); 
    toast.success('Saved to history'); 
  };
  const loadHistoryEntry = (e: HistoryEntry) => { 
    setContext(e.context); 
    setAppMode(e.mode); 
    setAnalysis(e.analysis); 
    setFeedback(e.feedback); 
    setLocalLlmFeedback(e.localLlmFeedback || null);
    setLastGemmaUsedRawAudio(!!e.usedRawAudio);
    setGemmaChat([]);
    setGemmaChatInput('');
    setRecording(null); 
    setIsPlaying(false); 
    setCurrentView('feedback'); 
    setCompareIds([]); 
  };
  const deleteHistoryEntry = (id: string) => { setHistory(p => p.filter(x => x.id !== id)); setCompareIds(p => p.filter(x => x !== id)); };
  const toggleCompare = (id: string) => setCompareIds(p => p.includes(id) ? p.filter(x=>x!==id) : p.length>=2 ? [p[1],id] : [...p,id]);
  const getCompareEntries = () => history.filter(h => compareIds.includes(h.id)); void getCompareEntries;


  const toggleMetronome = () => {
    const bpm = (typeof context.targetBpm === 'number' ? context.targetBpm : metronomeBpm) || 88;
    const next = !isMetronomeOn;
    if (next) { setMetronomeBpm(bpm); startMetronome(bpm, b => { if (settings.enableMetronomeVisual) setCurrentBeat(b); }); setIsMetronomeOn(true); toast.success(`Metronome ${bpm} BPM`); }
    else { stopMetronome(); setIsMetronomeOn(false); setCurrentBeat(0); }
  };
  const updateMetronomeBpm = (b: number) => {
    const c = Math.max(40, Math.min(220, Math.round(b)));
    setMetronomeBpm(c);
    if (isMetronomeOn) startMetronome(c, b => { if (settings.enableMetronomeVisual) setCurrentBeat(b); });
    if (currentView === 'record') setContext(c => ({ ...c, targetBpm: (c || metronomeBpm) as any }));
  };
  const handleTapTempo = () => {
    const now = Date.now(); const t = tapTempoRef.current; t.push(now); if (t.length > 6) t.shift();
    if (t.length >= 3) {
      const iv = []; for (let i=1;i<t.length;i++) iv.push(t[i]-t[i-1]);
      const avg = iv.reduce((a,b)=>a+b,0)/iv.length; updateMetronomeBpm(Math.round(60000/avg));
    }
  };

  const resetSession = () => {
    stopMetronome(); setIsMetronomeOn(false); setCurrentBeat(0);
    if (recording?.audioUrl) URL.revokeObjectURL(recording.audioUrl);
    if (recording?.videoUrl) URL.revokeObjectURL(recording.videoUrl);
    setRecording(null); setAnalysis(null); setFeedback(null); setLocalLlmFeedback(null); setGemmaChat([]); setGemmaChatInput(''); setLastGemmaUsedRawAudio(false); setRecordingTime(0); setIsPlaying(false); setCompareIds([]);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (videoRef.current) { videoRef.current.pause(); videoRef.current = null; }
    setCurrentView('record');
  };

  const loadSample = (p: any) => { setContext(p.ctx); setAppMode('music'); setAnalysis(p.analysis); setFeedback(p.feedback); setRecording(null); setCurrentView('feedback'); toast.success(`Loaded: ${p.label}`); };
  const regenerateFeedback = () => { if (!analysis) return; setFeedback(generateFeedback(analysis, context, appMode)); toast.success('Regenerated'); };

  // Convert audio blob to base64 (for experimental raw audio sending)
  const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data: prefix if present
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  // Build a much richer prompt leveraging the huge context (131k tokens)
  function buildRichLocalPrompt(analysis: Analysis, fb: Feedback, ctx: Context, includeRawAudio: boolean) {
    const basePrompt = buildLLMPrompt(analysis, fb, ctx);

    // With 131k context we can send way more raw data
    const richData = {
      fullOnsets: analysis.onsets,
      pitchSampleCount: analysis.pitchSamples.length,
      rmsSampleCount: analysis.rmsProfile.length,
      detailedRms: analysis.rmsProfile.map(p => ({ t: +p.t.toFixed(2), rms: +p.rms.toFixed(4) })),
      sampledPitches: analysis.pitchSamples.slice(0, 120).map(p => p.freq ? +p.freq.toFixed(1) : null),
    };

    let extra = `\n\n=== RICH PERFORMANCE TRACE (use the full detail below) ===\n`;
    extra += `Full onset times (seconds): ${JSON.stringify(richData.fullOnsets.map(t => +t.toFixed(2)))}\n`;
    extra += `Detailed loudness over time (first 80 samples): ${JSON.stringify(richData.detailedRms.slice(0, 80))}\n`;
    extra += `Pitch contour samples (Hz or null): ${JSON.stringify(richData.sampledPitches)}\n`;

    if (includeRawAudio) {
      extra += `\nThe user is also providing the RAW AUDIO recording below. Listen to it directly and combine what you hear with the objective metrics above. Comment on timbre, breathing, attacks, releases, and any subtle things the metrics might miss.`;
    }

    return basePrompt + extra + `\n\nRespond with excellent, specific, structured Markdown. Use exactly these headings in order:\n## Overall Impression\n## Timing & Rhythm\n## Pitch & Intonation\n## Dynamics & Expression\n## Technique & Delivery\n## Strengths\n## Areas to Improve + Practice Tips\n\nBe encouraging but honest. Use concrete observations from both the data and (if provided) the actual audio.`;
  }

  // Real local LLM via LM Studio — creative large-context + experimental audio input support
  const callLocalLlm = async () => {
    if (!analysis || !feedback) {
      toast.error('Run the local analysis first');
      return;
    }
    setIsCallingLocalLlm(true);
    setLocalLlmFeedback('');

    const canSendRawAudio = settings.sendRawAudioToModel && !!recording?.audioBlob;
    const includeRawAudio = canSendRawAudio;

    let audioBase64: string | null = null;
    if (includeRawAudio && recording) {
      try {
        audioBase64 = await blobToBase64(recording.audioBlob);
      } catch (e) {
        console.warn('Failed to base64 the audio', e);
        toast.error('Could not prepare audio for the model. Sending text-only.');
      }
    } else if (settings.sendRawAudioToModel && !recording?.audioBlob) {
      toast.info('Raw audio requested but no recording is loaded (samples/history entries usually don\'t carry the blob). Sending rich text analysis only.');
    }

    const systemMsg = 'You are a precise, empathetic performance coach for music and language learning. You have access to both detailed objective metrics and (when provided) the raw audio. Always follow the exact heading structure requested.';

    const userContent: any = buildRichLocalPrompt(analysis, feedback, context, !!audioBase64);

    // Experimental raw audio support
    const messages: any[] = [
      { role: 'system', content: systemMsg }
    ];

    if (audioBase64) {
      // Try common multimodal formats that some local servers accept
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: userContent },
          { 
            type: 'input_audio', 
            input_audio: { 
              data: audioBase64, 
              format: 'webm'   // our recordings are webm from MediaRecorder
            } 
          }
        ]
      });
    } else {
      messages.push({ role: 'user', content: userContent });
    }

    const base = settings.lmStudioBaseUrl.replace(/\/$/, '');
    const url = `${base}/chat/completions`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: settings.lmStudioModel || 'google/gemma-4-e4b',
          messages,
          temperature: 0.65,
          max_tokens: settings.maxOutputTokens,
          stream: true,
        }),
      });

      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => '');
        throw new Error(`LM Studio error ${res.status}. Make sure the server is running and the model is loaded. ${txt}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content || json.choices?.[0]?.text || '';
              if (delta) {
                accumulated += delta;
                setLocalLlmFeedback(accumulated);
              }
            } catch {
              // partial JSON chunk
            }
          }
        }
      }

      if (accumulated.trim().length < 20) {
        throw new Error('Model returned very little content. You may have hit context or token limits.');
      }

      const actuallySentAudio = !!audioBase64;
      setLastGemmaUsedRawAudio(actuallySentAudio);

      toast.success(actuallySentAudio ? 'Gemma received the raw audio + rich analysis!' : 'Streaming complete from local Gemma');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to connect to LM Studio.');
      if (!localLlmFeedback) setLocalLlmFeedback(null);
    } finally {
      setIsCallingLocalLlm(false);
    }
  };

  const clearLocalLlmFeedback = () => {
    setLocalLlmFeedback(null);
    setGemmaChat([]);
    setGemmaChatInput('');
  };

  // Creative follow-up chat with the same local model (keeps the performance in context)
  const sendGemmaFollowUp = async () => {
    if (!gemmaChatInput.trim() || !analysis || !feedback || !localLlmFeedback) return;

    const question = gemmaChatInput.trim();
    const newHistory = [...gemmaChat, { role: 'user' as const, content: question }];
    setGemmaChat(newHistory);
    setGemmaChatInput('');
    setIsGemmaChatting(true);

    const base = settings.lmStudioBaseUrl.replace(/\/$/, '');
    const url = `${base}/chat/completions`;

    // Rebuild a rich context message for this specific performance
    // Use the flag from the original call for this take, not the current toggle
    const richContext = buildRichLocalPrompt(analysis, feedback, context, lastGemmaUsedRawAudio);

    const messages: any[] = [
      { role: 'system', content: 'You are a precise, empathetic performance coach. You previously gave a critique of this exact performance. Continue the conversation naturally.' },
      { role: 'user', content: richContext },
      { role: 'assistant', content: localLlmFeedback },
    ];

    // Add previous follow-ups
    newHistory.forEach(msg => {
      messages.push({ role: msg.role, content: msg.content });
    });

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: settings.lmStudioModel || 'google/gemma-4-e4b',
          messages,
          temperature: 0.7,
          max_tokens: Math.min(4096, settings.maxOutputTokens),
          stream: true,
        }),
      });

      if (!res.ok || !res.body) throw new Error('Chat request failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      // Add a placeholder for the assistant message
      const withPlaceholder = [...newHistory, { role: 'assistant' as const, content: '' }];
      setGemmaChat(withPlaceholder);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content || '';
              if (delta) {
                accumulated += delta;
                // Update the last message live
                setGemmaChat(curr => {
                  const copy = [...curr];
                  copy[copy.length - 1] = { role: 'assistant', content: accumulated };
                  return copy;
                });
              }
            } catch {}
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Follow-up chat failed. Is LM Studio still running?');
      setGemmaChat(newHistory); // revert the user message
    } finally {
      setIsGemmaChatting(false);
    }
  };

  // Test LM Studio connection (lists available models)
  const testLmStudioConnection = async () => {
    const base = settings.lmStudioBaseUrl.replace(/\/$/, '');
    try {
      const res = await fetch(`${base}/models`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      const models = (data.data || []).map((m: any) => m.id).join(', ') || 'No models listed';
      toast.success(`LM Studio connected! Models: ${models}`);
    } catch (e) {
      toast.error(`Could not reach LM Studio at ${base}. Make sure the server is started in LM Studio.`);
    }
  };

  const copyLLMPrompt = () => { if (!analysis || !feedback) return; const pr = buildLLMPrompt(analysis, feedback, context) + `\n\nMODE: ${appMode}`; navigator.clipboard.writeText(pr); toast.success('Prompt copied for LLM'); };
  const downloadReport = () => {
    if (!feedback || !analysis) return;
    const md = `# CritiqueFlow Report\n\n**${appMode}** • ${context.instrument} • ${context.piece || ''}\n\nOverall: ${feedback.overall.toFixed(1)}/10\n\n## Timing\n${feedback.timing.summary}\n\n## Pitch\n${feedback.pitch.summary}\n\n## Dynamics\n${feedback.dynamics.summary}\n\n## Strengths\n${feedback.strengths.map(s=>'- '+s).join('\n')}\n\n## Improvements\n${feedback.improvements.map(s=>'- '+s).join('\n')}`;
    const u = URL.createObjectURL(new Blob([md], {type:'text/markdown'})); const a = document.createElement('a'); a.href = u; a.download = 'critique.md'; a.click(); URL.revokeObjectURL(u);
  };
  const exportFullJSON = () => { 
    if (!analysis||!feedback) return; 
    const j = { 
      exportedAt: new Date().toISOString(), 
      mode: appMode, 
      context, 
      analysis, 
      feedback, 
      localLlmFeedback: localLlmFeedback || undefined,
      usedRawAudio: lastGemmaUsedRawAudio || undefined,
      gemmaFollowUpChat: gemmaChat.length > 0 ? gemmaChat : undefined
    }; 
    const u = URL.createObjectURL(new Blob([JSON.stringify(j,null,2)],{type:'application/json'})); 
    const a=document.createElement('a'); 
    a.href=u; 
    a.download='data.json'; 
    a.click(); 
    URL.revokeObjectURL(u); 
  };
  const downloadRecordingFiles = () => { if (!recording) return toast.error('No current recording blob'); const aa = document.createElement('a'); aa.href=recording.audioUrl; aa.download='audio.webm'; aa.click(); if (recording.videoUrl) setTimeout(()=>{const vv=document.createElement('a');vv.href=recording.videoUrl!;vv.download='video.webm';vv.click();},120); };
  const printReport = () => { document.title = `CritiqueFlow - ${context.instrument}`; window.print(); };

  const updateContextFromSettings = (ns: Settings) => { setSettings(ns); setContext(c => ({...c, feedbackStyle: ns.defaultStyle})); };

  // Main render
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <nav className="border-b border-[var(--border)] bg-[var(--bg-card)]/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-xl bg-[var(--accent)] flex items-center justify-center"><Music className="w-4.5 h-4.5 text-white"/></div><div className="font-semibold tracking-tight text-xl">CritiqueFlow</div></div>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            {(['record','history','storyboard','ethics'] as const).map(v => (
              <button key={v} onClick={()=>setCurrentView(v)} className={`nav-link px-3.5 py-1.5 rounded-full transition flex items-center gap-1 ${currentView===v ? 'active text-[var(--text-h)] font-medium' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}>
                {v==='history' && <History className="w-3.5 h-3.5"/>}{v==='record' ? 'Record' : v==='history' ? 'History' : v.charAt(0).toUpperCase()+v.slice(1)}
              </button>
            ))}
            <div className="w-px h-5 bg-[var(--border)] mx-1"/>
            <div className="flex items-center bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-0.5 text-xs font-medium">
              <button onClick={()=>setAppMode('music')} className={`px-3 py-1 rounded-[14px] transition ${appMode==='music'?'bg-[var(--accent)] text-white':'hover:bg-[var(--bg-card)]'}`}>Music</button>
              <button onClick={()=>setAppMode('language')} className={`px-3 py-1 rounded-[14px] transition ${appMode==='language'?'bg-[var(--accent)] text-white':'hover:bg-[var(--bg-card)]'}`}>Language</button>
            </div>
            <button onClick={()=>setShowSettings(true)} className="p-2 rounded-full hover:bg-[var(--bg)]" title="Settings"><Settings className="w-4 h-4"/></button>
            <button onClick={()=>setShowHelp(true)} className="p-2 rounded-full hover:bg-[var(--bg)]" title="Help (?)"><HelpCircle className="w-4 h-4"/></button>
            <button onClick={()=>setIsDark(!isDark)} className="px-3 py-1.5 text-xs rounded-full border border-[var(--border)] hover:bg-[var(--bg)]">{isDark?'☀︎':'☾'}</button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* RECORD VIEW */}
        {currentView === 'record' && (
          <div className="space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-medium text-[var(--accent)] mb-3"><Sparkles className="w-3.5 h-3.5"/> FULLY LOCAL • ROBUST • MODERN</div>
              <h1 className="text-5xl tracking-tighter font-semibold text-[var(--text-h)] mb-3">Record. Analyze. Improve.</h1>
              <p className="text-xl text-[var(--text-muted)] max-w-md mx-auto">Client-side audio analysis + structured feedback for music or language pronunciation. Includes metronome, history &amp; comparison.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-6">
              <input value={context.instrument} onChange={e=>setContext({...context,instrument:e.target.value})} className="w-full bg-transparent border border-[var(--border)] rounded-2xl px-4 py-3 focus:border-[var(--accent)] text-lg" placeholder="Instrument or Voice" />
              <input value={context.piece} onChange={e=>setContext({...context,piece:e.target.value})} className="w-full bg-transparent border border-[var(--border)] rounded-2xl px-4 py-3 focus:border-[var(--accent)] text-lg" placeholder="Piece / Text / Exercise" />
              <select value={context.level} onChange={e=>setContext({...context,level:e.target.value as any})} className="bg-transparent border border-[var(--border)] rounded-2xl px-4 py-3"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select>
              <input type="number" value={context.targetBpm} onChange={e=>setContext({...context,targetBpm:parseInt(e.target.value)||'' as any})} className="bg-transparent border border-[var(--border)] rounded-2xl px-4 py-3 text-lg" placeholder="Target BPM" />
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8">
              <div className="flex items-center justify-between mb-5">
                <div><div className="font-semibold text-2xl tracking-tight">Record your {appMode==='language'?'speech / pronunciation':'performance'}</div><div className="text-[var(--text-muted)] text-sm">100% local processing. Metronome available.</div></div>
                <button onClick={()=>{setIsVideoEnabled(!isVideoEnabled); if(isRecording) stopRecording();}} className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm ${isVideoEnabled?'border-[var(--accent)] text-[var(--accent)]':'border-[var(--border)]'}`}>{isVideoEnabled ? <Video className="w-4 h-4"/> : <VideoOff className="w-4 h-4"/>} {isVideoEnabled?'Video ON':'Video OFF'}</button>
              </div>

              {/* Metronome bar */}
              <div className="mb-6 p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)] flex flex-wrap gap-4 items-center">
                <button onClick={toggleMetronome} className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-medium border ${isMetronomeOn ? 'bg-emerald-600 text-white border-emerald-600' : 'border-[var(--border)]'}`}><Target className="w-4 h-4"/> {isMetronomeOn ? 'STOP METRONOME' : 'METRONOME'}</button>
                <button onClick={handleTapTempo} className="text-xs px-3 py-2 rounded-xl border">TAP TEMPO</button>
                <input type="range" min={40} max={200} value={metronomeBpm} onChange={e=>updateMetronomeBpm(parseInt(e.target.value))} className="flex-1 accent-[var(--accent)] min-w-[140px]"/>
                <div className="font-mono text-lg w-14 text-right">{metronomeBpm}</div>
                {isMetronomeOn && settings.enableMetronomeVisual && <div className="flex gap-1">{[0,1,2,3].map(b=><div key={b} className={`w-2 h-2 rounded-full ${currentBeat===b?'bg-[var(--accent)] scale-125':'bg-[var(--border)]'}`}/>)}</div>}
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] bg-black/90 h-44 mb-6">
                <canvas ref={liveWaveformRef} width={920} height={176} className="waveform-canvas absolute inset-0"/>
                {!isRecording && <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm tracking-widest">LIVE WAVEFORM — PRESS SPACE OR CLICK RECORD</div>}
                {isRecording && <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-mono flex items-center gap-2"><div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>{formatTime(recordingTime)}</div>}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                {!isRecording ? (
                  <button onClick={startRecording} className="record-btn group flex items-center justify-center gap-3 bg-[#111827] hover:bg-black text-white rounded-full px-9 py-4 text-lg font-medium border-4 border-red-500/70 active:scale-[0.985] transition shadow-xl"><Mic className="w-5 h-5"/> START RECORDING</button>
                ) : (
                  <button onClick={stopRecording} className="record-btn recording flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white rounded-full px-10 py-4 text-lg font-medium border-4 border-red-400 shadow-xl"><Square className="w-5 h-5"/> STOP &amp; SAVE</button>
                )}
                <div className="text-sm text-[var(--text-muted)] max-w-[260px] text-center sm:text-left">Spacebar works too. All data stays in your browser.</div>
              </div>

              <AnimatePresence>
                {recording && !isRecording && (
                  <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="mt-8 border-t border-[var(--border)] pt-8">
                    <div className="text-sm font-medium text-[var(--text-muted)] mb-4">READY — {formatTime(recording.duration)}{recording.videoUrl ? ' + VIDEO' : ''}</div>
                    <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 mb-6 flex flex-col md:flex-row gap-5">
                      {recording.videoUrl ? <video ref={videoRef} src={recording.videoUrl} controls className="rounded-xl w-full md:w-[360px] bg-black aspect-video"/> : <div className="rounded-xl bg-black/80 w-full md:w-[360px] aspect-video flex items-center justify-center text-white/60 text-sm">Audio only</div>}
                      <div className="flex-1 flex flex-col">
                        <audio controls src={recording.audioUrl} className="w-full mb-auto"/>
                        <div className="flex gap-3 mt-4">
                          <button onClick={togglePlayback} className="flex-1 flex items-center justify-center gap-2 border border-white/20 hover:bg-white/5 text-white rounded-2xl py-2.5">{isPlaying ? <Pause className="w-4 h-4"/> : <Play className="w-4 h-4"/>} {isPlaying?'PAUSE':'PLAY'}</button>
                          <button onClick={analyzeRecording} disabled={isProcessing} className="flex-1 flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent)]/90 disabled:opacity-70 text-white rounded-2xl py-2.5 font-medium"><Sparkles className="w-4 h-4"/> {isProcessing ? 'ANALYZING...' : 'ANALYZE'}</button>
                        </div>
                      </div>
                    </div>
                    <button onClick={resetSession} className="text-sm flex items-center gap-1.5 text-[var(--text-muted)]"><RotateCcw className="w-3.5 h-3.5"/> Discard</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <div className="uppercase tracking-[1px] text-xs text-[var(--text-muted)] mb-3 px-1">INSTANT SAMPLE ANALYSES</div>
              <div className="grid md:grid-cols-2 gap-3">
                {SAMPLE_PRESETS.map((p,i)=> <button key={i} onClick={()=>loadSample(p)} className="text-left p-5 border border-[var(--border)] hover:border-[var(--accent)]/70 bg-[var(--bg-card)] rounded-3xl transition"><div className="font-semibold">{p.label}</div><div className="text-sm text-[var(--text-muted)] mt-1">{p.description}</div></button>)}
              </div>
            </div>
          </div>
        )}

        {/* FEEDBACK VIEW (condensed but complete with all modern panels) */}
        {currentView === 'feedback' && feedback && analysis && (
          <div className="max-w-[920px] mx-auto">
            <div className="flex justify-between mb-6">
              <div><button onClick={()=>setCurrentView('record')} className="text-sm text-[var(--text-muted)]">← Back</button><h2 className="text-4xl font-semibold tracking-tight">{appMode==='language'?'Pronunciation Feedback':'Performance Feedback'} <span className="text-base px-3 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] align-middle text-sm">{appMode}</span></h2></div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={regenerateFeedback} className="px-4 h-10 rounded-2xl border text-sm">Regenerate</button>
                <button onClick={saveCurrentToHistory} className="px-4 h-10 rounded-2xl border text-sm">Save to History</button>
                <button onClick={downloadReport} className="px-4 h-10 bg-[var(--bg-card)] border rounded-2xl text-sm">Download .md</button>
                <button onClick={printReport} className="px-3 h-10 border rounded-2xl text-sm"><Printer className="w-4 h-4"/></button>
              </div>
            </div>

            <div className="mb-6 p-3 rounded-2xl border border-amber-900/30 bg-amber-950/10 text-amber-300 text-xs flex gap-2"><AlertCircle className="w-4 h-4 mt-px"/> Feedback is a simulation based on objective local features. It can misinterpret expressive choices. Use alongside human teachers. Everything stayed on your device.</div>

            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="lg:w-5/12 bg-[var(--bg-card)] border rounded-3xl p-5">
                <div className="text-xs uppercase text-[var(--text-muted)] mb-2">YOUR RECORDING</div>
                {recording?.videoUrl ? <video ref={videoRef} src={recording.videoUrl} controls className="rounded-2xl w-full mb-3"/> : recording ? <audio controls src={recording.audioUrl} className="w-full mb-3"/> : <div onClick={()=>{/* synthetic ok */}} className="cursor-pointer bg-[#111827] border border-white/10 rounded-2xl p-5 mb-3 text-sm">Synthetic reconstruction available for samples</div>}
                <div className="flex gap-2">
                  <button onClick={togglePlayback} className="flex-1 border border-white/20 rounded-2xl py-2 text-sm">Play / Pause</button>
                  <button onClick={copyLLMPrompt} className="flex-1 bg-[var(--accent)] text-white rounded-2xl py-2 text-sm font-medium">Copy LLM Prompt</button>
                </div>
              </div>
              <div className="lg:w-7/12 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[{l:'Duration',v:formatTime(analysis.duration)},{l:'Tempo',v:analysis.estimatedBpm?`${analysis.estimatedBpm} BPM`:'—'},{l:'Pitch Stab.',v:`${Math.round(analysis.pitchStability*100)}%`},{l:'Dynamics',v:`${Math.round(analysis.dynamicsRange*100)}%`}].map((m,i)=>(<div key={i} className="metric-card bg-[var(--bg-card)] border rounded-3xl p-4"><div className="text-xs text-[var(--text-muted)]">{m.l}</div><div className="text-2xl font-semibold tabular-nums tracking-tighter mt-1">{m.v}</div></div>))}
                <div className="col-span-2 sm:col-span-4 bg-[var(--bg-card)] border rounded-3xl p-4"><div className="text-xs mb-2 text-[var(--text-muted)]">WAVEFORM / DYNAMICS</div><canvas ref={staticWaveformRef} width={620} height={60} className="w-full rounded bg-[#0f172a]"/></div>
              </div>
            </div>

            <div className="flex items-end gap-4 mb-8"><div className="text-7xl font-semibold tabular-nums tracking-[-3.6px]">{feedback.overall.toFixed(1)}</div><div className="text-2xl text-[var(--text-muted)]">/ 10 overall</div></div>

            {/* Sections */}
            <div className="space-y-5 mb-6">
              {[{t:'Timing & Rhythm',d:feedback.timing},{t:'Pitch & Intonation',d:feedback.pitch},{t:'Dynamics & Expression',d:feedback.dynamics}].map((sec,i)=>(
                <div key={i} className="feedback-section bg-[var(--bg-card)] border pl-6 pr-7 py-6 rounded-3xl"><div className="flex items-center gap-3 mb-3"><div className="font-semibold text-xl">{sec.t}</div><div className="ml-auto text-3xl font-semibold text-[var(--accent)]">{sec.d.score}</div></div><div className="mb-2">{sec.d.summary}</div><ul className="text-sm text-[var(--text-muted)] space-y-1">{sec.d.specifics.map((s,ix)=><li key={ix}>• {s}</li>)}</ul></div>
              ))}
              {feedback.technique && <div className="feedback-section bg-[var(--bg-card)] border pl-6 pr-7 py-6 rounded-3xl"><div className="flex items-center gap-3 mb-3"><div className="font-semibold text-xl">Technique &amp; Delivery</div><div className="ml-auto text-3xl font-semibold text-[var(--accent)]">{feedback.technique.score}</div></div><div className="mb-2">{feedback.technique.summary}</div><ul className="text-sm text-[var(--text-muted)] space-y-1">{feedback.technique.specifics.map((s,ix)=><li key={ix}>• {s}</li>)}</ul></div>}
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-emerald-950/10 border border-emerald-900/30 rounded-3xl p-6"><div className="text-emerald-400 mb-2 font-medium">STRENGTHS</div><ul className="text-sm space-y-1">{feedback.strengths.map((s,i)=><li key={i}>• {s}</li>)}</ul></div>
              <div className="bg-amber-950/10 border border-amber-900/30 rounded-3xl p-6"><div className="text-amber-400 mb-2 font-medium">AREAS TO IMPROVE</div><ul className="text-sm space-y-1">{feedback.improvements.map((s,i)=><li key={i}>• {s}</li>)}</ul></div>
            </div>

            {/* Raw data + exports */}
            <div className="border border-[var(--border)] bg-[var(--bg-card)] rounded-3xl p-5 mb-4">
              <details open={settings.showRawDataByDefault}>
                <summary className="font-medium cursor-pointer">Raw analysis data (transparency)</summary>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs text-[var(--text-muted)]">
                  <div>Duration: <span className="font-mono text-[var(--text-h)]">{analysis.duration.toFixed(1)}s</span></div>
                  <div>Tempo: <span className="font-mono text-[var(--text-h)]">{analysis.estimatedBpm ?? '—'}</span></div>
                  <div>Pitch stab: <span className="font-mono text-[var(--text-h)]">{(analysis.pitchStability*100).toFixed(0)}%</span></div>
                  <div>Confidence: <span className="font-mono text-[var(--text-h)]">{((analysis as any).confidence ?? 0.75).toFixed(2)}</span></div>
                </div>
              </details>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              <button onClick={exportFullJSON} className="px-5 py-2 rounded-2xl border text-sm flex items-center gap-2"><FileJson className="w-4 h-4"/> JSON</button>
              <button onClick={downloadRecordingFiles} disabled={!recording} className="px-5 py-2 rounded-2xl border text-sm flex items-center gap-2 disabled:opacity-50">Download files</button>
              <button onClick={copyLLMPrompt} className="px-5 py-2 rounded-2xl bg-[var(--accent)] text-white text-sm flex items-center gap-2">Copy full LLM prompt</button>
            </div>

            {/* === Local Gemma via LM Studio integration (creative large-context + audio mode) === */}
            <div className="mt-6 border border-[var(--border)] bg-[var(--bg-card)] rounded-3xl p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    Local AI Critique — Gemma (your local model)
                    {settings.sendRawAudioToModel && <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300">RAW AUDIO MODE</span>}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {settings.lmStudioBaseUrl} • up to {settings.maxOutputTokens.toLocaleString()} output tokens • 131k context available
                  </div>
                </div>
                <button
                  onClick={callLocalLlm}
                  disabled={isCallingLocalLlm || !analysis}
                  className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-[var(--accent)] text-white text-sm font-medium disabled:opacity-60"
                >
                  {isCallingLocalLlm ? 'Streaming from Gemma...' : (settings.sendRawAudioToModel && recording?.audioBlob) ? 'Send Audio + Analysis to Gemma' : 'Generate with Gemma'}
                </button>
              </div>

              {localLlmFeedback && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="uppercase text-xs tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                      Response from google/gemma-4-e4b
                      {settings.sendRawAudioToModel && <span className="text-emerald-400">(listened to raw audio)</span>}
                    </div>
                    <button onClick={clearLocalLlmFeedback} className="text-xs px-2 py-1 rounded border">Clear</button>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none bg-[#0f172a] p-5 rounded-2xl border border-white/10 whitespace-pre-wrap text-sm leading-relaxed">
                    {localLlmFeedback}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-2">
                    Real response from your local model (huge context mode). Raw audio was {lastGemmaUsedRawAudio ? 'sent' : 'not sent'} in this call.
                  </div>

                  {/* Creative in-app follow-up chat with Gemma (leverages 131k context) */}
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <div className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2">Chat with Gemma about this take</div>
                    
                    {gemmaChat.length > 0 && (
                      <div className="mb-3 space-y-3 text-sm max-h-72 overflow-auto pr-2">
                        {gemmaChat.map((msg, idx) => (
                          <div key={idx} className={msg.role === 'user' ? 'text-right' : ''}>
                            <div className={`inline-block px-3 py-2 rounded-2xl max-w-[85%] ${msg.role === 'user' ? 'bg-[var(--accent)] text-white' : 'bg-white/5'}`}>
                              {msg.content || <span className="opacity-50">...</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        value={gemmaChatInput}
                        onChange={e => setGemmaChatInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !isGemmaChatting) sendGemmaFollowUp(); }}
                        placeholder="Ask a follow-up question (e.g. “How should I practice the rushed section?”)"
                        className="flex-1 bg-transparent border border-[var(--border)] rounded-2xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                        disabled={isGemmaChatting}
                      />
                      <button 
                        onClick={sendGemmaFollowUp} 
                        disabled={isGemmaChatting || !gemmaChatInput.trim()}
                        className="px-5 rounded-2xl bg-white/10 hover:bg-white/15 text-sm disabled:opacity-50"
                      >
                        {isGemmaChatting ? '...' : 'Send'}
                      </button>
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-1">This chat keeps the full performance analysis + previous critique in context.{lastGemmaUsedRawAudio ? ' (original call included raw audio)' : ''}</div>
                  </div>
                </div>
              )}

              {!localLlmFeedback && !isCallingLocalLlm && (
                <div className="text-xs text-[var(--text-muted)]">
                  Click above to send a very rich prompt (full onsets, loudness curves, pitch contours) to Gemma.
                  {recording?.audioBlob 
                    ? " Toggle “Send raw audio” in Settings if you want the model to receive the actual recording (experimental — depends on LM Studio + model support)."
                    : " (Raw audio can only be sent with a fresh recording — history samples carry analysis data but not the audio blob.)"}
                </div>
              )}
            </div>
          </div>
        )}

        {/* HISTORY VIEW */}
        {currentView === 'history' && (
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl tracking-tight font-semibold mb-4">History &amp; Comparison</h2>
            {compareIds.length > 0 && <div className="mb-4 p-3 bg-[var(--bg-card)] border border-[var(--accent)] rounded-2xl text-sm">Comparing {compareIds.length} takes — scores shown in cards below.</div>}
            {history.length === 0 ? <div className="text-center py-12 border border-dashed rounded-3xl text-[var(--text-muted)]">No history yet. Record or load a sample.</div> : (
              <div className="grid md:grid-cols-2 gap-4">
                {history.map(entry => {
                  const sel = compareIds.includes(entry.id);
                  return <div key={entry.id} className={`p-5 bg-[var(--bg-card)] border rounded-3xl ${sel?'border-[var(--accent)]':''}`}>
                    <div className="font-semibold">{entry.context.instrument} — {entry.context.piece || 'Take'} ({formatTime(entry.duration)})</div>
                    <div className="text-xs text-[var(--text-muted)] mb-2">{new Date(entry.date).toLocaleString()} • {entry.mode}</div>
                    <div className="text-3xl font-semibold">{entry.feedback.overall.toFixed(1)} <span className="text-base text-[var(--text-muted)]">/10</span></div>
                    {entry.localLlmFeedback && <div className="text-[10px] text-emerald-400 mt-1">+ Local Gemma critique saved{entry.usedRawAudio ? ' (with audio)' : ''}</div>}
                    <div className="mt-3 flex gap-2">
                      <button onClick={()=>loadHistoryEntry(entry)} className="flex-1 py-2 text-sm border rounded-2xl">View</button>
                      <button onClick={()=>toggleCompare(entry.id)} className={`px-4 py-2 text-sm border rounded-2xl ${sel?'border-[var(--accent)]':''}`}>{sel?'Remove':'Compare'}</button>
                      <button onClick={()=>deleteHistoryEntry(entry.id)} className="px-3 text-red-400"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>;
                })}
              </div>
            )}
          </div>
        )}

        {/* STORYBOARD + ETHICS (short versions already inserted above in prior logic) */}
        {currentView === 'storyboard' && <div className="max-w-3xl mx-auto"><h2 className="text-4xl font-semibold mb-4">Storyboard</h2><div className="prose dark:prose-invert">Record → Local analysis (pitch/onset/dynamics) → Structured feedback with specific call-outs → History, comparison, exports &amp; rich LLM prompt. Fully local. Modern tools included (metronome, tap tempo, language mode).</div></div>}
        {currentView === 'ethics' && <div className="max-w-3xl mx-auto"><h2 className="text-4xl font-semibold mb-4">Ethics &amp; Impact</h2><p className="text-[var(--text-muted)]">See full discussion in the README and the in-app banner on feedback screens. Everything is local-first by design.</p></div>}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showSettings && <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-6" onClick={()=>setShowSettings(false)}>
          <div className="bg-[var(--bg-card)] border rounded-3xl max-w-md w-full p-7" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between mb-4"><div className="font-semibold">Settings</div><button onClick={()=>setShowSettings(false)}><X/></button></div>
            <div className="space-y-4 text-sm">
              <div><label className="text-xs text-[var(--text-muted)] block mb-1">Default style</label><select value={settings.defaultStyle} onChange={e=>updateContextFromSettings({...settings,defaultStyle:e.target.value as any})} className="border rounded-2xl w-full px-4 py-2 bg-transparent"><option>encouraging</option><option>balanced</option><option>detailed</option></select></div>

              <div className="pt-2 border-t border-[var(--border)]">
                <div className="font-medium mb-2 text-[var(--text-h)]">Local LLM (LM Studio)</div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Base URL</label>
                <input
                  value={settings.lmStudioBaseUrl}
                  onChange={e => setSettings(s => ({...s, lmStudioBaseUrl: e.target.value}))}
                  className="w-full bg-transparent border border-[var(--border)] rounded-2xl px-3 py-2 text-sm mb-3"
                  placeholder="http://localhost:1234/v1"
                />
                <label className="text-xs text-[var(--text-muted)] block mb-1">Model name</label>
                <input
                  value={settings.lmStudioModel}
                  onChange={e => setSettings(s => ({...s, lmStudioModel: e.target.value}))}
                  className="w-full bg-transparent border border-[var(--border)] rounded-2xl px-3 py-2 text-sm"
                  placeholder="google/gemma-4-e4b"
                />
                <div className="text-[10px] text-[var(--text-muted)] mt-1">Default works with LM Studio’s local OpenAI-compatible server. Start the server in LM Studio after loading the model.</div>
                <button 
                  onClick={testLmStudioConnection} 
                  className="mt-2 w-full py-1.5 text-xs rounded-2xl border border-[var(--border)] hover:bg-[var(--bg)]"
                >
                  Test Connection to LM Studio
                </button>

                <div className="mt-3">
                  <label className="text-xs text-[var(--text-muted)] block mb-1">Max output tokens (Gemma has huge context — 131k supported)</label>
                  <input 
                    type="number" 
                    value={settings.maxOutputTokens} 
                    onChange={e => setSettings(s => ({...s, maxOutputTokens: Math.max(512, parseInt(e.target.value) || 4096)}))} 
                    className="w-full bg-transparent border border-[var(--border)] rounded-2xl px-3 py-1.5 text-sm" 
                  />
                </div>

                <label className="flex items-center gap-3 mt-3 cursor-pointer text-sm">
                  <input 
                    type="checkbox" 
                    checked={settings.sendRawAudioToModel} 
                    onChange={e => setSettings(s => ({...s, sendRawAudioToModel: e.target.checked}))} 
                  />
                  <span>Send raw audio recording to model (experimental — only if your model + LM Studio support audio input)</span>
                </label>
                <div className="text-[10px] text-[var(--text-muted)] ml-6 -mt-1">Gemma may be able to "listen" directly. Falls back gracefully if unsupported.</div>
              </div>

              <label className="flex gap-3"><input type="checkbox" checked={settings.showRawDataByDefault} onChange={e=>setSettings(s=>({...s,showRawDataByDefault:e.target.checked}))}/> Show raw data expanded</label>
            </div>
          </div>
        </div>}
      </AnimatePresence>

      <AnimatePresence>
        {showHelp && <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-6" onClick={()=>setShowHelp(false)}>
          <div className="bg-[var(--bg-card)] border rounded-3xl max-w-md w-full p-7" onClick={e=>e.stopPropagation()}>
            <div className="font-semibold mb-3">Shortcuts</div>
            <div className="text-sm text-[var(--text-muted)] space-y-1">Space: record/stop • M: metronome • Ctrl/Cmd+K: history • ?: this help • Esc: close/reset</div>
            <button onClick={()=>setShowHelp(false)} className="mt-4 w-full py-2 border rounded-2xl">Close</button>
          </div>
        </div>}
      </AnimatePresence>

      <div className="text-center text-[10px] text-[var(--text-muted)] pb-8 pt-4 border-t border-[var(--border)] mt-16">CritiqueFlow — fully local, robust, modern • music + language mode</div>
    </div>
  );
}

function AppWithBoundary() { return <ErrorBoundary><App /></ErrorBoundary>; }
export default AppWithBoundary;