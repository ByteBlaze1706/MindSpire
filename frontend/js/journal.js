// frontend/js/journal.js
const API_JOURNAL = "http://localhost:8080/api/journal";
const API_AUTH = "http://localhost:8080/api/auth";

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

if (!profile) {
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  if (profile) {
    loadJournals();
  }
});

// Load Journals list
async function loadJournals() {
  const loading = document.getElementById("journal-loading");
  const empty = document.getElementById("journal-empty");
  const feed = document.getElementById("journal-feed");
  const counter = document.getElementById("entries-count");

  loading.classList.remove("d-none");
  empty.classList.add("d-none");
  feed.innerHTML = "";

  try {
    const res = await fetch(`${API_JOURNAL}/list`, {
      method: "GET",
      credentials: "include"
    });

    if (!res.ok) throw new Error("Could not load journals.");
    const data = await res.json();

    loading.classList.add("d-none");
    counter.innerText = `${data.length} Entry${data.length !== 1 ? 'ies' : ''}`;

    if (data.length === 0) {
      empty.classList.remove("d-none");
      return;
    }

    renderFeed(data);
  } catch (err) {
    loading.classList.add("d-none");
    feed.innerHTML = `<div class="text-center text-danger text-xs py-5">Error: ${err.message}</div>`;
  }
}

// Render journal entries feed
function renderFeed(entries) {
  const feed = document.getElementById("journal-feed");
  feed.innerHTML = "";

  entries.forEach(entry => {
    const card = document.createElement("div");
    card.className = "journal-entry-card d-flex flex-column gap-3";
    
    // Formatting date
    const date = new Date(entry.createdAt).toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const isGratitudeBadge = entry.isGratitude 
      ? `<span class="badge badge-wellness" style="background-color: var(--accent-color); color: var(--text-dark);">Gratitude 🌟</span>` 
      : ``;

    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-start border-bottom pb-2">
        <div class="d-flex align-items-center gap-2">
          <span class="text-xs text-muted font-semibold">${date}</span>
          ${isGratitudeBadge}
        </div>
        <button onclick="deleteJournal('${entry.id}')" class="btn btn-link text-danger text-xs p-0 border-0 text-decoration-none">Delete</button>
      </div>
      <p class="text-sm text-dark mb-0 leading-relaxed" style="white-space: pre-wrap;">${entry.content}</p>
    `;
    feed.appendChild(card);
  });
}

// Submit Journal entry
async function submitJournal(e) {
  e.preventDefault();
  const content = document.getElementById("journal-content").value.trim();
  const isGrat = document.getElementById("journal-gratitude").checked;
  const btn = document.getElementById("save-journal-btn");

  if (!content) return;

  btn.disabled = true;
  btn.innerText = "Encrypting & saving...";

  try {
    const res = await fetch(`${API_JOURNAL}/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: content,
        isGratitude: isGrat
      }),
      credentials: "include"
    });

    if (!res.ok) throw new Error("Failed to save journal reflection.");

    showJournalAlert("Reflection encrypted and logged successfully! ✓", "success");
    document.getElementById("journal-content").value = "";
    document.getElementById("journal-gratitude").checked = false;

    // Reload list
    loadJournals();
  } catch (err) {
    showJournalAlert(err.message, "danger");
  } finally {
    btn.disabled = false;
    btn.innerText = "Save Reflection";
  }
}

// Show alert message
function showJournalAlert(msg, type) {
  const alertDiv = document.getElementById("journal-alert");
  alertDiv.innerText = msg;
  alertDiv.className = `alert alert-${type} text-xs rounded-3 mb-3`;
  alertDiv.classList.remove("d-none");
  setTimeout(() => alertDiv.classList.add("d-none"), 4500);
}

// Delete Journal entry
async function deleteJournal(id) {
  if (!confirm("Are you sure you want to delete this journal entry? This action is irreversible.")) return;

  try {
    const res = await fetch(`${API_JOURNAL}/delete/${id}`, {
      method: "DELETE",
      credentials: "include"
    });

    if (!res.ok) throw new Error("Could not delete journal entry.");
    
    loadJournals();
  } catch (err) {
    alert(err.message);
  }
}

// Search journals
async function searchJournals(e) {
  e.preventDefault();
  const keyword = document.getElementById("search-keyword").value.trim();
  if (!keyword) return;

  const loading = document.getElementById("journal-loading");
  const empty = document.getElementById("journal-empty");
  const feed = document.getElementById("journal-feed");
  const counter = document.getElementById("entries-count");
  const clearBtn = document.getElementById("clear-search-btn");

  loading.classList.remove("d-none");
  empty.classList.add("d-none");
  feed.innerHTML = "";
  clearBtn.classList.remove("d-none");

  try {
    const res = await fetch(`${API_JOURNAL}/search?keyword=${encodeURIComponent(keyword)}`, {
      method: "GET",
      credentials: "include"
    });

    if (!res.ok) throw new Error("Search failed.");
    const data = await res.json();

    loading.classList.add("d-none");
    counter.innerText = `${data.length} Match${data.length !== 1 ? 'es' : ''}`;

    if (data.length === 0) {
      empty.classList.remove("d-none");
      return;
    }

    renderFeed(data);
  } catch (err) {
    loading.classList.add("d-none");
    feed.innerHTML = `<div class="text-center text-danger text-xs py-5">Error: ${err.message}</div>`;
  }
}

// Clear search filters
function clearSearch() {
  document.getElementById("search-keyword").value = "";
  document.getElementById("clear-search-btn").classList.add("d-none");
  loadJournals();
}

// Logout handler
async function logout() {
  try {
    await fetch(`${API_AUTH}/logout`, {
      method: "POST",
      credentials: "include"
    });
  } catch (e) {}
  sessionStorage.clear();
  window.location.href = "login.html";
}
