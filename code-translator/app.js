const examples = [
  {
    name: "Two sum",
    source: `def two_sum(nums, target):
    """Return indices of two values that add to target."""
    seen = {}

    for index, value in enumerate(nums):
        complement = target - value
        if complement in seen:
            return [seen[complement], index]
        seen[value] = index

    return []`,
    tests: [
      { input: "[2, 7, 11, 15], 9", expected: "[0, 1]" },
      { input: "[3, 2, 4], 6", expected: "[1, 2]" },
      { input: "[3, 3], 6", expected: "[0, 1]" },
    ],
  },
  {
    name: "Fibonacci",
    source: `def fibonacci(n):
    if n < 0:
        raise ValueError("n must be non-negative")
    if n < 2:
        return n

    previous, current = 0, 1
    for _ in range(2, n + 1):
        previous, current = current, previous + current
    return current`,
    tests: [
      { input: "0", expected: "0" },
      { input: "7", expected: "13" },
      { input: "20", expected: "6765" },
    ],
  },
  {
    name: "Word count",
    source: `def count_words(text):
    counts = {}
    for word in text.lower().split():
        clean = word.strip(".,!?")
        counts[clean] = counts.get(clean, 0) + 1
    return counts`,
    tests: [
      { input: '"Hello hello!"', expected: '{"hello": 2}' },
      { input: '"red blue red"', expected: '{"red": 2, "blue": 1}' },
    ],
  },
];

const languageConfig = {
  python: { label: "Python 3.12", file: "solution.py", extension: "py" },
  javascript: { label: "JavaScript", file: "solution.js", extension: "js" },
  java: { label: "Java", file: "Solution.java", extension: "java" },
  cpp: { label: "C++ 20", file: "solution.cpp", extension: "cpp" },
  rust: { label: "Rust", file: "solution.rs", extension: "rs" },
};

const storageKeys = {
  workspace: "dialect.workspace.v2",
  history: "dialect.history.v2",
  theme: "dialect.theme",
};

const state = {
  exampleIndex: 0,
  translation: null,
  tests: examples[0].tests,
  originalTarget: "",
  history: readJson(storageKeys.history, []),
  chatHistory: [],
  chatPending: false,
  saveTimer: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const sourceEditor = $("#sourceEditor");
const targetEditor = $("#targetEditor");
const sourceHighlight = $("#sourceHighlight");
const targetHighlight = $("#targetHighlight");
const sourceLines = $("#sourceLines");
const targetLines = $("#targetLines");
const translateButton = $("#translateButton");
const runTestsButton = $("#runTestsButton");

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function highlight(code, language) {
  const keywordSets = {
    python: new Set(
      "def return for in if else elif raise from import class while and or not True False None with as lambda".split(
        " ",
      ),
    ),
    cpp: new Set(
      "auto break case catch class const continue default do else enum for if namespace return struct switch throw try using while public private".split(
        " ",
      ),
    ),
    javascript: new Set(
      "const let var function return for of if else class new throw try catch while true false null async await".split(
        " ",
      ),
    ),
    java: new Set(
      "public private class static final return for if else new throw try catch while true false null extends implements".split(
        " ",
      ),
    ),
    rust: new Set(
      "fn let mut pub impl struct enum match for in if else return use mod while Some None Result Ok Err".split(
        " ",
      ),
    ),
  };
  const types = new Set(
    "int long double float bool char void string vector unordered_map HashMap String usize i32 i64 u32 u64 size_t".split(
      " ",
    ),
  );
  const keywords = keywordSets[language] || keywordSets.cpp;
  const tokenPattern =
    language === "python"
      ? /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[^\n]*|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b)/g
      : /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[ \t]*[A-Za-z_]\w*|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b)/g;
  let output = "";
  let cursor = 0;

  for (const match of code.matchAll(tokenPattern)) {
    const token = match[0];
    const index = match.index;
    output += escapeHtml(code.slice(cursor, index));

    let tokenClass = "";
    if (
      token.startsWith("//") ||
      token.startsWith("/*") ||
      (language === "python" && token.startsWith("#"))
    ) {
      tokenClass = "token-comment";
    } else if (
      token.startsWith('"') ||
      token.startsWith("'") ||
      token.startsWith('"""') ||
      token.startsWith("'''")
    ) {
      tokenClass = "token-string";
    } else if (/^\d/.test(token)) {
      tokenClass = "token-number";
    } else if (token.startsWith("#")) {
      tokenClass = "token-keyword";
    } else if (types.has(token)) {
      tokenClass = "token-type";
    } else if (keywords.has(token)) {
      tokenClass = "token-keyword";
    } else if (/^\s*\(/.test(code.slice(index + token.length))) {
      tokenClass = "token-function";
    }

    const escapedToken = escapeHtml(token);
    output += tokenClass
      ? `<span class="${tokenClass}">${escapedToken}</span>`
      : escapedToken;
    cursor = index + token.length;
  }

  return `${output}${escapeHtml(code.slice(cursor))}\n`;
}

