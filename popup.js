// popup.js v2

const FIELDS = ["apiKey", "userName", "userEmail", "userPhone", "userRole", "userSkills"];

// ─── Defaults from Aadarsh's resume ─────────────────────────────────────────
const DEFAULTS = {
  userName:   "Aadarsh Chaurasia",
  userEmail:  "aadarshchaurasia45@gmail.com",
  userPhone:  "+91 9140563616",
  userRole:   "Mobile Application Developer (Android)",
  userSkills: "Kotlin, Android SDK, Jetpack Compose, MVVM, Retrofit, Firebase, Hilt, Coroutines, Room, AR development, C++, Python, SQL, Clean Architecture"
};

// ─── Tabs ────────────────────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
  });
});

// ─── Load saved settings ─────────────────────────────────────────────────────
chrome.storage.local.get([...FIELDS, "resumeData"], (data) => {
  FIELDS.forEach(f => {
    const el = document.getElementById(f);
    if (!el) return;
    el.value = data[f] || DEFAULTS[f] || "";
  });
  if (data.resumeData) renderResumeCard(data.resumeData);
});

// ─── Save settings ───────────────────────────────────────────────────────────
document.getElementById("saveBtn").addEventListener("click", () => {
  const data = {};
  FIELDS.forEach(f => {
    const el = document.getElementById(f);
    if (el) data[f] = el.value.trim();
  });
  chrome.storage.local.set(data, () => {
    const msg = document.getElementById("savedMsg");
    msg.style.display = "block";
    setTimeout(() => msg.style.display = "none", 2000);
  });
});

// ─── Resume upload ────────────────────────────────────────────────────────────
const uploadZone = document.getElementById("uploadZone");
const fileInput  = document.getElementById("resumeFile");

uploadZone.addEventListener("dragover", e => { e.preventDefault(); uploadZone.classList.add("dragover"); });
uploadZone.addEventListener("dragleave", ()  => uploadZone.classList.remove("dragover"));
uploadZone.addEventListener("drop", e => {
  e.preventDefault();
  uploadZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

async function handleFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (!["txt", "pdf"].includes(ext)) {
    showParseStatus("error", "Only .txt and .pdf files supported");
    return;
  }

  showParseStatus("loading", "Reading file...");

  let text = "";
  try {
    if (ext === "txt") {
      text = await file.text();
    } else if (ext === "pdf") {
      text = await extractPdfText(file);
    }
  } catch (e) {
    showParseStatus("error", "Could not read file: " + e.message);
    return;
  }

  if (!text || text.trim().length < 50) {
    showParseStatus("error", "File seems empty or unreadable. Try a .txt version.");
    return;
  }

  showParseStatus("loading", "Parsing resume with AI...");

  // Get API key
  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (!apiKey) {
    showParseStatus("error", "Save your Groq API key first (Setup tab)");
    return;
  }

  // Send to background to parse
  chrome.runtime.sendMessage({ type: "PARSE_RESUME", apiKey, text }, (resp) => {
    if (!resp || !resp.ok) {
      showParseStatus("error", "Parse failed: " + (resp?.error || "unknown error"));
      return;
    }

    // Save parsed data
    chrome.storage.local.set({ resumeData: resp.data }, () => {
      showParseStatus("success", `✅ Parsed successfully — ${resp.data.experience?.length || 0} jobs, ${resp.data.projects?.length || 0} projects`);
      renderResumeCard(resp.data);

      // Auto-fill setup fields if empty
      if (resp.data.name && !document.getElementById("userName").value)
        document.getElementById("userName").value = resp.data.name;
      if (resp.data.email && !document.getElementById("userEmail").value)
        document.getElementById("userEmail").value = resp.data.email;
      if (resp.data.phone && !document.getElementById("userPhone").value)
        document.getElementById("userPhone").value = resp.data.phone;
      if (resp.data.currentRole && !document.getElementById("userRole").value)
        document.getElementById("userRole").value = resp.data.currentRole;
      if (resp.data.skills?.length && !document.getElementById("userSkills").value)
        document.getElementById("userSkills").value = resp.data.skills.join(", ");
    });
  });
}

// ─── PDF text extractor (basic — works for text-based PDFs) ──────────────────
async function extractPdfText(file) {
  // Read raw bytes and extract readable text (simple approach for text PDFs)
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] >= 32 && bytes[i] < 127) str += String.fromCharCode(bytes[i]);
    else if (bytes[i] === 10 || bytes[i] === 13) str += "\n";
  }
  // Clean up PDF artifacts
  str = str
    .replace(/<<[^>]*>>/g, " ")
    .replace(/\(([^)]+)\)/g, "$1 ")
    .replace(/[^\x20-\x7E\n]/g, " ")
    .replace(/\s{3,}/g, "\n")
    .replace(/BT|ET|Tf|Td|Tm|TJ|Tj|cm|re|Do|BI|EI/g, " ")
    .trim();
  return str;
}

