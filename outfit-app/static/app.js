/* StyleMate frontend logic: upload, streaming suggestions, shoppable links,
   history gallery, and theming. */

const $ = (id) => document.getElementById(id);

// ---------- State ----------
let selectedFile = null;
let selectedVibe = "";
let selectedBudget = "";
let lastRequest = null; // for Regenerate

// ---------- Theme ----------
(function initTheme() {
  const saved = localStorage.getItem("stylemate-theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  $("themeToggle").textContent = saved === "dark" ? "☀️" : "🌙";
})();

$("themeToggle").addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("stylemate-theme", next);
  $("themeToggle").textContent = next === "dark" ? "☀️" : "🌙";
});

// ---------- Tabs ----------
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    $("panel-" + tab.dataset.tab).classList.add("active");
    if (tab.dataset.tab === "history") loadHistory();
  });
});

// ---------- Connection status ----------
async function checkHealth() {
  try {
    const r = await fetch("/api/health");
    const d = await r.json();
    $("statusDot").className = "dot " + (d.connected ? "ok" : "bad");
    $("statusText").textContent = d.connected ? "model ready" : "model offline";
  } catch {
    $("statusDot").className = "dot bad";
    $("statusText").textContent = "model offline";
  }
}
checkHealth();
setInterval(checkHealth, 15000);

// ---------- Image selection (click / drag / paste) ----------
const drop = $("drop");

function setFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  selectedFile = file;
  const url = URL.createObjectURL(file);
  $("preview").src = url;
  $("preview").classList.remove("hidden");
  $("dropInner").classList.add("hidden");
  $("changePhoto").classList.remove("hidden");
  drop.classList.add("has-image");
  $("go").disabled = false;
}

drop.addEventListener("click", (e) => {
  if (e.target.id === "changePhoto") return; // handled below
  $("file").click();
});
$("changePhoto").addEventListener("click", (e) => { e.stopPropagation(); $("file").click(); });
$("file").addEventListener("change", () => setFile($("file").files[0]));

["dragenter", "dragover"].forEach((ev) =>
  drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("dragover"); })
);
["dragleave", "drop"].forEach((ev) =>
  drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("dragover"); })
);
drop.addEventListener("drop", (e) => {
  const f = e.dataTransfer.files[0];
  if (f) setFile(f);
});
window.addEventListener("paste", (e) => {
  const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
  if (item) setFile(item.getAsFile());
});

// ---------- Chips ----------
function wireChips(containerId, onPick) {
  $(containerId).querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const wasSel = chip.classList.contains("selected");
      $(containerId).querySelectorAll(".chip").forEach((c) => c.classList.remove("selected"));
      if (!wasSel) { chip.classList.add("selected"); onPick(chip.dataset.value); }
      else onPick("");
    });
  });
}
wireChips("vibeChips", (v) => (selectedVibe = v));
wireChips("budgetChips", (v) => (selectedBudget = v));

// ---------- Markdown + shoppable links ----------
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Turn an item description into a Google Shopping search link.
function shopLink(query) {
  const url = "https://www.google.com/search?tbm=shop&q=" + encodeURIComponent(query);
  return `<a class="shop-link" href="${url}" target="_blank" rel="noopener">${escapeHtml(query)}</a>`;
}