function updateEditor(editor, highlightLayer, linesLayer, language) {
  const count = Math.max(1, editor.value.split("\n").length);
  highlightLayer.innerHTML = highlight(editor.value, language);
  linesLayer.textContent = Array.from({ length: count }, (_, i) => i + 1).join("\n");
}

function syncScroll(editor, highlightLayer, linesLayer) {
  highlightLayer.scrollTop = editor.scrollTop;
  highlightLayer.scrollLeft = editor.scrollLeft;
  linesLayer.scrollTop = editor.scrollTop;
}

function updateSource() {
  updateEditor(sourceEditor, sourceHighlight, sourceLines, $("#sourceLanguage").value);
  const lines = sourceEditor.value ? sourceEditor.value.split("\n").length : 0;
  $("#sourceStats").textContent = `${lines} lines · ${sourceEditor.value.length} chars`;
  scheduleSave();
}

function updateTarget() {
  updateEditor(targetEditor, targetHighlight, targetLines, $("#targetLanguage").value);
  const lines = targetEditor.value ? targetEditor.value.split("\n").length : 0;
  $("#targetStats").textContent = targetEditor.value
    ? `${lines} lines · ${targetEditor.value.length} chars`
    : "Waiting for translation";
}

function markTargetEdited() {
  if (!state.translation) return;
  const edited = targetEditor.value !== state.originalTarget;
  $("#editedLabel").hidden = !edited;
  runTestsButton.disabled = edited || !state.translation.translation_id;
  $("#verificationPill").className = "status-pill pending";
  $("#verificationPill").textContent = edited ? "CHANGED" : "NOT RUN";
  $("#testDisclaimer").textContent = edited
    ? "The generated output changed. Retranslate or restore it before verification."
    : "Ready to compile against the included example contract.";
  updateTarget();
  scheduleSave();
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function scheduleSave() {
  $("#saveStatus").textContent = "Saving…";
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => {
    const snapshot = {
      source: sourceEditor.value,
      target: targetEditor.value,
      sourceLanguage: $("#sourceLanguage").value,
      targetLanguage: $("#targetLanguage").value,
      tests: state.tests,
      translation: state.translation,
      originalTarget: state.originalTarget,
      savedAt: Date.now(),
    };
    localStorage.setItem(storageKeys.workspace, JSON.stringify(snapshot));
    $("#saveStatus").textContent = "Saved locally";
  }, 350);
}

function loadExample(index = state.exampleIndex, notify = false) {
  const example = examples[index];
  state.exampleIndex = index;
  state.tests = example.tests;
  state.translation = null;
  state.chatHistory = [];
  state.originalTarget = "";
  sourceEditor.value = example.source;
  targetEditor.value = "";
  $("#sourceLanguage").value = "python";
  $("#targetLanguage").value = "cpp";
  $("#exampleSelect").value = String(index);
  $("#emptyOutput").hidden = false;
  $("#editedLabel").hidden = true;
  targetEditor.readOnly = true;
  targetEditor.classList.remove("editing");
  $("#editButton").textContent = "Edit";
  resetReview();
  resetTests();
  updateFileLabels();
  updateSource();
  updateTarget();
  if (notify) showToast(`Loaded ${example.name}.`);
}

