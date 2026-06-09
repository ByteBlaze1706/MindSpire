// frontend/js/chat.js
const API_BASE = "http://localhost:8080/api/ai";

let activeSessionId = null;
let sessionsCache = [];
let currentSessionMessages = [];

// Auth Guard & Dev Mode Setup
let profile = JSON.parse(sessionStorage.getItem("profile"));
if (!profile && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
  profile = {
    id: "44444444-4444-4444-4444-444444444444",
    email: "student1@columbia.edu",
    role: "student",
    institutionId: "e5f6a7b8-1111-1111-1111-111111111111",
    subdomain: "columbia"
  };
  sessionStorage.setItem("profile", JSON.stringify(profile));
}

// Redirect to login if not logged in
if (!profile) {
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  if (profile) {
    loadSessions();
  }
});

// Load History sessions
async function loadSessions() {
  const list = document.getElementById("chat-history-list");
  const loading = document.getElementById("history-loading");
  const emptyDiv = document.getElementById("history-empty");

  list.innerHTML = "";
  loading.classList.remove("d-none");
  emptyDiv.classList.add("d-none");

  try {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: "GET",
      credentials: "include"
    });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    sessionsCache = data;

    loading.classList.add("d-none");
    if (data.length === 0) {
      emptyDiv.classList.remove("d-none");
      return;
    }

    data.forEach(s => {
      const item = document.createElement("div");
      item.id = `session-item-${s.id}`;
      item.className = `chat-history-item p-3 d-flex justify-content-between align-items-center ${s.id === activeSessionId ? 'active' : ''}`;
      item.onclick = () => selectSession(s.id);
      item.innerHTML = `
        <div class="text-truncate flex-grow-1" style="font-size: 13px; font-weight: 500;">
          💬 ${escapeHtml(s.title)}
        </div>
        <button onclick="handleDeleteSession(event, '${s.id}')" class="btn btn-link text-danger text-xs p-0 border-0 ms-2 text-decoration-none" style="font-size: 10px;">
          🗑️
        </button>
      `;
      list.appendChild(item);
    });
  } catch (err) {
    loading.classList.add("d-none");
    console.error("Load sessions error:", err);
  }
}

// Select and load active session messages
async function selectSession(id) {
  activeSessionId = id;
  document.getElementById("chat-welcome").classList.add("d-none");
  
  // Highlight active in history
  document.querySelectorAll(".chat-history-item").forEach(el => el.classList.remove("active"));
  const activeItem = document.getElementById(`session-item-${id}`);
  if (activeItem) activeItem.classList.add("active");

  // Set Toolbar details
  const session = sessionsCache.find(s => s.id === id);
  if (session) {
    document.getElementById("active-session-title").innerText = session.title;
    document.getElementById("active-session-date").innerText = `Updated: ${new Date(session.updatedAt).toLocaleString()}`;
    document.getElementById("chat-memory-pref").value = session.memoryPreference;
  }

  const listDiv = document.getElementById("messages-list");
  listDiv.innerHTML = "<div class='text-center py-5 text-muted text-xs'>Loading conversation history...</div>";

  try {
    const res = await fetch(`${API_BASE}/session/${id}/messages`, {
      method: "GET",
      credentials: "include"
    });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    currentSessionMessages = data.messages || [];

    renderMessages(currentSessionMessages);
  } catch (err) {
    listDiv.innerHTML = "<div class='text-center py-5 text-danger text-xs'>Failed to load message history.</div>";
  }
}

