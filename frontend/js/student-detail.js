// frontend/js/student-detail.js
const API_BASE = "http://localhost:8080/api/counselor";
const urlParams = new URLSearchParams(window.location.search);
const studentId = urlParams.get("id");

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

let profileData = null;
let moodChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  if (profile && studentId) {
    loadStudentProfile();
  }
});

// Load student profile details
async function loadStudentProfile() {
  const loader = document.getElementById("profile-loading");
  const details = document.getElementById("profile-details");
  const denied = document.getElementById("profile-denied");

  loader.classList.remove("d-none");
  details.classList.add("d-none");
  denied.classList.add("d-none");

  try {
    const res = await fetch(`${API_BASE}/student/${studentId}/profile`, {
      method: "GET",
      credentials: "include"
    });
    if (res.status === 430) {
      loader.classList.add("d-none");
      denied.classList.remove("d-none");
      return;
    }
    if (!res.ok) throw new Error("Access error");

    const data = await res.json();
    profileData = data;
    loader.classList.add("d-none");
    details.classList.remove("d-none");

    renderProfileDetails(data);
  } catch (err) {
    loader.classList.add("d-none");
    denied.classList.remove("d-none");
  }
}

function renderProfileDetails(data) {
  document.getElementById("student-pseudonym").innerText = data.pseudonym;
  document.getElementById("student-email").innerText = `Email: ${data.email}`;

  // Set consent labels
  const journalBadge = document.getElementById("consent-journals-badge");
  const chatBadge = document.getElementById("consent-chats-badge");
  
  if (data.consent && data.consent.journals) {
    journalBadge.className = "badge badge-wellness bg-success-subtle text-success";
    journalBadge.innerText = "Journals Shared";
  } else {
    journalBadge.className = "badge badge-wellness bg-danger-subtle text-danger";
    journalBadge.innerText = "Journals Locked";
  }

  if (data.consent && data.consent.chats) {
    chatBadge.className = "badge badge-wellness bg-success-subtle text-success";
    chatBadge.innerText = "AI Chats Shared";
  } else {
    chatBadge.className = "badge badge-wellness bg-danger-subtle text-danger";
    chatBadge.innerText = "AI Chats Locked";
  }

  // Calculate Mood Avg
  const moodLogs = data.moodLogs || [];
  const moodValues = { Happy: 5, Calm: 5, Motivated: 4, Neutral: 3, Stressed: 2, Anxious: 2, Exhausted: 1, Sad: 1 };
  
  if (moodLogs.length > 0) {
    const sum = moodLogs.reduce((acc, log) => acc + (moodValues[log.descriptor] || 3), 0);
    document.getElementById("mood-avg-val").innerText = (sum / moodLogs.length).toFixed(1);
  } else {
    document.getElementById("mood-avg-val").innerText = "N/A";
  }

  // Render chart
  renderChart(moodLogs);
}

function renderChart(moodLogs) {
  const canvas = document.getElementById('mood-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const moodValues = { Happy: 5, Calm: 5, Motivated: 4, Neutral: 3, Stressed: 2, Anxious: 2, Exhausted: 1, Sad: 1 };

  const points = moodLogs.slice().reverse();
  const labels = points.map(log => new Date(log.loggedAt).toLocaleDateString());
  const dataPoints = points.map(log => moodValues[log.descriptor] || 3);

  if (moodChartInstance) {
    moodChartInstance.destroy();
  }

  moodChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Mood Checkin Score',
        data: dataPoints,
        borderColor: '#8EADC2',
        backgroundColor: 'rgba(142, 173, 194, 0.15)',
        borderWidth: 2,
        tension: 0.25,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 1, max: 5, ticks: { stepSize: 1 } }
      }
    }
  });
}

// Tab switcher
function switchProfileTab(tab) {
  const tabs = ['summary', 'assessments', 'journals', 'notes'];
  tabs.forEach(t => {
    document.getElementById(`profile-tab-${t}`).className = "btn text-xs rounded-3 font-semibold text-muted px-3 py-2";
    document.getElementById(`sec-profile-${t}`).classList.add("d-none");
  });

  document.getElementById(`profile-tab-${tab}`).className = "btn text-xs rounded-3 font-semibold bg-white shadow-sm text-dark px-3 py-2";
  document.getElementById(`sec-profile-${tab}`).classList.remove("d-none");

  if (tab === 'assessments') {
    renderAssessments();
  } else if (tab === 'journals') {
    renderJournals();
  } else if (tab === 'notes') {
    renderNotes();
  }
}