function resetReview() {
  $("#changesList").innerHTML =
    '<div class="blank-state">Translate a snippet to see language-specific decisions.</div>';
  $("#changeCount").textContent = "0 changes";
  $("#scoreRing").innerHTML = "<strong>—</strong><span>/100</span>";
  $("#scoreStatus").textContent = "Not analyzed";
  $("#sourceLineMetric").textContent = "—";
  $("#targetLineMetric").textContent = "—";
  $("#lineDeltaMetric").textContent = "—";
  $("#branchMetric").textContent = "—";
  $("#reviewSummary").textContent =
    "Translate code to generate a static review of language-boundary risks.";
  $("#findingList").innerHTML = '<div class="blank-state">No analysis yet.</div>';
  $("#riskPill").className = "status-pill pending";
  $("#riskPill").textContent = "WAITING";
}

function resetTests() {
  $("#verificationPill").className = "status-pill pending";
  $("#verificationPill").textContent = "NOT RUN";
  $("#testTable").innerHTML = `
    <div class="test-row test-header">
      <span>INPUT</span><span>EXPECTED</span><span>STATUS</span>
    </div>
    ${state.tests
      .map(
        (test) => `
      <div class="test-row">
        <span>${escapeHtml(test.input)}</span>
        <span>${escapeHtml(test.expected)}</span>
        <span>Ready</span>
      </div>`,
      )
      .join("")}
  `;
  runTestsButton.disabled = !state.translation?.translation_id;
}

function renderChanges(changes = [], assumptions = []) {
  const notes = [
    ...changes,
    ...assumptions.map((assumption) => ({
      title: "Translation assumption",
      explanation: assumption,
    })),
  ];
  $("#changeCount").textContent = `${notes.length} note${notes.length === 1 ? "" : "s"}`;
  $("#changesList").innerHTML = notes.length
    ? notes
        .map(
          (change, index) => `
      <div class="change-item">
        <span class="change-index">${String(index + 1).padStart(2, "0")}</span>
        <div>
          <strong>${escapeHtml(change.title)}</strong>
          <p>${escapeHtml(change.explanation)}</p>
        </div>
      </div>`,
        )
        .join("")
    : '<div class="blank-state">The engine returned no implementation notes.</div>';
}

function renderAnalysis(analysis = {}) {
  const metrics = analysis.metrics || {};
  const score = analysis.score ?? "—";
  $("#scoreRing").innerHTML = `<strong>${escapeHtml(score)}</strong><span>/100</span>`;
  $("#scoreStatus").textContent = score === "—" ? "Not analyzed" : `${score}/100 review score`;
  $("#sourceLineMetric").textContent = metrics.source_lines ?? "—";
  $("#targetLineMetric").textContent = metrics.target_lines ?? "—";
  $("#lineDeltaMetric").textContent =
    typeof metrics.line_delta === "number"
      ? `${metrics.line_delta >= 0 ? "+" : ""}${metrics.line_delta}`
      : "—";
  $("#branchMetric").textContent = metrics.branches ?? "—";
  $("#reviewSummary").textContent = analysis.summary || "Static review unavailable.";

  const risks = analysis.risks || [];
  $("#riskPill").className =
    analysis.risk_level === "high" ? "status-pill pending" : "status-pill passed";
  $("#riskPill").textContent = `${(analysis.risk_level || "low").toUpperCase()} RISK`;
  $("#findingList").innerHTML = risks.length
    ? risks
        .map(
          (risk) => `
      <div class="finding">
        <span class="severity-dot ${escapeHtml(risk.severity)}"></span>
        <div>
          <strong>${escapeHtml(risk.title)}</strong>
          <p>${escapeHtml(risk.detail)}</p>
        </div>
      </div>`,
        )
        .join("")
    : `
      <div class="finding">
        <span class="severity-dot"></span>
        <div><strong>No obvious static flags</strong>
        <p>This is not a proof of equivalence. Keep boundary and adversarial tests.</p></div>
      </div>`;
}