function renderMessages(messages) {
  const listDiv = document.getElementById("messages-list");
  listDiv.innerHTML = "";

  if (messages.length === 0) {
    document.getElementById("chat-welcome").classList.remove("d-none");
    return;
  }

  messages.forEach((msg, idx) => {
    const row = document.createElement("div");
    row.className = "d-flex flex-column";
    
    const bubble = document.createElement("div");
    bubble.className = `bubble ${msg.senderType === 'student' ? 'bubble-user' : 'bubble-ai'}`;
    bubble.innerText = msg.content;
    
    row.appendChild(bubble);

    // Append feedback controls for assistant replies
    if (msg.senderType === 'assistant') {
      const feedbackId = `feedback-${activeSessionId}-${idx}`;
      const controls = document.createElement("div");
      controls.className = "d-flex gap-1 align-items-center mb-3 text-xs flex-wrap";
      controls.style.marginTop = "-10px";
      controls.style.marginLeft = "10px";
      controls.id = feedbackId;
      controls.innerHTML = `
        <span class="text-muted text-xs me-1">Feedback:</span>
        <button onclick="submitFeedback('${feedbackId}', 'HELPFUL')" class="feedback-btn">Helpful 👍</button>
        <button onclick="submitFeedback('${feedbackId}', 'NOT_RELEVANT')" class="feedback-btn">Not Relevant 🔍</button>
        <button onclick="submitFeedback('${feedbackId}', 'TOO_GENERIC')" class="feedback-btn">Too Generic 📝</button>
        <button onclick="submitFeedback('${feedbackId}', 'NEEDS_HUMAN_SUPPORT')" class="feedback-btn">Needs Counselor 👥</button>
      `;
      row.appendChild(controls);
    }

    listDiv.appendChild(row);
  });

  // Scroll to bottom
  const chatMessages = document.getElementById("chat-messages");
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Start New Conversation
function startNewSession() {
  activeSessionId = null;
  currentSessionMessages = [];
  document.getElementById("active-session-title").innerText = "New Conversation";
  document.getElementById("active-session-date").innerText = "Started just now";
  document.getElementById("messages-list").innerHTML = "";
  document.getElementById("chat-welcome").classList.remove("d-none");
  document.querySelectorAll(".chat-history-item").forEach(el => el.classList.remove("active"));
}

// Quick prompts
function sendQuickPrompt(text) {
  document.getElementById("chat-input-message").value = text;
  handleSendMessage();
}

// Send Message
async function handleSendMessage(e) {
  if (e) e.preventDefault();
  const input = document.getElementById("chat-input-message");
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  document.getElementById("chat-welcome").classList.add("d-none");

  // Optimistically append user bubble
  const listDiv = document.getElementById("messages-list");
  const userBubble = document.createElement("div");
  userBubble.className = "bubble bubble-user";
  userBubble.innerText = text;
  listDiv.appendChild(userBubble);

  const chatMessages = document.getElementById("chat-messages");
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Show typing indicator
  const typing = document.getElementById("typing-indicator");
  typing.classList.remove("d-none");
  chatMessages.scrollTop = chatMessages.scrollHeight;

  const memPref = document.getElementById("chat-memory-pref").value;
  const lang = document.getElementById("chat-language").value;

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        sessionId: activeSessionId,
        message: text,
        memoryPreference: memPref,
        language: lang
      })
    });

    if (res.status === 429) {
      typing.classList.add("d-none");
      const errorBubble = document.createElement("div");
      errorBubble.className = "bubble bubble-ai text-danger";
      errorBubble.innerText = "Too Many Requests: Rate limit exceeded. Please wait a minute before sending another message.";
      listDiv.appendChild(errorBubble);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      return;
    }

    const data = await res.json();
    typing.classList.add("d-none");

    if (data.response) {
      activeSessionId = data.sessionId;
      
      // Append AI bubble
      const aiBubble = document.createElement("div");
      aiBubble.className = "bubble bubble-ai";
      aiBubble.innerText = data.response;
      listDiv.appendChild(aiBubble);

      // If crisis alert is hit, display helpline block
      if (data.isCrisis || data.crisis) {
        const crisisCard = document.createElement("div");
        crisisCard.className = "card border-danger bg-danger-subtle text-danger-emphasis p-3 my-3 rounded-4";
        crisisCard.innerHTML = `
          <strong class="d-block mb-1">🚨 Emergency Support Helpline</strong>
          <p class="text-xs mb-0">${data.crisisHelpline || "If you are in distress, please reach out to Tele-MANAS at 14416 immediately."}</p>
        `;
        listDiv.appendChild(crisisCard);
      }

      chatMessages.scrollTop = chatMessages.scrollHeight;

      // Reload side roster
      loadSessions();
    } else {
      throw new Error("Failed");
    }
  } catch (err) {
    typing.classList.add("d-none");
    const errorBubble = document.createElement("div");
    errorBubble.className = "bubble bubble-ai text-danger";
    errorBubble.innerText = "Connection error. I could not parse your request. Please check backend Spring Boot application.";
    listDiv.appendChild(errorBubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

// Submit Feedback
async function submitFeedback(elementId, rating) {
  const container = document.getElementById(elementId);
  try {
    const res = await fetch(`${API_BASE}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        sessionId: activeSessionId,
        feedbackRating: rating,
        feedbackComments: `User rated ${rating} via Chat UI buttons.`
      })
    });
    const r = await res.json();
    if (r.success) {
      container.innerHTML = `<span class="feedback-success">✓ Feedback logged: ${rating.replace(/_/g, ' ')}</span>`;
    }
  } catch (err) {
    alert("Feedback connection failed");
  }
}

// Delete Session
async function handleDeleteSession(e, id) {
  e.stopPropagation();
  if (!confirm("Delete this conversation?")) return;

  try {
    const res = await fetch(`${API_BASE}/session/${id}`, {
      method: "DELETE",
      credentials: "include"
    });
    const r = await res.json();
    if (r.success) {
      if (activeSessionId === id) {
        startNewSession();
      }
      loadSessions();
    }
  } catch (err) {
    alert("Connection error deleting session");
  }
}

// Clear All History
async function handleClearAllHistory() {
  if (!confirm("Permanently clear your entire conversation history? This cannot be undone.")) return;

  try {
    const res = await fetch(`${API_BASE}/history/clear`, {
      method: "DELETE",
      credentials: "include"
    });
    const r = await res.json();
    if (r.success) {
      startNewSession();
      loadSessions();
    }
  } catch (err) {
    alert("Connection error clearing history");
  }
}

// Memory config update
async function handleMemoryChange() {
  if (activeSessionId) {
    alert("AI memory setting updated. Changes will apply to your next query in this session.");
  }
}

// Export Session
function handleExportSession() {
  if (!activeSessionId || currentSessionMessages.length === 0) {
    alert("No active session transcript to export.");
    return;
  }

  let transcript = `MindSpire AI Conversation Transcript\n`;
  transcript += `Session: ${document.getElementById("active-session-title").innerText}\n`;
  transcript += `Export Date: ${new Date().toLocaleString()}\n`;
  transcript += `==========================================\n\n`;

  currentSessionMessages.forEach(msg => {
    const sender = msg.senderType === 'student' ? 'Student' : 'MindSpire AI';
    transcript += `[${new Date(msg.createdAt).toLocaleString()}] ${sender}:\n`;
    transcript += `${msg.content}\n\n`;
  });

  const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `mindspire_chat_${activeSessionId}.txt`;
  link.click();
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

async function logout() {
  try {
    await fetch(`http://localhost:8080/api/auth/logout`, {
      method: "POST",
      credentials: "include"
    });
  } catch (e) {}
  sessionStorage.clear();
  window.location.href = "login.html";
}