// Tab 2: Render assessments
function renderAssessments() {
  const body = document.getElementById("assessments-table-body");
  const emptyDiv = document.getElementById("assessments-empty");
  body.innerHTML = "";
  emptyDiv.classList.add("d-none");

  const results = profileData.assessmentResults || [];
  if (results.length === 0) {
    emptyDiv.classList.remove("d-none");
    return;
  }

  results.forEach(result => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${result.assessmentName}</strong></td>
      <td>${result.totalScore}</td>
      <td><span class="badge bg-light border text-dark badge-wellness">${result.severityLevel}</span></td>
      <td class="text-muted">${new Date(result.completedAt).toLocaleDateString()}</td>
    `;
    body.appendChild(row);
  });
}

// Tab 3: Render journals
function renderJournals() {
  const lockDiv = document.getElementById("journals-lock");
  const list = document.getElementById("journals-list");
  const emptyDiv = document.getElementById("journals-empty");

  lockDiv.classList.add("d-none");
  list.classList.add("d-none");
  emptyDiv.classList.add("d-none");
  list.innerHTML = "";

  if (!profileData.consent || !profileData.consent.journals) {
    lockDiv.classList.remove("d-none");
    return;
  }

  const journals = profileData.journals || [];
  if (journals.length === 0) {
    emptyDiv.classList.remove("d-none");
    return;
  }

  list.classList.remove("d-none");
  journals.forEach(entry => {
    const div = document.createElement("div");
    div.className = "wellness-card space-y-2";
    div.innerHTML = `
      <div class="d-flex justify-content-between align-items-center border-bottom border-neutral-50 pb-2 mb-2">
        <span class="text-muted text-xs" style="font-size: 10px;">Logged: ${new Date(entry.createdAt).toLocaleDateString()}</span>
        ${entry.isGratitude ? `<span class="badge bg-warning-subtle text-warning-emphasis badge-wellness">Gratitude Log</span>` : ''}
      </div>
      <p class="text-xs text-secondary leading-relaxed mb-0" style="font-size: 12px; white-space: pre-line;">${entry.content}</p>
    `;
    list.appendChild(div);
  });
}

// Tab 4: Render appointments & Session Notes logger
function renderNotes() {
  const list = document.getElementById("appointments-list");
  const emptyDiv = document.getElementById("notes-empty");
  
  list.innerHTML = "";
  emptyDiv.classList.add("d-none");

  const appts = profileData.appointments || [];
  if (appts.length === 0) {
    emptyDiv.classList.remove("d-none");
    return;
  }

  appts.forEach(appt => {
    const item = document.createElement("div");
    item.className = "wellness-card d-flex flex-column gap-3";
    item.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <p class="mb-0 text-sm font-semibold">${new Date(appt.scheduledTime).toLocaleString()}</p>
          <span class="text-muted" style="font-size: 10px;">Status: ${appt.status}</span>
        </div>
        <button onclick="toggleNotesEditor('${appt.id}')" class="btn btn-outline-dark btn-sm rounded-3 text-xs">
          ${appt.hasNotes ? 'Edit Clinical Note' : 'Add Clinical Note'}
        </button>
      </div>

      <div id="notes-editor-${appt.id}" class="d-none border-top border-neutral-100 pt-3">
        <div id="notes-loader-${appt.id}" class="text-center py-3 text-muted text-xs">Decrypting notes payload...</div>
        <form onsubmit="handleSaveSessionNote(event, '${appt.id}')" id="notes-form-${appt.id}" class="d-none">
          <div class="mb-3">
            <label class="form-label text-muted text-xs font-bold uppercase" style="font-size: 9px;">Clinical notes (Securely Envelope-Encrypted)</label>
            <textarea id="textarea-${appt.id}" rows="5" placeholder="Log counseling steps, recommendations..." required class="form-control rounded-3 text-xs"></textarea>
          </div>
          <div class="d-flex justify-content-between align-items-center">
            <span id="save-success-${appt.id}" class="text-success text-xs font-bold d-none">✓ Saved and KMS-encrypted</span>
            <button type="submit" class="btn btn-primary-wellness btn-sm text-xs">Save Session Note</button>
          </div>
        </form>
      </div>
    `;
    list.appendChild(item);
  });
}

async function toggleNotesEditor(id) {
  const div = document.getElementById(`notes-editor-${id}`);
  div.classList.toggle("d-none");

  if (!div.classList.contains("d-none")) {
    const loader = document.getElementById(`notes-loader-${id}`);
    const form = document.getElementById(`notes-form-${id}`);
    const textarea = document.getElementById(`textarea-${id}`);

    loader.classList.remove("d-none");
    form.classList.add("d-none");

    try {
      const res = await fetch(`${API_BASE}/student/note/${id}`, {
        method: "GET",
        credentials: "include"
      });
      const r = await res.json();
      if (r.success) {
        textarea.value = r.noteText;
      }
      loader.classList.add("d-none");
      form.classList.remove("d-none");
    } catch (err) {
      loader.classList.add("d-none");
      form.classList.remove("d-none");
    }
  }
}

async function handleSaveSessionNote(e, apptId) {
  e.preventDefault();
  const text = document.getElementById(`textarea-${apptId}`).value;
  const success = document.getElementById(`save-success-${apptId}`);

  try {
    const res = await fetch(`${API_BASE}/student/${studentId}/note`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        appointmentId: apptId,
        noteText: text
      })
    });
    const r = await res.json();
    if (r.success) {
      success.classList.remove("d-none");
      setTimeout(() => success.classList.add("d-none"), 3000);
      
      // Re-update local profileData hasNotes indicator
      const appt = profileData.appointments.find(a => a.id === apptId);
      if (appt) appt.hasNotes = true;
    } else {
      alert("Failed to save note");
    }
  } catch (err) {
    alert("Connection error");
  }
}
