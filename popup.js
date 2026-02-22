// popup.js

const fields = ["apiKey", "userName", "userRole", "userSkills"];

// Resume defaults pre-filled from Aadarsh's resume
const DEFAULTS = {
  userName: "Aadarsh Chaurasia",
  userRole: "Mobile Application Developer (Android)",
  userSkills: "Kotlin, Android SDK, Jetpack Compose, MVVM, Retrofit, Firebase, Hilt, Coroutines, Room, AR development, Augmented Reality, C++, Python, SQL, Clean Architecture, 1 year experience at Xcelore Private Limited"
};

// Load saved settings, fall back to resume defaults
chrome.storage.sync.get(fields, (data) => {
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (!el) return;
    if (data[f]) {
      el.value = data[f];
    } else if (DEFAULTS[f]) {
      el.value = DEFAULTS[f];
    }
  });
});

// Save settings
document.getElementById("saveBtn").addEventListener("click", () => {
  const data = {};
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el) data[f] = el.value.trim();
  });

  chrome.storage.sync.set(data, () => {
    const msg = document.getElementById("savedMsg");
    msg.style.display = "block";
    setTimeout(() => msg.style.display = "none", 2500);
  });
});