function addHistory(result) {
  const snapshot = {
    id: result.request_id || String(Date.now()),
    name: inferFunctionName(sourceEditor.value) || "Untitled translation",
    source: sourceEditor.value,
    target: targetEditor.value,
    sourceLanguage: $("#sourceLanguage").value,
    targetLanguage: $("#targetLanguage").value,
    tests: state.tests,
    translation: result,
    originalTarget: state.originalTarget,
    createdAt: Date.now(),
  };
  state.history = [snapshot, ...state.history.filter((item) => item.id !== snapshot.id)].slice(
    0,
    15,
  );
  localStorage.setItem(storageKeys.history, JSON.stringify(state.history));
  renderHistory();
}

function inferFunctionName(code) {
  return code.match(/\b(?:def|fn|function)\s+([A-Za-z_]\w*)/)?.[1] ||
    code.match(/\b([A-Za-z_]\w*)\s*\([^)]*\)\s*\{/)?.[1];
}

function renderHistory() {
  $("#historyList").innerHTML = state.history.length
    ? state.history
        .map(
          (item) => `
      <button class="history-item" data-history-id="${escapeHtml(item.id)}">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(languageConfig[item.sourceLanguage]?.label || item.sourceLanguage)}
          → ${escapeHtml(languageConfig[item.targetLanguage]?.label || item.targetLanguage)}
          · ${new Date(item.createdAt).toLocaleString()}</span>
      </button>`,
        )
        .join("")
    : '<div class="history-empty">Your completed translations will appear here.</div>';
}

function restoreSnapshot(snapshot) {
  if (!snapshot) return;
  sourceEditor.value = snapshot.source || "";
  targetEditor.value = snapshot.target || "";
  $("#sourceLanguage").value = snapshot.sourceLanguage || "python";
  $("#targetLanguage").value = snapshot.targetLanguage || "cpp";
  state.tests = snapshot.tests || [];
  state.translation = snapshot.translation || null;
  state.originalTarget = snapshot.originalTarget || snapshot.target || "";
  $("#emptyOutput").hidden = Boolean(targetEditor.value);
  updateFileLabels();
  updateSource();
  updateTarget();
  resetTests();
  if (state.translation) {
    renderChanges(state.translation.changes, state.translation.assumptions);
    renderAnalysis(state.translation.analysis);
    $("#engineLabel").textContent =
      state.translation.engine === "demo" ? "Local demo" : state.translation.model;
    runTestsButton.disabled =
      !state.translation.translation_id || targetEditor.value !== state.originalTarget;
  } else {
    resetReview();
  }
  markTargetEdited();
}

async function translate() {
  const sourceLanguage = $("#sourceLanguage").value;
  const targetLanguage = $("#targetLanguage").value;
  if (!sourceEditor.value.trim()) return showToast("Add some source code first.");
  if (sourceLanguage === targetLanguage) return showToast("Choose two different languages.");

  translateButton.disabled = true;
  translateButton.querySelector("span").textContent = "Translating…";
  $("#emptyOutput").hidden = true;
  $("#loadingOutput").hidden = false;
  runTestsButton.disabled = true;

  try {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_language: sourceLanguage,
        target_language: targetLanguage,
        code: sourceEditor.value,
        tests: state.tests,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Translation failed");

    state.translation = result;
    state.chatHistory = [];
    state.originalTarget = result.code;
    targetEditor.value = result.code;
    targetEditor.readOnly = true;
    targetEditor.classList.remove("editing");
    $("#editButton").textContent = "Edit";
    $("#editedLabel").hidden = true;
    $("#engineLabel").textContent =
      result.engine === "demo"
        ? result.cached
          ? "Local demo · cached"
          : "Local demo"
        : `${result.model}${result.cached ? " · cached" : ""}`;
    renderChanges(result.changes, result.assumptions);
    renderAnalysis(result.analysis);
    updateTarget();
    resetTests();
    addHistory(result);
    scheduleSave();
    showToast(
      result.cached
        ? "Loaded a cached translation. Review it before use."
        : "Translation drafted. Review and verify it next.",
    );
  } catch (error) {
    $("#emptyOutput").hidden = Boolean(targetEditor.value);
    showToast(error.message);
  } finally {
    $("#loadingOutput").hidden = true;
    translateButton.disabled = false;
    translateButton.querySelector("span").textContent = "Translate";
  }
}

