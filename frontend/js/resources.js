// frontend/js/resources.js
const API_RESOURCES = "http://localhost:8080/api/resources";
const API_AUTH = "http://localhost:8080/api/auth";

let currentCategory = "all";

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
    loadRecommendations();
    loadResources();
  }
});

// Category filtering
function filterCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll("#resource-filters .filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-cat") === cat);
  });
  loadResources();
}

// Load Recommendations
async function loadRecommendations() {
  const loading = document.getElementById("rec-loading");
  const empty = document.getElementById("rec-empty");
  const container = document.getElementById("recommendations-container");

  try {
    const res = await fetch(`${API_RESOURCES}/recommendations`, {
      method: "GET",
      credentials: "include"
    });

    if (!res.ok) throw new Error("Could not load recommendations.");
    const data = await res.json();

    loading.classList.add("d-none");
    if (data.length === 0) {
      empty.classList.remove("d-none");
      return;
    }

    container.innerHTML = "";
    data.forEach(r => {
      const col = document.createElement("div");
      col.className = "col-12 col-md-4";
      col.innerHTML = `
        <div class="recommendation-card h-100 d-flex flex-column justify-content-between">
          <div>
            <span class="badge badge-wellness" style="background-color: var(--accent-color); color: var(--text-dark);">${r.category}</span>
            <h4 class="h6 text-dark font-semibold mt-3 mb-2" style="font-size: 14px;">${r.title}</h4>
            <p class="text-xs text-muted mb-0 leading-relaxed">${r.contentMarkdown.substring(0, 100).replace(/[#*`_-]/g, "")}...</p>
          </div>
          <button onclick="expandResource('${r.id}')" class="btn btn-outline-dark btn-sm rounded-3 text-xs w-100 mt-3 py-1.5">Read recommended guide</button>
        </div>
      `;
      container.appendChild(col);
    });

    container.classList.remove("d-none");
  } catch (err) {
    loading.classList.add("d-none");
    empty.innerText = `Error loading recommendations: ${err.message}`;
    empty.classList.remove("d-none");
  }
}

// Load Resources List
async function loadResources() {
  const loading = document.getElementById("res-loading");
  const empty = document.getElementById("res-empty");
  const container = document.getElementById("resources-container");

  loading.classList.remove("d-none");
  empty.classList.add("d-none");
  container.innerHTML = "";

  try {
    const res = await fetch(`${API_RESOURCES}/list?category=${encodeURIComponent(currentCategory)}`, {
      method: "GET",
      credentials: "include"
    });

    if (!res.ok) throw new Error("Could not load resources.");
    const data = await res.json();

    loading.classList.add("d-none");
    if (data.length === 0) {
      empty.classList.remove("d-none");
      return;
    }

    data.forEach(r => {
      const card = document.createElement("div");
      card.id = `resource-card-${r.id}`;
      card.className = "resource-card d-flex flex-column gap-3";

      const bookmarkText = r.isBookmarked ? "★ Bookmarked" : "☆ Bookmark";
      const bookmarkClass = r.isBookmarked ? "active" : "";

      card.innerHTML = `
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <span class="badge badge-wellness" style="background-color: var(--primary-color); color: var(--white);">${r.category}</span>
            <h3 class="h6 text-dark font-semibold mt-2 mb-0" style="font-size: 15px;">${r.title}</h3>
          </div>
          <div class="d-flex gap-2">
            <button onclick="toggleBookmark('${r.id}')" id="bookmark-btn-${r.id}" class="btn btn-sm btn-outline-dark rounded-3 text-xs ${bookmarkClass}">
              ${bookmarkText}
            </button>
            <button onclick="expandResource('${r.id}')" class="btn btn-primary-wellness btn-sm rounded-3 text-xs">
              Read Guide
            </button>
          </div>
        </div>

        <!-- Collapsible reading pane -->
        <div id="read-pane-${r.id}" class="d-none mt-2 border-top pt-3">
          <div class="markdown-body text-sm leading-relaxed text-dark">
            ${renderMarkdown(r.contentMarkdown)}
          </div>
        </div>
      `;

      container.appendChild(card);
    });

  } catch (err) {
    loading.classList.add("d-none");
    container.innerHTML = `<div class="text-center text-danger text-xs py-5">Error: ${err.message}</div>`;
  }
}

// Toggle bookmark state
async function toggleBookmark(id) {
  const btn = document.getElementById(`bookmark-btn-${id}`);
  btn.disabled = true;

  try {
    const res = await fetch(`${API_RESOURCES}/${id}/bookmark`, {
      method: "POST",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();

    btn.classList.toggle("active", data.isBookmarked);
    btn.innerText = data.isBookmarked ? "★ Bookmarked" : "☆ Bookmark";
  } catch (err) {
    alert("Could not update bookmark.");
  } finally {
    btn.disabled = false;
  }
}

// Expand reading pane
function expandResource(id) {
  // If we came from recommendation widgets and the resource is not rendered in current list, search and load it
  const pane = document.getElementById(`read-pane-${id}`);
  if (!pane) {
    // If not in standard list, search category first to match or load general
    filterCategory("all");
    setTimeout(() => {
      const paneDelayed = document.getElementById(`read-pane-${id}`);
      if (paneDelayed) {
        paneDelayed.classList.remove("d-none");
        document.getElementById(`resource-card-${id}`).scrollIntoView({ behavior: 'smooth' });
      }
    }, 400);
    return;
  }

  pane.classList.toggle("d-none");
  if (!pane.classList.contains("d-none")) {
    document.getElementById(`resource-card-${id}`).scrollIntoView({ behavior: 'smooth' });
  }
}

// Simple client markdown renderer for wellness content (basic parser)
function renderMarkdown(md) {
  if (!md) return "";
  
  let html = md
    .replace(/^### (.*$)/gim, '<h5 class="font-semibold text-sm mt-3 mb-2">$1</h5>')
    .replace(/^## (.*$)/gim, '<h4 class="font-semibold text-sm mt-4 mb-2">$1</h4>')
    .replace(/^# (.*$)/gim, '<h3 class="font-semibold text-base mt-4 mb-3">$1</h3>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/`(.*)`/gim, '<code>$1</code>')
    .replace(/^\s*\n/gm, '')
    .replace(/^\s*-\s*(.*)/gim, '<li>$1</li>');

  // Wrap list items
  html = html.replace(/(<li>.*<\/li>)/sim, '<ul>$1</ul>');
  
  // Wrap remaining text blocks in paragraphs
  return html.split('\n').map(line => {
    if (line.trim().startsWith('<h') || line.trim().startsWith('<ul') || line.trim().startsWith('<li>') || line.trim().startsWith('</ul')) {
      return line;
    }
    return `<p class="mb-2">${line}</p>`;
  }).join('\n');
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