function renderMarkdown(md) {
  const lines = md.split("\n");
  let html = "", inList = false;
  for (let raw of lines) {
    let line = escapeHtml(raw);
    line = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    if (/^##\s+/.test(raw)) {
      if (inList) { html += "</ul>"; inList = false; }
      html += "<h2>" + line.replace(/^##\s+/, "") + "</h2>";
    } else if (/^\s*[-*]\s+/.test(raw)) {
      if (!inList) { html += "<ul>"; inList = true; }
      let content = line.replace(/^\s*[-*]\s+/, "");
      // Pattern: "**Category:** item text" -> make the item shoppable.
      const m = content.match(/^(<strong>.*?<\/strong>\s*)(.+)$/);
      if (m && m[2].trim().length > 2) {
        content = m[1] + shopLink(m[2].replace(/<\/?strong>/g, "").trim());
      }
      html += "<li>" + content + "</li>";
    } else if (raw.trim() === "") {
      if (inList) { html += "</ul>"; inList = false; }
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      html += "<p>" + line + "</p>";
    }
  }
  if (inList) html += "</ul>";
  return html;
}

// ---------- Generate (streaming) ----------
async function generate() {
  if (!selectedFile) return;
  $("go").disabled = true;
  $("resultCard").classList.remove("hidden");
  const result = $("result");
  result.classList.remove("error");
  result.innerHTML = '<span class="spinner"></span> Styling you up…';
  $("resultCard").scrollIntoView({ behavior: "smooth", block: "start" });

  const form = new FormData();
  form.append("photo", selectedFile);
  form.append("occasion", $("occasion").value);
  form.append("vibe", selectedVibe);
  form.append("season", $("season").value);
  form.append("budget", selectedBudget);
  form.append("notes", $("notes").value);
  lastRequest = true;

  let acc = "";
  try {
    const resp = await fetch("/api/suggest", { method: "POST", body: form });
    if (!resp.ok) {
      const d = await resp.json().catch(() => ({}));
      result.innerHTML = `<div class="error">${d.detail || "Something went wrong."}</div>`;
      $("go").disabled = false;
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    result.innerHTML = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop(); // keep incomplete chunk

      for (const block of events) {
        if (!block.trim()) continue;
        // Parse one SSE block: lines of "event: x" and "data: {...}".
        let ev = "message";
        const dataLines = [];
        for (const ln of block.split("\n")) {
          if (ln.startsWith("event:")) ev = ln.slice(6).trim();
          else if (ln.startsWith("data:")) dataLines.push(ln.slice(5).trim());
        }
        if (!dataLines.length) continue;
        let data = {};
        try { data = JSON.parse(dataLines.join("\n")); } catch { continue; }

        if (ev === "token") {
          acc += data.text;
          result.innerHTML = renderMarkdown(acc) + '<span class="cursor">&nbsp;</span>';
        } else if (ev === "error") {
          result.innerHTML = `<div class="error">${data.detail}</div>`;
        } else if (ev === "done") {
          result.innerHTML = renderMarkdown(acc);
        }
      }
    }
    if (acc && !result.querySelector(".error")) result.innerHTML = renderMarkdown(acc);
  } catch (e) {
    result.innerHTML = `<div class="error">Network error: ${e.message}</div>`;
  } finally {
    $("go").disabled = false;
  }
}

$("go").addEventListener("click", generate);
$("regenBtn").addEventListener("click", () => { if (lastRequest) generate(); });
$("copyBtn").addEventListener("click", () => {
  navigator.clipboard.writeText($("result").innerText).then(() => {
    $("copyBtn").textContent = "Copied!";
    setTimeout(() => ($("copyBtn").textContent = "Copy"), 1500);
  });
});

// ---------- History ----------
function fmtDate(epochSeconds) {
  return new Date(epochSeconds * 1000).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

async function loadHistory() {
  const gallery = $("gallery");
  const empty = $("historyEmpty");
  try {
    const r = await fetch("/api/history");
    const d = await r.json();
    const items = d.items || [];
    if (!items.length) {
      empty.classList.remove("hidden");
      gallery.innerHTML = "";
      return;
    }
    empty.classList.add("hidden");
    gallery.innerHTML = items
      .map(
        (it) => `
      <div class="look" data-id="${it.id}">
        <img src="${it.thumbnail || ""}" alt="look" />
        <div class="look-meta">
          <div class="look-occasion">${escapeHtml(it.occasion || "Look")}</div>
          <div class="look-date">${fmtDate(it.created_at)}</div>
        </div>
      </div>`
      )
      .join("");
    gallery.querySelectorAll(".look").forEach((el) =>
      el.addEventListener("click", () => openLook(el.dataset.id))
    );
  } catch {
    gallery.innerHTML = '<div class="error">Could not load history.</div>';
  }
}

// ---------- Modal ----------
async function openLook(id) {
  try {
    const r = await fetch("/api/history/" + id);
    if (!r.ok) return;
    const d = await r.json();
    $("modalImg").src = d.thumbnail || "";
    $("modalMeta").textContent = `${d.occasion || "Look"} · ${fmtDate(d.created_at)}`;
    $("modalText").innerHTML = renderMarkdown(d.suggestion || "");
    $("modalDelete").onclick = async () => {
      await fetch("/api/history/" + id, { method: "DELETE" });
      closeModal();
      loadHistory();
    };
    $("modal").classList.remove("hidden");
  } catch {}
}
function closeModal() { $("modal").classList.add("hidden"); }
$("modalClose").addEventListener("click", closeModal);
$("modalBackdrop").addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