async function runTests() {
  if (!state.translation?.translation_id) {
    showToast("Only bundled examples can run in the local verifier.");
    return;
  }
  if (targetEditor.value !== state.originalTarget) {
    showToast("The target changed. Restore or retranslate it first.");
    return;
  }

  runTestsButton.disabled = true;
  $("#verificationPill").className = "status-pill running";
  $("#verificationPill").textContent = "RUNNING";
  const rows = $$("#testTable .test-row:not(.test-header)");
  rows.forEach((row) => {
    row.lastElementChild.textContent = "Checking…";
  });

  try {
    const response = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        translation_id: state.translation.translation_id,
        code: targetEditor.value,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Verification failed");
    if (result.modified) throw new Error(result.message);
    if (!result.compiled) throw new Error(result.message || "This output cannot be executed.");

    rows.forEach((row, index) => {
      const test = result.results[index];
      row.lastElementChild.textContent = test?.passed ? `Pass · ${test.actual}` : `Fail · ${test?.actual || "no output"}`;
      row.lastElementChild.className = test?.passed ? "test-pass" : "";
    });
    const passedCount = result.results.filter((test) => test.passed).length;
    $("#verificationPill").className =
      passedCount === rows.length ? "status-pill passed" : "status-pill pending";
    $("#verificationPill").textContent = `${passedCount}/${rows.length} PASSED`;
    $("#testDisclaimer").textContent =
      `${result.compiler} compiled and executed this exact output locally. Known cases only.`;
    showToast(
      passedCount === rows.length
        ? "Compilation succeeded and all known checks passed."
        : "One or more behavioral checks failed.",
    );
  } catch (error) {
    rows.forEach((row) => {
      row.lastElementChild.textContent = "Not run";
    });
    $("#verificationPill").className = "status-pill pending";
    $("#verificationPill").textContent = "ERROR";
    showToast(error.message);
  } finally {
    runTestsButton.disabled = targetEditor.value !== state.originalTarget;
  }
}

async function submitChatQuestion(question) {
  if (!question || state.chatPending) return;
  state.chatPending = true;
  $("#chatInput").disabled = true;
  $("#chatForm button").disabled = true;
  $("#chatLog").insertAdjacentHTML(
    "beforeend",
    `<div class="message user-message"><p>${escapeHtml(question)}</p></div>`,
  );
  const pendingId = `chat-${Date.now()}`;
  $("#chatLog").insertAdjacentHTML(
    "beforeend",
    `<div class="message assistant-message thinking-message" id="${pendingId}">
      <span class="avatar">D</span><p><span class="thinking-dots">Thinking</span></p>
    </div>`,
  );
  $("#chatLog").scrollTop = $("#chatLog").scrollHeight;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        history: state.chatHistory.slice(-6),
        context: {
          source_language: $("#sourceLanguage").value,
          target_language: $("#targetLanguage").value,
          source_code: sourceEditor.value,
          target_code: targetEditor.value,
          changes: state.translation?.changes || [],
          assumptions: state.translation?.assumptions || [],
          analysis: state.translation?.analysis || {},
          tests: state.tests,
        },
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Chat request failed");
    state.chatHistory.push(
      { role: "user", content: question },
      { role: "assistant", content: result.answer },
    );
    state.chatHistory = state.chatHistory.slice(-12);
    document.getElementById(pendingId)?.remove();
    $("#chatLog").insertAdjacentHTML(
      "beforeend",
      `<div class="message assistant-message">
        <span class="avatar">D</span>
        <div class="assistant-answer"><p>${escapeHtml(result.answer)}</p>
        <small>${escapeHtml(result.model || "Fallback reviewer")} · ${result.latency_ms} ms</small></div>
      </div>`,
    );
  } catch (error) {
    document.getElementById(pendingId)?.remove();
    $("#chatLog").insertAdjacentHTML(
      "beforeend",
      `<div class="message assistant-message error-message"><span class="avatar">!</span>
        <p>${escapeHtml(error.message)}</p></div>`,
    );
  } finally {
    state.chatPending = false;
    $("#chatInput").disabled = false;
    $("#chatForm button").disabled = false;
    $("#chatInput").focus();
    $("#chatLog").scrollTop = $("#chatLog").scrollHeight;
  }
}

