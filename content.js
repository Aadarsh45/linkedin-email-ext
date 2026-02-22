// content.js

let overlay = null;

function removeOverlay() {
  if (overlay) { overlay.remove(); overlay = null; }
}

function createOverlay(contentHTML, footerHTML) {
  removeOverlay();
  overlay = document.createElement("div");
  overlay.id = "reachout-overlay";
  overlay.innerHTML = `
    <div id="reachout-modal">
      <div id="reachout-header">
        <div id="reachout-header-left">
          <div>
            <p id="reachout-title">✉️ ReachOut AI</p>
            <p id="reachout-subtitle">Cold Outreach Email Generator</p>
          </div>
        </div>
        <button id="reachout-close">×</button>
      </div>
      <div id="reachout-body">${contentHTML}</div>
      <div id="reachout-footer">${footerHTML}</div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Close handlers
  document.getElementById("reachout-close").addEventListener("click", removeOverlay);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) removeOverlay(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") removeOverlay(); }, { once: true });
}

function showLoading() {
  createOverlay(
    `<div id="reachout-loading">
      <div class="ro-spinner"></div>
      <div><strong>Analyzing job post...</strong></div>
      <div style="font-size:13px;color:#999">Crafting your cold outreach email with AI</div>
    </div>`,
    `<button class="ro-btn ro-btn-secondary" onclick="document.getElementById('reachout-overlay').remove()">Cancel</button>`
  );
}

function showEmail(email) {
  removeOverlay();

  const jobTag = email.extractedJob 
    ? `<span class="ro-tag">📌 ${email.extractedJob}${email.extractedCompany ? ' @ ' + email.extractedCompany : ''}</span>` 
    : '';

  createOverlay(
    `${jobTag}
    <div class="ro-field">
      <label class="ro-label">To</label>
      <input id="ro-to" class="ro-input" value="${escHtml(email.to || '')}" placeholder="recruiter@company.com" />
    </div>
    <div class="ro-field">
      <label class="ro-label">Subject</label>
      <input id="ro-subject" class="ro-input" value="${escHtml(email.subject || '')}" />
    </div>
    <div class="ro-field">
      <label class="ro-label">Body</label>
      <textarea id="ro-body" class="ro-textarea">${escHtml(email.body || '')}</textarea>
    </div>`,
    `<button class="ro-btn ro-btn-secondary" id="ro-copy-btn">📋 Copy</button>
     <button class="ro-btn ro-btn-primary" id="ro-gmail-btn">🚀 Open in Gmail</button>`
  );

  document.getElementById("ro-gmail-btn").addEventListener("click", openInGmail);
  document.getElementById("ro-copy-btn").addEventListener("click", copyEmail);
}

function showError(message, detail) {
  createOverlay(
    `<div class="ro-error">
      <div style="font-size:15px;font-weight:700;margin-bottom:6px;">❌ ${escHtml(message)}</div>
      ${detail ? `<div style="font-size:12px;color:#a00;background:#fff5f5;border-radius:6px;padding:7px 10px;margin-top:6px;word-break:break-all;font-family:monospace;">${escHtml(detail)}</div>` : ""}
    </div>`,
    `<button class="ro-btn ro-btn-secondary" onclick="document.getElementById('reachout-overlay').remove()">Close</button>`
  );
}

function openInGmail() {
  const to      = document.getElementById("ro-to")?.value || "";
  const subject = document.getElementById("ro-subject")?.value || "";
  const body    = document.getElementById("ro-body")?.value || "";

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1`
    + `&to=${encodeURIComponent(to)}`
    + `&su=${encodeURIComponent(subject)}`
    + `&body=${encodeURIComponent(body)}`;

  window.open(gmailUrl, "_blank");
  removeOverlay();
}

function copyEmail() {
  const subject = document.getElementById("ro-subject")?.value || "";
  const body    = document.getElementById("ro-body")?.value || "";
  const full = `Subject: ${subject}\n\n${body}`;
  navigator.clipboard.writeText(full).then(() => {
    const btn = document.getElementById("ro-copy-btn");
    if (btn) { btn.textContent = "✅ Copied!"; setTimeout(() => btn.textContent = "📋 Copy", 2000); }
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SHOW_LOADING") showLoading();
  if (msg.type === "SHOW_EMAIL")   showEmail(msg.email);
  if (msg.type === "SHOW_ERROR")   showError(msg.message, msg.detail);
});
