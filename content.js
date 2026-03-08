// content.js v2 - ReachOut AI

let overlay = null;

function removeOverlay() {
  if (overlay) { overlay.remove(); overlay = null; }
}

function createOverlay(bodyHTML, footerHTML, skillsHTML = "") {
  removeOverlay();
  overlay = document.createElement("div");
  overlay.id = "reachout-overlay";
  overlay.innerHTML = `
    <div id="reachout-modal">
      <div id="reachout-header">
        <div id="reachout-header-left">
          <div class="ro-header-icon">✉️</div>
          <div>
            <p id="reachout-title">ReachOut AI</p>
            <p id="reachout-subtitle">Cold Email Generator</p>
          </div>
        </div>
        <button id="reachout-close">×</button>
      </div>
      ${skillsHTML ? `<div id="ro-skills-row">${skillsHTML}</div>` : ""}
      <div id="reachout-body">${bodyHTML}</div>
      <div id="reachout-footer">${footerHTML}</div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById("reachout-close").addEventListener("click", removeOverlay);
  overlay.addEventListener("click", e => { if (e.target === overlay) removeOverlay(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") removeOverlay(); }, { once: true });
}

// ─── Loading ─────────────────────────────────────────────────────────────────
function showLoading() {
  createOverlay(
    `<div id="reachout-loading">
      <div class="ro-spinner"></div>
      <div class="ro-loading-text">Generating your email...</div>
      <div class="ro-loading-sub">Analyzing job post + matching your resume</div>
    </div>`,
    `<button class="ro-btn ro-btn-secondary" id="ro-cancel">Cancel</button>`
  );
  document.getElementById("ro-cancel")?.addEventListener("click", removeOverlay);
}

// ─── Email display ────────────────────────────────────────────────────────────
function showEmail(email) {
  removeOverlay();

  const jobTag = (email.extractedJob || email.extractedCompany)
    ? `<div class="ro-job-tag">📌 ${esc(email.extractedJob || "")}${email.extractedCompany ? " @ " + esc(email.extractedCompany) : ""}</div>`
    : "";

  let skillsHTML = "";
  if (email.matchedSkills?.length) {
    skillsHTML = `<span class="ro-skill-label">Matched:</span> ` +
      email.matchedSkills.map(s => `<span class="ro-skill-tag">${esc(s)}</span>`).join("");
  }

  createOverlay(
    `${jobTag}
    <div class="ro-field">
      <label class="ro-label">To</label>
      <input id="ro-to" class="ro-input" value="${esc(email.to || "")}" placeholder="recruiter@company.com" />
    </div>
    <div class="ro-field">
      <label class="ro-label">Subject</label>
      <input id="ro-subject" class="ro-input" value="${esc(email.subject || "")}" />
    </div>
    <div class="ro-field">
      <label class="ro-label">Body</label>
      <textarea id="ro-body" class="ro-textarea">${esc(email.body || "")}</textarea>
    </div>`,
    `<button class="ro-btn ro-btn-secondary" id="ro-copy-btn">📋 Copy</button>
     <button class="ro-btn ro-btn-primary" id="ro-gmail-btn">🚀 Open in Gmail</button>`,
    skillsHTML
  );

  document.getElementById("ro-gmail-btn").addEventListener("click", openInGmail);
  document.getElementById("ro-copy-btn").addEventListener("click", copyEmail);
}

// ─── Error display ────────────────────────────────────────────────────────────
function showError(message, detail) {
  createOverlay(
    `<div class="ro-error">
      <div class="ro-error-title">❌ ${esc(message)}</div>
      ${detail ? `<div class="ro-error-detail">${esc(detail)}</div>` : ""}
    </div>`,
    `<button class="ro-btn ro-btn-secondary" id="ro-close-err">Close</button>`
  );
  document.getElementById("ro-close-err")?.addEventListener("click", removeOverlay);
}

// ─── Actions ──────────────────────────────────────────────────────────────────
function openInGmail() {
  const to      = document.getElementById("ro-to")?.value || "";
  const subject = document.getElementById("ro-subject")?.value || "";
  const body    = document.getElementById("ro-body")?.value || "";

  const url = `https://mail.google.com/mail/?view=cm&fs=1`
    + `&to=${encodeURIComponent(to)}`
    + `&su=${encodeURIComponent(subject)}`
    + `&body=${encodeURIComponent(body)}`;

  window.open(url, "_blank");
  removeOverlay();
}

function copyEmail() {
  const subject = document.getElementById("ro-subject")?.value || "";
  const body    = document.getElementById("ro-body")?.value || "";
  navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`).then(() => {
    const btn = document.getElementById("ro-copy-btn");
    if (btn) { btn.textContent = "✅ Copied!"; setTimeout(() => btn.textContent = "📋 Copy", 2000); }
  });
}

function esc(str) {
  return String(str || "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

// ─── Message listener ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SHOW_LOADING") showLoading();
  if (msg.type === "SHOW_EMAIL")   showEmail(msg.email);
  if (msg.type === "SHOW_ERROR")   showError(msg.message, msg.detail);
});
