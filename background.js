// background.js - Uses Groq API (Free, fast, no region restrictions)

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "reachout-email",
    title: "✉️ ReachOut: Generate Cold Email",
    contexts: ["selection"]
  });
});

// Safe send — injects content script first if tab can't receive messages
async function safeSend(tabId, msg) {
  try {
    await chrome.tabs.sendMessage(tabId, msg);
  } catch (e) {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
      await chrome.scripting.insertCSS({ target: { tabId }, files: ["content.css"] });
      await chrome.tabs.sendMessage(tabId, msg);
    } catch (e2) {
      console.error("safeSend failed:", e2.message);
    }
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "reachout-email") return;

  const selectedText = info.selectionText;
  if (!selectedText || selectedText.trim().length < 10) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (msg) => {
        const t = document.createElement("div");
        t.textContent = msg;
        t.style.cssText = "position:fixed;top:20px;right:20px;z-index:999999;background:#333;color:#fff;padding:12px 20px;border-radius:8px;font-size:14px;font-family:sans-serif;";
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3000);
      },
      args: ["⚠️ Please select more text (e.g. a full job post)"]
    });
    return;
  }

  await safeSend(tab.id, { type: "SHOW_LOADING" });

  const { apiKey, userName, userRole, userSkills } = await chrome.storage.sync.get([
    "apiKey", "userName", "userRole", "userSkills"
  ]);

  if (!apiKey) {
    await safeSend(tab.id, {
      type: "SHOW_ERROR",
      message: "No API key found.",
      detail: "Open the extension popup and paste your Groq API key, then Save."
    });
    return;
  }

  let result;
  try {
    result = await withTimeout(generateEmail(apiKey, selectedText, {
      userName: userName || "Your Name",
      userRole: userRole || "Software Engineer",
      userSkills: userSkills || "relevant skills"
    }), 15000);
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

function withTimeout(promise, ms) {
  const timer = new Promise((_, reject) =>
    setTimeout(() => reject(Object.assign(
      new Error("Request timed out after 15s"),
      { detail: "Groq took too long. Try again." }
    )), ms)
  );
  return Promise.race([promise, timer]);
}

async function generateEmail(apiKey, jobText, userInfo) {
  const prompt = `You are an expert at writing cold outreach emails for job applications.

Analyze this job post / LinkedIn content and extract:
- Job title
- Company name (if visible)
- Key required skills

Then write a concise, personalized cold outreach email from the candidate to the recruiter or hiring manager.

Job Post Content:
"""
${jobText}
"""

Candidate Info:
- Name: ${userInfo.userName}
- Current/Target Role: ${userInfo.userRole}
- Key Skills: ${userInfo.userSkills}

Return a JSON object ONLY (no markdown, no explanation, no code fences) with this exact structure:
{
  "subject": "email subject line",
  "to": "recruiter email if found, else empty string",
  "body": "full email body with \\n for newlines",
  "extractedJob": "job title extracted",
  "extractedCompany": "company name extracted"
}`;

  // Groq API — free tier, works in India, very fast (LPU inference)
  const url = "https://api.groq.com/openai/v1/chat/completions";

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1024
      })
    });
  } catch (networkErr) {
    throw Object.assign(new Error("Network error — could not reach Groq"), {
      detail: networkErr.message
    });
  }

  const data = await response.json();

  if (!response.ok) {
    const msg = data?.error?.message || "Groq API error";
    const code = data?.error?.code || response.status;
    const type = data?.error?.type || `HTTP ${response.status}`;
    throw Object.assign(new Error(`[${code}] ${msg}`), { detail: `Type: ${type}` });
  }

  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    throw Object.assign(new Error("Groq returned empty response"), {
      detail: `Finish reason: ${data.choices?.[0]?.finish_reason || "unknown"}`
    });
  }

  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw Object.assign(new Error("Could not parse response as JSON"), {
      detail: "Raw output: " + cleaned.slice(0, 200)
    });
  }

  return parsed;
}
