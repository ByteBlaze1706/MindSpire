// frontend/js/counselor.js
const API_BASE = "http://localhost:8080/api/counselor";

// Auth Guard & Dev Mode Setup
let profile = JSON.parse(sessionStorage.getItem("profile"));
if (!profile && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
  profile = {
    id: "c0a80101-0000-0000-0000-000000000001",
    email: "counselor@mindspire.edu",
    role: "counselor",
    institutionId: "c0a80101-9999-0000-0000-000000000001"
  };
  sessionStorage.setItem("profile", JSON.stringify(profile));
}

if (!profile || (profile.role !== "counselor" && profile.role !== "moderator" && profile.role !== "inst_admin" && profile.role !== "super_admin")) {
  window.location.href = "login.html";
}

let rosterData = [];

document.addEventListener("DOMContentLoaded", () => {
  if (profile) {
    document.getElementById("counselor-email").innerText = profile.email;
    loadRoster();
  }
});

// Tab switcher logic
function switchTab(tab) {
  document.getElementById("sec-roster").classList.add("d-none");
  document.getElementById("sec-calendar").classList.add("d-none");
  document.getElementById("sec-alerts").classList.add("d-none");
  document.getElementById("tab-btn-roster").classList.remove("bg-light");
  document.getElementById("tab-btn-calendar").classList.remove("bg-light");
  document.getElementById("tab-btn-alerts").classList.remove("bg-light");

  if (tab === 'roster') {
    document.getElementById("sec-roster").classList.remove("d-none");
    document.getElementById("tab-btn-roster").classList.add("bg-light");
    loadRoster();
  } else if (tab === 'calendar') {
    document.getElementById("sec-calendar").classList.remove("d-none");
    document.getElementById("tab-btn-calendar").classList.add("bg-light");
    loadCalendar();
  } else if (tab === 'alerts') {
    document.getElementById("sec-alerts").classList.remove("d-none");
    document.getElementById("tab-btn-alerts").classList.add("bg-light");
    loadAlerts();
  }
}

// Load Assigned Roster
async function loadRoster() {
  const grid = document.getElementById("roster-grid");
  const loading = document.getElementById("roster-loading");
  const errorDiv = document.getElementById("roster-error");
  const emptyDiv = document.getElementById("roster-empty");

  grid.innerHTML = "";
  loading.classList.remove("d-none");
  errorDiv.classList.add("d-none");
  emptyDiv.classList.add("d-none");

  try {
    const res = await fetch(`${API_BASE}/roster`, {
      method: "GET",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Roster error");
    const data = await res.json();
    rosterData = data;

    loading.classList.add("d-none");
    if (data.length === 0) {
      emptyDiv.classList.remove("d-none");
      return;
    }

    renderRoster(data);
  } catch (err) {
    loading.classList.add("d-none");
    errorDiv.classList.remove("d-none");
  }
}

function renderRoster(list) {
  const grid = document.getElementById("roster-grid");
  grid.innerHTML = "";

  list.forEach(student => {
    const card = document.createElement("div");
    card.className = "col-12 col-md-6 col-lg-4";
    card.innerHTML = `
      <div class="wellness-card d-flex flex-column justify-content-between h-100">
        <div>
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="fs-6 text-dark mb-0">${student.pseudonym}</h4>
            <span class="badge bg-light border text-secondary badge-wellness">Student</span>
          </div>
          <p class="text-muted text-xs mb-1 truncate" style="font-size: 11px;">${student.email}</p>
          <span class="badge-wellness badge ${student.activeConsent ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}">
            Consent: ${student.activeConsent ? 'Active' : 'Locked'}
          </span>
        </div>
        <div class="border-top border-neutral-100 pt-3 mt-3">
          <a href="student-detail.html?id=${student.id}" class="btn btn-primary-wellness w-100 text-xs">
            View Clinical Profile
          </a>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function filterRoster() {
  const q = document.getElementById("roster-search").value.toLowerCase();
  const filtered = rosterData.filter(s => 
    s.pseudonym.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
  );
  renderRoster(filtered);
}

// Load Availability slots
async function loadCalendar() {
  const list = document.getElementById("calendar-list");
  const loading = document.getElementById("calendar-loading");
  const emptyDiv = document.getElementById("calendar-empty");

  list.innerHTML = "";
  loading.classList.remove("d-none");
  emptyDiv.classList.add("d-none");

  try {
    const res = await fetch(`${API_BASE}/availability`, {
      method: "GET",
      credentials: "include"
    });
    const data = await res.json();

    loading.classList.add("d-none");
    if (data.length === 0) {
      emptyDiv.classList.remove("d-none");
      return;
    }

    data.forEach(slot => {
      const item = document.createElement("div");
      item.className = "col-12 col-sm-6";
      item.innerHTML = `
        <div class="p-3 border rounded-3 bg-white d-flex flex-column justify-content-between">
          <div>
            <span class="badge badge-wellness ${slot.isBooked ? 'bg-secondary text-white' : 'bg-success-subtle text-success'}">
              ${slot.isBooked ? 'Booked' : 'Open Slot'}
            </span>
            <div class="mt-2" style="font-size: 11px;">
              <span class="text-muted">From:</span>
              <p class="mb-1 fw-bold text-dark">${new Date(slot.startTime).toLocaleString()}</p>
              <span class="text-muted">To:</span>
              <p class="mb-0 fw-bold text-dark">${new Date(slot.endTime).toLocaleString()}</p>
            </div>
          </div>
          ${!slot.isBooked ? `
            <button onclick="handleDeleteSlot('${slot.id}')" class="btn btn-link text-danger text-xs font-bold uppercase p-0 mt-3 text-start text-decoration-none" style="font-size: 10px;">
              Delete Slot
            </button>
          ` : ''}
        </div>
      `;
      list.appendChild(item);
    });
  } catch (err) {
    loading.classList.add("d-none");
  }
}

async function handleAddAvailability(e) {
  e.preventDefault();
  const start = document.getElementById("slot-start").value;
  const end = document.getElementById("slot-end").value;

  try {
    const res = await fetch(`${API_BASE}/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString()
      })
    });
    const r = await res.json();
    if (r.success) {
      document.getElementById("slot-start").value = "";
      document.getElementById("slot-end").value = "";
      loadCalendar();
    } else {
      alert(r.error || "Failed to add slot");
    }
  } catch (err) {
    alert("Connection error");
  }
}

