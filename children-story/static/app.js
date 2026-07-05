(function () {
  "use strict";

  /* ===================== utilities ===================== */
  const $ = (id) => document.getElementById(id);
  const fmt = (s) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ":" + (r < 10 ? "0" : "") + r;
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ===================== toast system ===================== */
  const toastsEl = $("toasts");
  function toast(msg, kind = "info", dur = 3800) {
    const el = document.createElement("div");
    el.className = "toast " + kind;
    const icons = { ok: "\u2713", err: "!", warn: "?", info: "i" };
    el.innerHTML = '<span class="t-icon">' + (icons[kind] || "i") + '</span><span class="t-body">' + escapeHtml(msg) + "</span>";
    toastsEl.appendChild(el);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 300); }, dur);
  }

  /* ===================== dark mode ===================== */
  const themeBtn = $("themeBtn");
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("sw_theme", t); } catch (e) {}
  }
  themeBtn.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    setTheme(cur === "dark" ? "light" : "dark");
  });
  try {
    const saved = localStorage.getItem("sw_theme");
    if (saved) setTheme(saved);
    else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
  } catch (e) {}

  /* ===================== state ===================== */
  let storyRaw = "";
  let storyTitle = "";
  let hasSample = false;
  let sampleBlob = null;
  let voiceId = null; // cached voice ID from the server (for clone mode)
  let sampleBlobUrl = null;
  let voices = [];
  let defaultModel = "";
  let storyAbort = null;
  let reviseAbort = null;
  let narrMode = "clone"; // "clone" or "neural"
  let xttsInstalled = false;

  /* ===================== elements ===================== */
  const banner = $("banner");
  const modelSel = $("modelSel");
  const themeSel = $("themeSel");
  const ageSel = $("ageSel");
  const lengthSel = $("lengthSel");
  const charName = $("charName");
  const topic = $("topic");
  const genStoryBtn = $("genStoryBtn");
  const surpriseBtn = $("surpriseBtn");
  const storyPanel = $("storyPanel");
  const storyMeta = $("storyMeta");
  const storyStatus = $("storyStatus");
  const storyActions = $("storyActions");
  const copyStoryBtn = $("copyStoryBtn");
  const downloadStoryBtn = $("downloadStoryBtn");
  const saveStoryBtn = $("saveStoryBtn");
  const illustrateBtn = $("illustrateBtn"); // may be null if auto-illustrating
  const artStyleSel = $("artStyleSel");
  const illustrationArea = $("illustrationArea");
  const illustrationImg = $("illustrationImg");
  const illustrationStyle = $("illustrationStyle");
  const illustrationPrompt = $("illustrationPrompt");
  const illustrationStatus = $("illustrationStatus");
  const feedback = $("feedback");
  const reviseBtn = $("reviseBtn");
  const reviseStatus = $("reviseStatus");
  const clearRevBtn = $("clearRevBtn");

  const recBtn = $("recBtn");
  const timerEl = $("timer");
  const timerHint = $("timerHint");
  const fileInput = $("fileInput");
  const samplePreview = $("samplePreview");
  const sampleTag = $("sampleTag");
  const sampleAudio = $("sampleAudio");
  const clearSampleBtn = $("clearSampleBtn");
  const voiceSel = $("voiceSel");
  const rateSlider = $("rateSlider");
  const voiceHint = $("voiceHint");
  const voicePick = $("voicePick");
  const consentChk = $("consentChk");
  const voiceStatus = $("voiceStatus");

  const modeToggle = $("modeToggle");
  const modeClone = $("modeClone");
  const modeNeural = $("modeNeural");
  const xttsStatusEl = $("xttsStatus");
  const narrSub = $("narrSub");

  const narrateBtn = $("narrateBtn");
  const narrSteps = $("narrSteps");
  const narrProgress = $("narrProgress");
  const narrBar = $("narrBar");
  const narrStatus = $("narrStatus");

  const player = $("player");
  const narrAudio = $("narrAudio");
  const playBtn = $("playBtn");
  const pbar = $("pbar");
  const pfill = $("pfill");
  const pcur = $("pcur");
  const pdur = $("pdur");
  const playerTitle = $("playerTitle");
  const playerSub = $("playerSub");
  const dlLink = $("dlLink");
  const disclosure = $("disclosure");
  const playerStatus = $("playerStatus");

  const historyBtn = $("historyBtn");
  const historyDrawer = $("historyDrawer");
  const drawerOverlay = $("drawerOverlay");
  const closeHistoryBtn = $("closeHistoryBtn");
  const historyList = $("historyList");
  const historyEmpty = $("historyEmpty");
  const clearHistoryBtn = $("clearHistoryBtn");

  /* ===================== API helpers ===================== */
  async function apiPost(path, body, statusEl) {
    try {
      const r = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) {
        const msg = data.detail || "Error " + r.status;
        if (statusEl) statusEl.innerHTML = '<span class="err">' + escapeHtml(msg) + "</span>";
        throw new Error(msg);
      }
      return data;
    } catch (e) {
      if (statusEl && !statusEl.innerHTML) {
        statusEl.innerHTML = '<span class="err">Request failed: ' + escapeHtml(e.message) + "</span>";
      }
      throw e;
    }
  }

  /* ===================== init ===================== */
  async function init() {
    try {
      const h = await (await fetch("/api/health")).json();
      defaultModel = h.default_model;
      if (h.backend_ok && h.models.length) {
        modelSel.innerHTML = h.models.map((m) => '<option value="' + m + '">' + m + "</option>").join("");
        if (h.models.includes(defaultModel)) modelSel.value = defaultModel;
        else modelSel.value = h.models[0];
        showBanner("ok", "Connected to " + h.backend + " with " + h.models.length + " models. Using: " + modelSel.value);
      } else {
        modelSel.innerHTML = '<option value="' + defaultModel + '">' + defaultModel + " (not loaded)</option>";
        showBanner("warn", h.backend + " is not responding at " + h.base_url + ". Start it and load a model, then refresh.");
      }
    } catch (e) {
      showBanner("err", "Backend unreachable. Is the Python server running on port 8765?");
    }

    try {
      const v = await (await fetch("/api/voices")).json();
      voices = v.profiles;
      voiceSel.innerHTML = voices.map((p) => '<option value="' + p.id + '">' + p.label + "</option>").join("");
      voiceSel.value = v.default;
    } catch (e) {
      voiceSel.innerHTML = '<option value="higher">Aria (bright, high)</option>';
    }

    // Check XTTS availability
    try {
      const xs = await (await fetch("/api/xtts_status")).json();
      xttsInstalled = xs.installed;
      if (!xttsInstalled) {
        xttsStatusEl.innerHTML = '<span class="warn">Voice cloning library not installed. Neural voice mode still works. To enable cloning: pip install coqui-tts torch torchaudio</span>';
        modeClone.classList.add("disabled");
        modeClone.style.opacity = "0.5";
        modeClone.querySelector("strong").textContent = "Clone My Voice (not installed)";
        switchMode("neural");
      }
    } catch (e) {}

    renderHistory();
    updateNarrateState();
  }

  function showBanner(kind, msg) {
    banner.className = "banner " + kind;
    banner.textContent = msg;
    banner.classList.remove("hidden");
  }

  /* ===================== story generation (streaming) ===================== */
  const SURPRISE_TOPICS = [
    "a brave little owl who is afraid of the dark",
    "a curious fox who finds a lost key in the forest",
    "a tiny dragon who cannot sneeze fire",
    "a cloud that wants to live on the ground",
    "a robot learning to paint with colors",
    "a shy mermaid and a noisy seagull",
    "a hedgehog who collects moonbeams in jars",
    "a snail who dreams of running a bakery",
    "a penguin who discovers a tropical island",
    "a girl who befriends a lonely shadow",
    "a bear who wakes up too early from hibernation",
    "a star that falls into a garden and needs help going home",
  ];

  surpriseBtn.addEventListener("click", () => {
    topic.value = SURPRISE_TOPICS[Math.floor(Math.random() * SURPRISE_TOPICS.length)];
    topic.focus();
  });

  function showSkeleton() {
    storyPanel.innerHTML =
      '<p class="story-title"><span class="skeleton-line" style="width:45%;height:20px;"></span></p>' +
      '<span class="skeleton-line" style="width:95%;"></span>'.repeat(2) +
      '<span class="skeleton-line" style="width:80%;"></span>' +
      '<span class="skeleton-line" style="width:90%;"></span>'.repeat(2) +
      '<span class="skeleton-line" style="width:60%;"></span>';
  }

  function renderStreamText(raw) {
    let html = escapeHtml(raw);
    html = html
      .replace(/TITLE:\s*(.*)/g, '<p class="story-title">$1</p>')
      .replace(/MORAL:\s*(.*)/g, '<p class="moral">$1</p>');
    html = html
      .replace(/<\/p>\n\n/g, "</p>")
      .split(/\n{2,}/)
      .map((chunk) => {
        if (chunk.startsWith("<p class=")) return chunk;
        chunk = chunk.replace(/\n/g, "<br>");
        return '<p class="body">' + chunk + "</p>";
      })
      .join("");
    storyPanel.innerHTML = html + '<span class="stream-cursor"></span>';
  }

  function finalizeStory(raw) {
    let text = raw.trim();
    let title = "", moral = "";
    const m1 = text.match(/TITLE:\s*(.+)/);
    if (m1) { title = m1[1].trim(); text = text.replace(m1[0], "").trim(); }
    const m2 = text.match(/MORAL:\s*(.+)/);
    if (m2) { moral = m2[1].trim(); text = text.replace(m2[0], "").trim(); }
    let paras = text.split(/\n{2,}/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
    if (!title) title = paras[0] ? paras[0].split(".")[0].slice(0, 60) : "A Little Story";
    if (!paras.length) paras = ["Once upon a time..."];

    storyTitle = title;
    storyRaw = "TITLE: " + title + "\n\n" + paras.join("\n\n") + (moral ? "\n\nMORAL: " + moral : "");

    storyPanel.innerHTML =
      '<p class="story-title">' + escapeHtml(title) + "</p>" +
      paras.map((p) => '<p class="body">' + escapeHtml(p) + "</p>").join("") +
      (moral ? '<p class="moral">' + escapeHtml(moral) + "</p>" : "");
    storyPanel.classList.add("fade-in");
    setTimeout(() => storyPanel.classList.remove("fade-in"), 500);

    const words = paras.join(" ").split(/\s+/).length;
    const mins = Math.max(1, Math.round(words / 130));
    storyMeta.innerHTML =
      '<span>' + words + ' words</span><span>~' + mins + " min read</span><span>Age " + ageSel.value + "</span><span>" + themeSel.value + "</span>";
    storyMeta.classList.remove("hidden");
    storyActions.style.display = "flex";
  }

  async function streamStory(path, body, statusEl, btn) {
    let raw = "";
    try {
      const r = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: storyAbort.signal,
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || "Error " + r.status);
      }
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const obj = JSON.parse(payload);
            if (obj.error) throw new Error(obj.error);
            if (obj.text) { raw += obj.text; renderStreamText(raw); }
          } catch (e) {
            if (e.message && !e.message.includes("JSON")) throw e;
          }
        }
      }
      if (!raw.trim()) throw new Error("The model returned an empty response. Try again or pick another model.");
      finalizeStory(raw);
      statusEl.innerHTML = '<span class="ok">Story ready!</span>';
      toast("Story written successfully", "ok");
      return true;
    } catch (e) {
      if (e.name === "AbortError") {
        statusEl.innerHTML = '<span class="warn">Cancelled.</span>';
        if (raw.trim()) finalizeStory(raw);
      } else {
        statusEl.innerHTML = '<span class="err">' + escapeHtml(e.message) + "</span>";
        toast(e.message, "err");
        if (raw.trim()) finalizeStory(raw);
      }
      return false;
    }
  }

  async function generateStory() {
    const t = topic.value.trim();
    if (!t) { toast("Type a topic first", "warn"); topic.focus(); return; }
    if (storyAbort) storyAbort.abort();
    storyAbort = new AbortController();
    genStoryBtn.disabled = true;
    reviseBtn.disabled = true;
    storyActions.style.display = "none";
    storyMeta.classList.add("hidden");
    showSkeleton();
    storyStatus.innerHTML = '<span class="spinner"></span>Writing a story about "' + escapeHtml(t) + '"';
    genStoryBtn.innerHTML = '<span class="spinner"></span> Writing...';
    const ok = await streamStory("/api/story/stream", {
      topic: t, model: modelSel.value, theme: themeSel.value,
      age_range: ageSel.value, length: lengthSel.value, character_name: charName.value,
    }, storyStatus, genStoryBtn);
    genStoryBtn.disabled = false;
    genStoryBtn.innerHTML = '<span class="dot"></span>Write My Story';
    if (ok) {
      reviseBtn.disabled = false;
      // Auto-generate illustration after story is ready
      generateIllustration();
    }
    updateNarrateState();
  }

  /* ===================== revision (streaming) ===================== */
  async function reviseStory() {
    const fb = feedback.value.trim();
    if (!fb) { toast("Add some feedback first", "warn"); feedback.focus(); return; }
    if (!storyRaw) { toast("Write a story first", "warn"); return; }
    if (reviseAbort) reviseAbort.abort();
    reviseAbort = new AbortController();
    reviseBtn.disabled = true;
    storyActions.style.display = "none";
    storyMeta.classList.add("hidden");
    showSkeleton();
    reviseStatus.innerHTML = '<span class="spinner"></span>Revising your story...';
    reviseBtn.innerHTML = '<span class="spinner"></span> Revising...';
    storyAbort = reviseAbort;
    const ok = await streamStory("/api/revise/stream", {
      story: storyRaw, feedback: fb, model: modelSel.value,
      theme: themeSel.value, age_range: ageSel.value, length: lengthSel.value,
    }, reviseStatus, reviseBtn);
    reviseBtn.disabled = false;
    reviseBtn.innerHTML = '<span class="dot"></span>Revise Story';
    if (ok) toast("Story revised!", "ok");
    updateNarrateState();
  }

  /* ===================== voice sample ===================== */
  let mediaRec = null, recChunks = [], recTimer = null, recStart = 0, isRecording = false;

  function setSample(blob, label) {
    sampleBlob = blob;
    voiceId = null; // reset — new sample needs new upload
    if (sampleBlobUrl) URL.revokeObjectURL(sampleBlobUrl);
    sampleBlobUrl = URL.createObjectURL(blob);
    sampleAudio.src = sampleBlobUrl;
    sampleTag.textContent = label + " - preparing...";
    samplePreview.classList.remove("hidden");
    samplePreview.classList.add("fade-in");
    hasSample = true;

    if (narrMode === "neural") {
      voiceStatus.innerHTML = '<span class="spinner"></span>Analyzing your voice...';
      analyzePitch(blob).then((info) => {
        voiceSel.value = info.profile;
        sampleTag.textContent = label + " ready";
        const vLabel = (voices.find((v) => v.id === info.profile) || { label: info.profile }).label;
        voiceHint.textContent = "Detected pitch ~" + Math.round(info.meanF0) + " Hz, matched to " + vLabel;
        voiceStatus.innerHTML = '<span class="ok">Voice profile: ' + info.profile + " (~" + Math.round(info.meanF0) + " Hz)</span>";
        updateNarrateState();
      }).catch((e) => {
        sampleTag.textContent = label + " ready";
        voiceHint.textContent = "Could not analyze pitch, pick a voice manually.";
        voiceStatus.innerHTML = '<span class="warn">Pitch analysis failed: ' + escapeHtml(e.message) + "</span>";
        updateNarrateState();
      });
    } else {
      // Clone mode: upload the sample to the server now so it's cached
      // and ready for fast narration on subsequent requests
      voiceStatus.innerHTML = '<span class="spinner"></span>Uploading voice sample...';
      uploadVoiceSample(blob, label);
    }
  }

  async function uploadVoiceSample(blob, label) {
    if (!xttsInstalled) {
      sampleTag.textContent = label + " ready";
      voiceStatus.innerHTML = '<span class="ok">Voice sample ready.</span>';
      updateNarrateState();
      return;
    }
    try {
      const formData = new FormData();
      const ext = blob.type && blob.type.includes("webm") ? "webm" : "wav";
      formData.append("file", blob, "voice-sample." + ext);
      const r = await fetch("/api/voice/store", { method: "POST", body: formData });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Upload failed");
      voiceId = data.voice_id;
      sampleTag.textContent = label + " ready";
      voiceStatus.innerHTML = '<span class="ok">Voice sample cached and ready for cloning.</span>';
      updateNarrateState();
    } catch (e) {
      sampleTag.textContent = label + " ready";
      voiceStatus.innerHTML = '<span class="warn">Could not cache voice sample: ' + escapeHtml(e.message) + ". Will try again on narration.</span>";
      updateNarrateState();
    }
  }

  function clearSample() {
    sampleBlob = null;
    voiceId = null;
    hasSample = false;
    if (sampleBlobUrl) { URL.revokeObjectURL(sampleBlobUrl); sampleBlobUrl = null; }
    sampleAudio.src = "";
    samplePreview.classList.add("hidden");
    voiceHint.textContent = "Record or upload a sample to auto-detect a matching voice.";
    voiceStatus.innerHTML = "";
    updateNarrateState();
  }

  recBtn.addEventListener("click", async () => {
    if (isRecording) { stopRecording(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recChunks = [];
      mediaRec = new MediaRecorder(stream);
      mediaRec.ondataavailable = (e) => { if (e.data.size) recChunks.push(e.data); };
      mediaRec.onstop = () => {
        const blob = new Blob(recChunks, { type: mediaRec.mimeType || "audio/webm" });
        setSample(blob, "Recording");
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRec.start();
      isRecording = true;
      recBtn.classList.add("recording");
      recStart = Date.now();
      timerHint.textContent = "Tap to stop";
      recTimer = setInterval(() => {
        const s = Math.floor((Date.now() - recStart) / 1000);
        timerEl.firstChild.textContent = fmt(s);
        if (s >= 10) stopRecording();
      }, 200);
      voiceStatus.innerHTML = '<span class="warn">Recording... speak naturally for 5-10 seconds.</span>';
    } catch (e) {
      voiceStatus.innerHTML = '<span class="err">Could not access the microphone. Try uploading a file instead.</span>';
      toast("Microphone access denied", "err");
    }
  });

  function stopRecording() {
    if (!isRecording) return;
    isRecording = false;
    recBtn.classList.remove("recording");
    clearInterval(recTimer);
    timerHint.textContent = "Tap to start";
    const s = Math.floor((Date.now() - recStart) / 1000);
    timerEl.firstChild.textContent = fmt(s);
    if (s < 3) voiceStatus.innerHTML = '<span class="warn">That was short - try 5-10 seconds for better results.</span>';
    try { mediaRec.stop(); } catch (e) {}
  }

  fileInput.addEventListener("change", () => {
    const f = fileInput.files[0];
    if (f) setSample(f, "Uploaded clip");
  });
  clearSampleBtn.addEventListener("click", clearSample);

  /* ---- pitch analysis (autocorrelation) ---- */
  async function analyzePitch(blob) {
    const arrBuf = await blob.arrayBuffer();
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const audioBuf = await ctx.decodeAudioData(arrBuf);
    const channel = audioBuf.getChannelData(0);
    const sampleRate = audioBuf.sampleRate;
    const frameSize = 2048;
    const f0s = [];
    for (let i = 0; i + frameSize < channel.length; i += frameSize) {
      const frame = channel.subarray(i, i + frameSize);
      const f0 = autocorrelate(frame, sampleRate);
      if (f0 && f0 > 60 && f0 < 500) f0s.push(f0);
    }
    ctx.close();
    if (f0s.length < 2) throw new Error("not enough voiced frames");
    f0s.sort((a, b) => a - b);
    const meanF0 = f0s.reduce((a, b) => a + b, 0) / f0s.length;
    let profile;
    if (meanF0 < 130) profile = "deeper";
    else if (meanF0 < 180) profile = "lower";
    else if (meanF0 < 230) profile = "higher";
    else profile = "younger";
    return { meanF0, profile };
  }

  function autocorrelate(buf, sampleRate) {
    const SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1;
    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    const buf2 = buf.slice(r1, r2);
    const N = buf2.length;
    const c = new Array(N).fill(0);
    for (let lag = 0; lag < N; lag++) {
      let sum = 0;
      for (let i = 0; i < N - lag; i++) sum += buf2[i] * buf2[i + lag];
      c[lag] = sum;
    }
    let d = 0;
    while (d < N - 1 && c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < N; i++) if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
    let T0 = maxpos;
    if (T0 <= 0) return -1;
    const x1 = c[T0 - 1] || 0, x2 = c[T0], x3 = c[T0 + 1] || 0;
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);
    return sampleRate / T0;
  }

  /* ===================== narration mode toggle ===================== */
  function switchMode(mode) {
    narrMode = mode;
    modeClone.classList.toggle("active", mode === "clone");
    modeNeural.classList.toggle("active", mode === "neural");
    if (mode === "neural") {
      voicePick.classList.remove("hidden");
      narrSub.textContent = "The AI will read your story using a built-in neural voice that matches your pitch.";
      // If we have a sample but haven't analyzed pitch yet, do it now
      if (hasSample && sampleBlob && !voiceSel.dataset.analyzed) {
        voiceStatus.innerHTML = '<span class="spinner"></span>Analyzing your voice...';
        analyzePitch(sampleBlob).then((info) => {
          voiceSel.value = info.profile;
          voiceSel.dataset.analyzed = "true";
          const vLabel = (voices.find((v) => v.id === info.profile) || { label: info.profile }).label;
          voiceHint.textContent = "Detected pitch ~" + Math.round(info.meanF0) + " Hz, matched to " + vLabel;
          voiceStatus.innerHTML = '<span class="ok">Voice profile: ' + info.profile + " (~" + Math.round(info.meanF0) + " Hz)</span>";
        }).catch(() => {
          voiceHint.textContent = "Could not analyze pitch, pick a voice manually.";
          voiceStatus.innerHTML = '<span class="warn">Pitch analysis failed. Pick a voice manually.</span>';
        });
      }
    } else {
      voicePick.classList.add("hidden");
      narrSub.textContent = "The AI will clone your voice and read the story aloud in a voice that sounds like you.";
      // If we have a sample but haven't uploaded it for cloning yet, do it now
      if (hasSample && sampleBlob && !voiceId && xttsInstalled) {
        voiceStatus.innerHTML = '<span class="spinner"></span>Uploading voice sample for cloning...';
        uploadVoiceSample(sampleBlob, "Sample");
      }
    }
    updateNarrateState();
  }

  modeClone.addEventListener("click", () => {
    if (!xttsInstalled) {
      toast("Voice cloning library not installed. Using neural voice instead.", "warn");
      return;
    }
    switchMode("clone");
  });
  modeNeural.addEventListener("click", () => switchMode("neural"));

  /* ===================== narration generation ===================== */
  function updateNarrateState() {
    narrateBtn.disabled = !(storyRaw && hasSample && consentChk.checked);
  }
  consentChk.addEventListener("change", () => {
    updateNarrateState();
    if (consentChk.checked && hasSample) {
      voiceStatus.innerHTML = '<span class="ok">Consent given. You can create the narration now.</span>';
    }
  });

  async function generateNarration() {
    narrateBtn.disabled = true;
    narrSteps.classList.remove("hidden");
    narrProgress.classList.remove("hidden");
    narrBar.style.width = "0%";
    narrStatus.innerHTML = '<span class="spinner"></span>Creating narration...';

    const steps = narrSteps.querySelectorAll("li");
    steps.forEach((li) => li.classList.remove("done", "active"));

    if (narrMode === "clone") {
      // Voice cloning mode
      const modelCachedHint = $("modelCachedHint");

      // Step 0: prepare voice sample
      steps[0].classList.add("active");
      steps[0].querySelector(".tick").innerHTML = '<span class="spinner"></span>';
      if (voiceId) {
        narrStatus.innerHTML = '<span class="spinner"></span>Using cached voice sample...';
      } else {
        narrStatus.innerHTML = '<span class="spinner"></span>Uploading voice sample...';
      }
      await sleep(300);
      steps[0].classList.remove("active");
      steps[0].classList.add("done");
      steps[0].querySelector(".tick").innerHTML = "\u2713";
      narrBar.style.width = "15%";

      // Step 1: load model
      steps[1].classList.add("active");
      steps[1].querySelector(".tick").innerHTML = '<span class="spinner"></span>';
      // Check if model is already loaded
      let modelAlreadyLoaded = false;
      try {
        const xs = await (await fetch("/api/xtts_status")).json();
        modelAlreadyLoaded = xs.loaded;
      } catch (e) {}
      if (modelAlreadyLoaded) {
        modelCachedHint.classList.remove("hidden");
        narrStatus.innerHTML = '<span class="spinner"></span>Voice cloning model already loaded...';
      } else {
        narrStatus.innerHTML = '<span class="spinner"></span>Loading XTTS-v2 model (first time downloads ~1.8 GB)...';
      }
      narrBar.style.width = "30%";

      try {
        // Preload XTTS model (no-op if already loaded)
        try {
          await fetch("/api/preload_xtts", { method: "POST" });
        } catch (e) { /* model may already be loading */ }

        steps[1].classList.remove("active");
        steps[1].classList.add("done");
        steps[1].querySelector(".tick").innerHTML = "\u2713";
        narrBar.style.width = "45%";

        steps[2].classList.add("active");
        steps[2].querySelector(".tick").innerHTML = '<span class="spinner"></span>';
        if (voiceId) {
          narrStatus.innerHTML = '<span class="spinner"></span>Reading the story with your cloned voice...';
        } else {
          narrStatus.innerHTML = '<span class="spinner"></span>Cloning your voice and reading the story... (this can take 30-60 seconds)';
        }

        // If we don't have a cached voice_id yet, upload the sample first
        if (!voiceId && sampleBlob) {
          try {
            const upForm = new FormData();
            const ext = sampleBlob.type && sampleBlob.type.includes("webm") ? "webm" : "wav";
            upForm.append("file", sampleBlob, "voice-sample." + ext);
            const upR = await fetch("/api/voice/store", { method: "POST", body: upForm });
            const upData = await upR.json();
            if (!upR.ok) throw new Error(upData.detail || "Voice upload failed");
            voiceId = upData.voice_id;
          } catch (e) {
            throw new Error("Could not cache voice sample: " + e.message);
          }
        }

        if (!voiceId) {
          throw new Error("No voice sample available. Please record or upload a sample first.");
        }

        // Send just the text + voice_id (no re-upload needed)
        const formData = new FormData();
        formData.append("text", storyRaw);
        formData.append("voice_id", voiceId);
        formData.append("rate", String(parseFloat(rateSlider.value)));

        const r = await fetch("/api/narrate/clone", { method: "POST", body: formData });
        const data = await r.json();
        if (!r.ok) throw new Error(data.detail || "Cloning failed");

        steps[2].classList.remove("active");
        steps[2].classList.add("done");
        steps[2].querySelector(".tick").innerHTML = "\u2713";
        narrBar.style.width = "85%";

        steps[3].classList.add("active");
        steps[3].querySelector(".tick").innerHTML = '<span class="spinner"></span>';
        await sleep(400);
        steps[3].classList.remove("active");
        steps[3].classList.add("done");
        steps[3].querySelector(".tick").innerHTML = "\u2713";
        narrBar.style.width = "100%";

        narrStatus.innerHTML = '<span class="ok">Narration ready! Press play below.</span>';
        showPlayer(data.url, data.voice_label, "clone");
        toast("Voice cloning complete!", "ok");
      } catch (e) {
        narrStatus.innerHTML = '<span class="err">Voice cloning failed: ' + escapeHtml(e.message) + "</span>";
        toast("Voice cloning failed", "err");
      }
    } else {
      // Neural TTS mode
      for (let i = 0; i < steps.length; i++) {
        steps[i].classList.add("active");
        steps[i].querySelector(".tick").innerHTML = '<span class="spinner"></span>';
        await sleep(400);
        steps[i].classList.remove("active");
        steps[i].classList.add("done");
        steps[i].querySelector(".tick").innerHTML = "\u2713";
        narrBar.style.width = (((i + 1) / steps.length) * 55) + "%";
      }
      narrStatus.innerHTML = '<span class="spinner"></span>Synthesizing audio with neural TTS...';
      try {
        const res = await apiPost("/api/narrate", {
          text: storyRaw,
          voice_profile: voiceSel.value,
          rate: parseFloat(rateSlider.value),
        }, narrStatus);
        narrBar.style.width = "100%";
        narrStatus.innerHTML = '<span class="ok">Narration ready! Press play below.</span>';
        showPlayer(res.url, res.voice_label, "neural");
        toast("Narration ready!", "ok");
      } catch (e) {
        narrStatus.innerHTML = '<span class="err">Narration failed: ' + escapeHtml(e.message) + "</span>";
        toast("Narration failed", "err");
      }
    }
    narrateBtn.disabled = false;
  }

  /* ===================== audio player ===================== */
  function showPlayer(url, voiceLabel, mode) {
    player.classList.remove("hidden");
    player.classList.add("fade-in");
    disclosure.style.display = "flex";
    playerTitle.textContent = storyTitle || "Your story";
    const modeLabel = mode === "clone" ? "Voice cloned with XTTS-v2" : "Neural TTS";
    const rateTxt = parseFloat(rateSlider.value) === 1 ? "" : " - " + parseFloat(rateSlider.value).toFixed(2) + "x speed";
    playerSub.textContent = modeLabel + " - " + voiceLabel + rateTxt;
    narrAudio.src = url;
    dlLink.href = url;
    dlLink.download = (storyTitle || "story").replace(/[^\w\-]+/g, "_") + (url.endsWith(".wav") ? ".wav" : ".mp3");
    dlLink.classList.remove("hidden");
    playerStatus.innerHTML = '<span class="ok">Audio ready!</span>';
    narrAudio.load();
  }

  narrAudio.addEventListener("loadedmetadata", () => { pdur.textContent = fmt(narrAudio.duration); });
  narrAudio.addEventListener("timeupdate", () => {
    const pct = (narrAudio.currentTime / (narrAudio.duration || 1)) * 100;
    pfill.style.width = pct + "%";
    pcur.textContent = fmt(narrAudio.currentTime);
  });
  narrAudio.addEventListener("ended", () => { playBtn.innerHTML = "&#9654;"; });
  narrAudio.addEventListener("play", () => { playBtn.innerHTML = "&#10074;&#10074;"; });
  narrAudio.addEventListener("pause", () => { playBtn.innerHTML = "&#9654;"; });
  playBtn.addEventListener("click", () => {
    if (narrAudio.paused) narrAudio.play().catch(() => toast("Could not play audio", "err"));
    else narrAudio.pause();
  });
  pbar.addEventListener("click", (e) => {
    if (!narrAudio.duration) return;
    const rect = pbar.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    narrAudio.currentTime = ratio * narrAudio.duration;
  });

  /* ===================== copy / download / save ===================== */
  copyStoryBtn.addEventListener("click", async () => {
    if (!storyRaw) return;
    try { await navigator.clipboard.writeText(storyRaw); toast("Story copied!", "ok"); }
    catch (e) { toast("Could not copy", "err"); }
  });

  downloadStoryBtn.addEventListener("click", () => {
    if (!storyRaw) return;
    const blob = new Blob([storyRaw], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (storyTitle || "story").replace(/[^\w\-]+/g, "_") + ".txt";
    a.click();
    URL.revokeObjectURL(url);
    toast("Story downloaded", "ok");
  });

  saveStoryBtn.addEventListener("click", () => {
    if (!storyRaw) return;
    const item = {
      id: Date.now().toString(36),
      title: storyTitle,
      raw: storyRaw,
      topic: topic.value,
      theme: themeSel.value,
      age: ageSel.value,
      length: lengthSel.value,
      date: new Date().toISOString(),
    };
    const items = getHistory();
    items.unshift(item);
    try {
      localStorage.setItem("sw_history", JSON.stringify(items.slice(0, 50)));
      toast("Saved to your library!", "ok");
      renderHistory();
    } catch (e) { toast("Could not save", "err"); }
  });

  /* ===================== illustration generation ===================== */
  let illustrationAbort = null;

  async function generateIllustration() {
    if (!storyRaw) { toast("Write a story first", "warn"); return; }
    if (illustrationAbort) illustrationAbort.abort();
    illustrationAbort = new AbortController();

    if (illustrateBtn) { illustrateBtn.disabled = true; illustrateBtn.innerHTML = '<span class="spinner"></span> Drawing...'; }
    illustrationArea.classList.remove("hidden");
    illustrationArea.classList.add("fade-in");
    illustrationImg.src = "";
    illustrationStatus.innerHTML = '<span class="spinner"></span>Creating an illustration for your story...';
    illustrationStyle.textContent = artStyleSel.value;

    try {
      const r = await fetch("/api/illustrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story: storyRaw,
          style: artStyleSel.value,
          model: modelSel.value,
        }),
        signal: illustrationAbort.signal,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Illustration failed");

      illustrationImg.src = data.url;
      illustrationImg.alt = "Illustration: " + (data.prompt || "story scene");
      illustrationPrompt.textContent = data.prompt || "";
      illustrationStyle.textContent = data.style || artStyleSel.value;
      illustrationStatus.innerHTML = '<span class="ok">Illustration ready!</span>';
      toast("Story illustrated!", "ok");
    } catch (e) {
      if (e.name === "AbortError") {
        illustrationStatus.innerHTML = '<span class="warn">Cancelled.</span>';
      } else {
        illustrationStatus.innerHTML = '<span class="err">' + escapeHtml(e.message) + "</span>";
        toast("Illustration failed: " + e.message, "err");
      }
    }
    if (illustrateBtn) { illustrateBtn.disabled = false; illustrateBtn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg> Illustrate'; }
  }

  if (illustrateBtn) illustrateBtn.addEventListener("click", generateIllustration);

  /* ===================== history drawer ===================== */
  function getHistory() {
    try { return JSON.parse(localStorage.getItem("sw_history") || "[]"); } catch (e) { return []; }
  }

  function renderHistory() {
    const items = getHistory();
    if (!items.length) {
      historyEmpty.style.display = "block";
      historyList.innerHTML = "";
      historyList.appendChild(historyEmpty);
      return;
    }
    historyEmpty.style.display = "none";
    historyList.innerHTML = items.map((it) => {
      const d = new Date(it.date);
      const dStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      return '<div class="history-item" data-id="' + it.id + '">' +
        '<button class="h-del" data-del="' + it.id + '" title="Delete">&times;</button>' +
        '<p class="h-title">' + escapeHtml(it.title) + "</p>" +
        '<div class="h-meta"><span>' + escapeHtml(it.theme) + '</span><span>age ' + escapeHtml(it.age) + '</span><span>' + dStr + "</span></div>" +
        "</div>";
    }).join("");
  }

  historyList.addEventListener("click", (e) => {
    if (e.target.matches("[data-del]")) {
      e.stopPropagation();
      const id = e.target.dataset.del;
      const items = getHistory().filter((it) => it.id !== id);
      localStorage.setItem("sw_history", JSON.stringify(items));
      renderHistory();
      toast("Story removed", "info");
      return;
    }
    const item = e.target.closest(".history-item");
    if (item) {
      const data = getHistory().find((it) => it.id === item.dataset.id);
      if (data) {
        finalizeStory(data.raw);
        topic.value = data.topic || "";
        themeSel.value = data.theme || "bedtime";
        ageSel.value = data.age || "5-7";
        lengthSel.value = data.length || "medium";
        reviseBtn.disabled = false;
        updateNarrateState();
        closeDrawer();
        toast("Loaded: " + data.title, "info");
        storyPanel.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  });

  clearHistoryBtn.addEventListener("click", () => {
    if (!getHistory().length) return;
    localStorage.removeItem("sw_history");
    renderHistory();
    toast("Library cleared", "info");
  });

  function openDrawer() { historyDrawer.classList.add("open"); historyDrawer.setAttribute("aria-hidden", "false"); drawerOverlay.classList.add("show"); }
  function closeDrawer() { historyDrawer.classList.remove("open"); historyDrawer.setAttribute("aria-hidden", "true"); drawerOverlay.classList.remove("show"); }
  historyBtn.addEventListener("click", openDrawer);
  closeHistoryBtn.addEventListener("click", closeDrawer);
  drawerOverlay.addEventListener("click", closeDrawer);

  /* ===================== keyboard shortcuts ===================== */
  document.addEventListener("keydown", (e) => {
    const tag = e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      if (e.key === "Escape") e.target.blur();
      return;
    }
    if (e.key === "d" || e.key === "D") themeBtn.click();
    else if (e.key === "h" || e.key === "H") historyDrawer.classList.contains("open") ? closeDrawer() : openDrawer();
    else if (e.key === "Escape") closeDrawer();
    else if (e.key === " ") { if (narrAudio.src) { e.preventDefault(); playBtn.click(); } }
  });

  /* ===================== wiring ===================== */
  genStoryBtn.addEventListener("click", generateStory);
  reviseBtn.addEventListener("click", reviseStory);
  clearRevBtn.addEventListener("click", () => { feedback.value = ""; reviseStatus.innerHTML = ""; });
  narrateBtn.addEventListener("click", generateNarration);

  $("chips").addEventListener("click", (e) => {
    if (e.target.classList.contains("chip")) { topic.value = e.target.dataset.q; topic.focus(); }
  });
  topic.addEventListener("keydown", (e) => { if (e.key === "Enter") generateStory(); });

  init();
})();