// ─── Resume card renderer ─────────────────────────────────────────────────────
function renderResumeCard(data) {
  const card = document.getElementById("resume-card");
  const body = document.getElementById("resume-card-body");

  let html = "";

  if (data.name)  html += row("Name",  data.name);
  if (data.email) html += row("Email", data.email);
  if (data.phone) html += row("Phone", data.phone);
  if (data.currentRole) html += row("Role", data.currentRole);

  if (data.skills?.length) {
    const tags = data.skills.slice(0, 10).map(s => `<span class="rc-tag">${esc(s)}</span>`).join("");
    html += row("Skills", `<div style="margin-top:2px">${tags}</div>`, true);
  }

  if (data.experience?.length) {
    html += `<div class="rc-section"><div class="rc-section-title">Experience</div>`;
    data.experience.forEach(e => {
      html += `<div class="exp-item">
        <div class="exp-title">${esc(e.title)} <span style="color:var(--accent)">@ ${esc(e.company)}</span></div>
        <div class="exp-sub">${esc(e.duration || "")}</div>
      </div>`;
    });
    html += `</div>`;
  }

  if (data.projects?.length) {
    html += `<div class="rc-section"><div class="rc-section-title">Projects</div>`;
    data.projects.forEach(p => {
      html += `<div class="exp-item">
        <div class="exp-title">${esc(p.name)}</div>
        <div class="exp-sub">${esc(p.tech || "")} — ${esc(p.description || "")}</div>
      </div>`;
    });
    html += `</div>`;
  }

  if (data.achievements?.length) {
    html += `<div class="rc-section"><div class="rc-section-title">Achievements</div>`;
    data.achievements.forEach(a => {
      html += `<div class="exp-sub" style="margin-bottom:3px">• ${esc(a)}</div>`;
    });
    html += `</div>`;
  }

  body.innerHTML = html;
  card.classList.add("visible");
}

function row(label, val, raw = false) {
  return `<div class="rc-row">
    <span class="rc-label">${label}</span>
    <span class="rc-val">${raw ? val : esc(val)}</span>
  </div>`;
}

function esc(s) {
  return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ─── Clear resume ─────────────────────────────────────────────────────────────
document.getElementById("clearResume").addEventListener("click", () => {
  chrome.storage.local.remove("resumeData", () => {
    document.getElementById("resume-card").classList.remove("visible");
    document.getElementById("parse-status").style.display = "none";
    fileInput.value = "";
  });
});

// ─── Parse status helper ──────────────────────────────────────────────────────
function showParseStatus(type, text) {
  const el = document.getElementById("parse-status");
  el.className = type;
  if (type === "loading") {
    el.innerHTML = `<div class="spinner-sm"></div><span>${text}</span>`;
  } else {
    el.textContent = text;
  }
  el.style.display = type === "loading" ? "flex" : "block";
}