async function handleDeleteSlot(id) {
  if (!confirm("Remove slot?")) return;
  try {
    const res = await fetch(`${API_BASE}/availability/${id}`, {
      method: "DELETE",
      credentials: "include"
    });
    const r = await res.json();
    if (r.success) loadCalendar();
  } catch (err) {
    alert("Connection error");
  }
}

// Load Risk Alerts Queue
async function loadAlerts() {
  const list = document.getElementById("alerts-list");
  const loading = document.getElementById("alerts-loading");
  const emptyDiv = document.getElementById("alerts-empty");

  list.innerHTML = "";
  loading.classList.remove("d-none");
  emptyDiv.classList.add("d-none");

  try {
    const res = await fetch(`${API_BASE}/alerts`, {
      method: "GET",
      credentials: "include"
    });
    const data = await res.json();

    loading.classList.add("d-none");
    const pendingAlerts = data.filter(a => a.status === 'pending');
    if (pendingAlerts.length === 0) {
      emptyDiv.classList.remove("d-none");
      return;
    }

    pendingAlerts.forEach(alert => {
      const item = document.createElement("div");
      item.className = "wellness-card d-flex flex-column gap-3";
      item.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <span class="badge ${alert.severity === 'critical' ? 'bg-danger text-white' : 'bg-warning text-dark'} badge-wellness">
              ${alert.severity} Risk
            </span>
            <span class="text-muted text-xs d-block mt-1">Source: ${alert.sourceType} | Student: ${alert.pseudonym}</span>
            <p class="text-xs text-dark mt-2 mb-0" style="white-space: pre-line;">${alert.resolutionNotes}</p>
          </div>
          <button onclick="toggleResolveForm('${alert.id}')" class="btn btn-outline-dark btn-sm rounded-3 text-xs">Resolve</button>
        </div>
        
        <div id="resolve-form-${alert.id}" class="d-none border-top border-neutral-100 pt-3">
          <div class="mb-2">
            <label class="form-label text-muted text-xs font-bold uppercase" style="font-size: 10px;">Resolution Steps</label>
            <input type="text" id="notes-${alert.id}" placeholder="Contacted student, scheduled session..." class="form-control rounded-3 text-xs" />
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button onclick="toggleResolveForm('${alert.id}')" class="btn btn-light btn-sm text-xs rounded-3">Cancel</button>
            <button onclick="submitResolveAlert('${alert.id}')" class="btn btn-dark btn-sm text-xs rounded-3">Confirm Resolve</button>
          </div>
        </div>
      `;
      list.appendChild(item);
    });
  } catch (err) {
    loading.classList.add("d-none");
  }
}

function toggleResolveForm(id) {
  const div = document.getElementById(`resolve-form-${id}`);
  div.classList.toggle("d-none");
}

async function submitResolveAlert(id) {
  const notes = document.getElementById(`notes-${id}`).value;
  if (!notes.trim()) return;

  try {
    const res = await fetch(`${API_BASE}/alerts/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ resolutionNotes: notes })
    });
    const r = await res.json();
    if (r.success) loadAlerts();
  } catch (err) {
    alert("Connection error");
  }
}
