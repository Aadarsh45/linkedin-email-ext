# ✉️ ReachOut AI — Cold Email Generator from Any Job Post

> Select any job post on LinkedIn → AI reads your resume → generates a personalized cold outreach email → opens directly in Gmail. Free. No servers. No subscriptions.

![Version](https://img.shields.io/badge/version-2.0-7c6af7?style=flat-square)
![Manifest](https://img.shields.io/badge/manifest-v3-4fd1c7?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-brightgreen?style=flat-square)
![API](https://img.shields.io/badge/powered%20by-Groq%20%28free%29-orange?style=flat-square)

---

## 🎬 How It Works

```
1. Upload your resume  →  AI parses name, experience, projects, skills
2. Select job post text on LinkedIn (or anywhere)
3. Right-click  →  "✉️ ReachOut: Generate Cold Email"
4. Review the AI-written email (editable)
5. Click "Open in Gmail"  →  compose window pre-filled
```

That's it. Under 10 seconds from job post to Gmail draft.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 📄 **Resume Parser** | Upload `.txt` or `.pdf` — AI extracts experience, projects, skills, contact info |
| 🧠 **Resume-Aware Emails** | Matches your actual projects and skills to each specific job post |
| 🏷 **Skill Matching** | Shows which of your skills matched the job requirements |
| 📧 **Gmail Integration** | One click opens Gmail compose, pre-filled with subject + body + recipient |
| 📱 **Contact Auto-Sign-off** | Your email and phone automatically appended to every email |
| 🔒 **100% Local** | No servers, no accounts — your resume and API key stay in your browser |
| ⚡ **Groq-Powered** | Uses Llama 3.3 70B via Groq — fastest free LLM inference available |

---

## 🚀 Installation

### Step 1 — Get a Free Groq API Key
1. Go to [console.groq.com/keys](https://console.groq.com/keys)
2. Sign in with Google
3. Click **"Create API Key"** → copy it

> ✅ **Completely free** — 14,400 requests/day, no credit card, works globally including India

### Step 2 — Install the Extension
1. Download the latest zip from [Releases](../../releases)
2. Unzip the folder
3. Open Chrome → go to `chrome://extensions/`
4. Enable **Developer Mode** (toggle, top right)
5. Click **"Load unpacked"** → select the unzipped `reachout-v2` folder

### Step 3 — Set Up Your Profile
1. Click the **ReachOut AI** icon in your Chrome toolbar
2. **Setup tab** → paste your Groq API key → fill in your name, email, phone → **Save**
3. **Resume tab** → drop your resume file → wait ~3 seconds for AI to parse it

### Step 4 — Generate Your First Email
1. Go to any LinkedIn job post (or any webpage with a job description)
2. **Select** the job description text with your mouse
3. **Right-click** → click **"✉️ ReachOut: Generate Cold Email"**
4. A modal appears with your personalized email — edit if needed
5. Click **"🚀 Open in Gmail"**

---

## 📁 Project Structure

```
reachout-v2/
├── manifest.json       # Chrome extension config (Manifest V3)
├── background.js       # Service worker — Groq API calls, resume parsing, context menu
├── content.js          # Injected UI — modal overlay on any webpage
├── content.css         # Modal styles (dark theme)
├── popup.html          # Extension popup — Setup / Resume / How To tabs
├── popup.js            # Popup logic — file upload, resume render, settings save
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Architecture

```
┌─────────────────┐     right-click      ┌──────────────────┐
│   Any Webpage   │  ──────────────────► │  background.js   │
│  (job post)     │                      │  (service worker)│
│                 │ ◄────────────────── │                  │
│  content.js     │   SHOW_EMAIL msg     │  Groq API call   │
│  (modal UI)     │                      │  resume context  │
└─────────────────┘                      └──────────────────┘
         │                                        │
         │  Open in Gmail                         │ chrome.storage.local
         ▼                                        ▼
┌─────────────────┐                      ┌──────────────────┐
│  Gmail Compose  │                      │  popup.js        │
│  (new tab)      │                      │  resume upload   │
└─────────────────┘                      │  settings        │
                                         └──────────────────┘
```

---

## 🛠 Tech Stack

- **Runtime**: Chrome Extension Manifest V3
- **AI Model**: `llama-3.3-70b-versatile` via [Groq](https://groq.com) (free tier)
- **Languages**: Vanilla JS, HTML, CSS — zero dependencies, zero build step
- **Storage**: `chrome.storage.local` — everything stays in your browser

---

## 🔧 Configuration

All settings are saved in `chrome.storage.local` (local to your browser, never sent anywhere except Groq):

| Setting | Description |
|---------|-------------|
| `apiKey` | Your Groq API key |
| `userName` | Your full name (used in email sign-off) |
| `userEmail` | Your email (appended to every email) |
| `userPhone` | Your phone number (appended to every email) |
| `userRole` | Your current/target role |
| `userSkills` | Comma-separated key skills |
| `resumeData` | Parsed resume JSON (auto-filled from upload) |

---

## 🧩 Adding New Email Types (Scalable Architecture)

The extension is built to support multiple actions beyond cold email. To add a new action (e.g. "Write LinkedIn DM" or "Write Follow-up"):

**1. Add a new context menu item in `background.js`:**
```javascript
chrome.contextMenus.create({
  id: "reachout-linkedin-dm",
  title: "💬 ReachOut: Write LinkedIn DM",
  contexts: ["selection"]
});
```

**2. Handle it in the `onClicked` listener:**
```javascript
if (info.menuItemId === "reachout-linkedin-dm") {
  // call a different generateDM() function
}
```

**3. Add a new generator function following the same pattern as `generateEmail()`**

The `buildCandidateBlock()` helper in `background.js` already handles the full resume context — all new actions automatically get resume-awareness for free.

---

## 📊 Free Tier Limits (Groq)

| Metric | Limit |
|--------|-------|
| Requests per minute | 30 |
| Requests per day | 14,400 |
| Tokens per minute | 6,000 |
| Cost | **$0** |

More than enough for job searching. Each email generation uses ~800–1200 tokens.

---

## 🔐 Privacy

- Your resume, API key, and personal info are stored **only in your browser** via `chrome.storage.local`
- The only external request made is to `api.groq.com` — the job post text and your resume summary are sent there for processing
- No analytics, no tracking, no backend servers

---

## 🐛 Troubleshooting

| Error | Fix |
|-------|-----|
| `Could not establish connection` | Refresh the page after installing/reloading the extension |
| `[401] Invalid API key` | Re-copy your key from console.groq.com — no spaces |
| `[429] Rate limit` | Wait a minute — you hit 30 req/min limit |
| `Empty response` | Try selecting more text from the job post |
| PDF not parsing | Use a text-based PDF (not scanned). Try saving your resume as `.txt` |

---

## 🗺 Roadmap

- [ ] LinkedIn DM generator
- [ ] Follow-up email generator  
- [ ] Cover letter generator
- [ ] Export to PDF
- [ ] Chrome Web Store release
- [ ] Support for more job boards (Indeed, Naukri, Glassdoor)

---

## 🤝 Contributing

PRs welcome! Please open an issue first to discuss what you'd like to change.

---

## 📄 License

MIT — free to use, modify, and distribute.

---

<div align="center">
  <strong>Built with ❤️ for job seekers everywhere</strong><br/>
  <sub>If this helped you land an interview, give it a ⭐</sub>
</div>
