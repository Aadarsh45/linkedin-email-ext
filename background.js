// background.js v2 - ReachOut AI
// Architecture: background handles all AI calls; content.js handles UI only

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "reachout-email",
      title: "✉️ ReachOut: Generate Cold Email",
      contexts: ["selection"]
    });
  });
});

// ─── Safe message sender ──────────────────────────────────────────────────────
async function safeSend(tabId, msg) {
  try {
    await chrome.tabs.sendMessage(tabId, msg);
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
      await chrome.scripting.insertCSS({ target: { tabId }, files: ["content.css"] });
      await chrome.tabs.sendMessage(tabId, msg);
    } catch (e2) {
      console.error("safeSend failed:", e2.message);
    }
  }
}

// ─── Context menu handler ─────────────────────────────────────────────────────
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "reachout-email") return;

  const selectedText = info.selectionText?.trim();
  if (!selectedText || selectedText.length < 10) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (msg) => {
        const t = document.createElement("div");
        t.textContent = msg;
        t.style.cssText = "position:fixed;top:20px;right:20px;z-index:999999;background:#1a1a2e;color:#fff;padding:12px 20px;border-radius:10px;font-size:14px;font-family:sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.3);";
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3000);
      },
      args: ["⚠️ Select more text — e.g. the full job post"]
    });
    return;
  }

  await safeSend(tab.id, { type: "SHOW_LOADING" });

  // Load all stored data
  const stored = await chrome.storage.local.get([
    "apiKey", "userName", "userEmail", "userPhone",
    "userRole", "userSkills", "resumeData"
  ]);

  if (!stored.apiKey) {
    await safeSend(tab.id, {
      type: "SHOW_ERROR",
      message: "No API key found.",
      detail: "Click the extension icon → add your Groq API key → Save."
    });
    return;
  }

  let result;
  try {
    result = await withTimeout(
      generateEmail(stored.apiKey, selectedText, stored),
      20000
    );
  } catch (err) {
    await safeSend(tab.id, {
      type: "SHOW_ERROR",
      message: err.message,
      detail: err.detail || ""
    });
    return;
  }

  await safeSend(tab.id, { type: "SHOW_EMAIL", email: result });
});

// ─── Timeout helper ───────────────────────────────────────────────────────────
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(Object.assign(
        new Error("Request timed out after 20s"),
        { detail: "Try again — Groq was slow." }
      )), ms)
    )
  ]);
}

// ─── Email generator ──────────────────────────────────────────────────────────
async function generateEmail(apiKey, jobText, userInfo) {
  const resume = userInfo.resumeData;

  // Build rich candidate context from parsed resume + manual fields
  const candidateBlock = buildCandidateBlock(userInfo, resume);

  const prompt = `You are an expert recruiter and career coach specializing in cold outreach emails.

Analyze the job post below and write a highly personalized cold outreach email from the candidate to the recruiter or hiring manager.

Rules:
- Keep it concise (under 200 words body)
- Be specific — reference the job title and company by name
- Match 2-3 of the candidate's skills/projects to the job requirements
- Sound human, not templated
- If resume has projects, mention the most relevant one briefly
- End with the candidate's contact info (email + phone if available)
- Do NOT use generic phrases like "I am writing to express my interest"

Job Post:
"""
${jobText}
"""

${candidateBlock}

Return ONLY a raw JSON object (no markdown, no code fences, no explanation):
{
  "subject": "concise compelling subject line",
  "to": "recruiter/hiring email if visible in job post, else empty string",
  "body": "full email body — use actual \\n for line breaks, sign off with name + email + phone",
  "extractedJob": "job title from post",
  "extractedCompany": "company name from post",
  "matchedSkills": ["skill1", "skill2", "skill3"]
}`;

  let response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.65,
        max_tokens: 1200
      })
    });
  } catch (e) {
    throw Object.assign(new Error("Network error — can't reach Groq"), { detail: e.message });
  }

  const data = await response.json();

  if (!response.ok) {
    const msg = data?.error?.message || "Groq API error";
    const code = data?.error?.code || response.status;
    throw Object.assign(new Error(`[${code}] ${msg}`), {
      detail: `Type: ${data?.error?.type || response.status}`
    });
  }

  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    throw Object.assign(new Error("Groq returned empty response"), {
      detail: `Finish reason: ${data.choices?.[0]?.finish_reason || "unknown"}`
    });
  }

  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw Object.assign(new Error("Could not parse response as JSON"), {
      detail: "Raw: " + cleaned.slice(0, 300)
    });
  }
}

// ─── Build candidate context block from resume + manual fields ─────────────────
function buildCandidateBlock(userInfo, resume) {
  const lines = ["CANDIDATE PROFILE:"];

  const name  = resume?.name  || userInfo.userName  || "Candidate";
  const email = resume?.email || userInfo.userEmail || "";
  const phone = resume?.phone || userInfo.userPhone || "";
  const role  = resume?.currentRole || userInfo.userRole || "Software Engineer";
  const skills = resume?.skills?.join(", ") || userInfo.userSkills || "various skills";

  lines.push(`Name: ${name}`);
  if (email) lines.push(`Email: ${email}`);
  if (phone) lines.push(`Phone: ${phone}`);
  lines.push(`Role: ${role}`);
  lines.push(`Skills: ${skills}`);

  if (resume?.experience?.length) {
    lines.push("\nExperience:");
    resume.experience.forEach(exp => {
      lines.push(`  • ${exp.title} at ${exp.company} (${exp.duration || ""})`);
      if (exp.highlights?.length) {
        exp.highlights.slice(0, 2).forEach(h => lines.push(`    - ${h}`));
      }
    });
  }

  if (resume?.projects?.length) {
    lines.push("\nKey Projects:");
    resume.projects.slice(0, 3).forEach(p => {
      lines.push(`  • ${p.name}${p.tech ? ` (${p.tech})` : ""}: ${p.description || ""}`);
    });
  }

  if (resume?.education?.length) {
    const edu = resume.education[0];
    lines.push(`\nEducation: ${edu.degree} — ${edu.institution} (${edu.year || ""})`);
  }

  if (resume?.achievements?.length) {
    lines.push("\nNotable Achievements:");
    resume.achievements.slice(0, 3).forEach(a => lines.push(`  • ${a}`));
  }

  return lines.join("\n");
}

// ─── Resume parser (called from popup via message) ────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "PARSE_RESUME") {
    parseResume(msg.apiKey, msg.text)
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // keep channel open for async
  }
});

async function parseResume(apiKey, resumeText) {
  const prompt = `Parse this resume and extract structured data. Return ONLY raw JSON (no markdown, no code fences):

{
  "name": "full name",
  "email": "email address or empty string",
  "phone": "phone number or empty string",
  "currentRole": "most recent job title",
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {
      "title": "job title",
      "company": "company name",
      "duration": "date range e.g. May 2024 - Present",
      "highlights": ["achievement 1", "achievement 2"]
    }
  ],
  "projects": [
    {
      "name": "project name",
      "tech": "technologies used",
      "description": "one line description"
    }
  ],
  "education": [
    {
      "degree": "degree name",
      "institution": "college/university name",
      "year": "graduation year or range"
    }
  ],
  "achievements": ["achievement 1", "achievement 2"]
}

Resume text:
"""
${resumeText}
"""`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 2000
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Parse failed");

  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("Empty parse response");

  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned);
}