function updateFileLabels() {
  $("#sourceFilename").textContent = languageConfig[$("#sourceLanguage").value].file;
  $("#targetFilename").textContent = languageConfig[$("#targetLanguage").value].file;
}

function downloadTarget() {
  if (!targetEditor.value) return showToast("Nothing to download yet.");
  const filename = languageConfig[$("#targetLanguage").value].file;
  const url = URL.createObjectURL(new Blob([targetEditor.value], { type: "text/plain" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast(`Downloaded ${filename}.`);
}

async function loadHealth() {
  try {
    const response = await fetch("/api/health");
    const health = await response.json();
    $("#apiState").classList.toggle("live", health.ok);
    $("#apiState span").textContent =
      health.engine === "lmstudio"
        ? "LM Studio connected"
        : health.engine === "openai"
          ? "OpenAI connected"
          : "Demo engine";
    $("#engineStatus").textContent =
      health.engine === "demo" ? "Built-in examples" : health.model;
    $("#compilerStatus").textContent = health.compiler ? "clang++ ready" : "Unavailable";
  } catch {
    $("#apiState span").textContent = "Server offline";
    $("#engineStatus").textContent = "Unavailable";
    $("#compilerStatus").textContent = "Unavailable";
  }
}

sourceEditor.addEventListener("input", () => {
  state.translation = null;
  state.chatHistory = [];
  state.originalTarget = "";
  runTestsButton.disabled = true;
  resetReview();
  updateSource();
});
sourceEditor.addEventListener("scroll", () =>
  syncScroll(sourceEditor, sourceHighlight, sourceLines),
);
targetEditor.addEventListener("input", markTargetEdited);
targetEditor.addEventListener("scroll", () =>
  syncScroll(targetEditor, targetHighlight, targetLines),
);

$("#sourceLanguage").addEventListener("change", () => {
  updateFileLabels();
  updateSource();
  scheduleSave();
});
$("#targetLanguage").addEventListener("change", () => {
  updateFileLabels();
  updateTarget();
  scheduleSave();
});
$("#exampleSelect").addEventListener("change", (event) =>
  loadExample(Number(event.target.value), true),
);
$("#translateButton").addEventListener("click", translate);
$("#runTestsButton").addEventListener("click", runTests);

$("#swapButton").addEventListener("click", () => {
  const sourceSelect = $("#sourceLanguage");
  const targetSelect = $("#targetLanguage");
  const sourceCanUseTarget = [...sourceSelect.options].some(
    (option) => option.value === targetSelect.value,
  );
  const targetCanUseSource = [...targetSelect.options].some(
    (option) => option.value === sourceSelect.value,
  );
  if (!sourceCanUseTarget || !targetCanUseSource) {
    return showToast("That reverse language pair is not available in this build.");
  }
  [sourceSelect.value, targetSelect.value] = [targetSelect.value, sourceSelect.value];
  [sourceEditor.value, targetEditor.value] = [targetEditor.value, sourceEditor.value];
  state.translation = null;
  state.originalTarget = "";
  resetReview();
  resetTests();
  updateFileLabels();
  updateSource();
  updateTarget();
});

$("#editButton").addEventListener("click", () => {
  if (!targetEditor.value) return showToast("Translate code before editing the output.");
  targetEditor.readOnly = !targetEditor.readOnly;
  targetEditor.classList.toggle("editing", !targetEditor.readOnly);
  $("#editButton").textContent = targetEditor.readOnly ? "Edit" : "Lock";
  if (!targetEditor.readOnly) targetEditor.focus();
});

$("#copyButton").addEventListener("click", async () => {
  if (!targetEditor.value) return showToast("Nothing to copy yet.");
  try {
    await navigator.clipboard.writeText(targetEditor.value);
    showToast("Translated code copied.");
  } catch {
    targetEditor.select();
    document.execCommand("copy");
    showToast("Translated code copied.");
  }
});
$("#downloadButton").addEventListener("click", downloadTarget);
$("#clearButton").addEventListener("click", () => {
  sourceEditor.value = "";
  targetEditor.value = "";
  state.translation = null;
  state.originalTarget = "";
  $("#emptyOutput").hidden = false;
  resetReview();
  resetTests();
  updateSource();
  updateTarget();
  sourceEditor.focus();
});

$("#fileInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 100_000) return showToast("Choose a source file smaller than 100 KB.");
  const extension = file.name.split(".").pop().toLowerCase();
  const language = Object.entries(languageConfig).find(
    ([, config]) => config.extension === extension,
  )?.[0];
  if (language && [...$("#sourceLanguage").options].some((option) => option.value === language)) {
    $("#sourceLanguage").value = language;
  }
  sourceEditor.value = await file.text();
  state.translation = null;
  targetEditor.value = "";
  updateFileLabels();
  resetReview();
  resetTests();
  updateSource();
  updateTarget();
  $("#emptyOutput").hidden = false;
  showToast(`Imported ${file.name}.`);
  event.target.value = "";
});

$("#newButton").addEventListener("click", () => {
  localStorage.removeItem(storageKeys.workspace);
  loadExample(0);
  sourceEditor.value = "";
  updateSource();
  showToast("Started a clean workspace.");
});

$("#themeButton").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem(storageKeys.theme, document.body.classList.contains("dark") ? "dark" : "light");
});

$("#historyButton").addEventListener("click", () => {
  renderHistory();
  $("#historyDrawer").classList.add("open");
  $("#historyDrawer").setAttribute("aria-hidden", "false");
});
$$("[data-close-drawer]").forEach((button) =>
  button.addEventListener("click", () => {
    $("#historyDrawer").classList.remove("open");
    $("#historyDrawer").setAttribute("aria-hidden", "true");
  }),
);
$("#historyList").addEventListener("click", (event) => {
  const item = event.target.closest("[data-history-id]");
  if (!item) return;
  restoreSnapshot(state.history.find((snapshot) => snapshot.id === item.dataset.historyId));
  $("#historyDrawer").classList.remove("open");
  $("#historyDrawer").setAttribute("aria-hidden", "true");
  showToast("Restored translation snapshot.");
});
$("#clearHistoryButton").addEventListener("click", () => {
  state.history = [];
  localStorage.removeItem(storageKeys.history);
  renderHistory();
  showToast("Local history cleared.");
});

$("#chatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#chatInput");
  const question = input.value.trim();
  input.value = "";
  submitChatQuestion(question);
});
$$("[data-question]").forEach((button) =>
  button.addEventListener("click", () => submitChatQuestion(button.dataset.question)),
);

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    translate();
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    downloadTarget();
  }
  if (event.key === "Escape") {
    $("#historyDrawer").classList.remove("open");
    $("#historyDrawer").setAttribute("aria-hidden", "true");
  }
});

$$("[data-panel-trigger]").forEach((button) => {
  button.addEventListener("click", () => {
    document
      .getElementById(button.dataset.panelTrigger)
      .scrollIntoView({ behavior: "smooth", block: "center" });
  });
});
$$(".risk-item").forEach((item) => {
  item.addEventListener("click", () => {
    $$(".risk-item").forEach((node) => node.classList.remove("active"));
    item.classList.add("active");
  });
});

if (localStorage.getItem(storageKeys.theme) === "dark") {
  document.body.classList.add("dark");
}
const savedWorkspace = readJson(storageKeys.workspace, null);
if (savedWorkspace?.source) {
  restoreSnapshot(savedWorkspace);
} else {
  loadExample(0);
}
renderHistory();
loadHealth();
