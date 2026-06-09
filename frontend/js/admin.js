// frontend/js/admin.js
const API_ADMIN = "http://localhost:8080/api/admin";
const API_ANNOUNCEMENTS = "http://localhost:8080/api/announcements";
const API_AUTH = "http://localhost:8080/api/auth";

let deptChartInstance = null;
let yearChartInstance = null;

// Auth Guard & Dev Mode Setup
let profile = JSON.parse(sessionStorage.getItem("profile"));
if (!profile && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
  profile = {
    id: "22222222-2222-2222-2222-222222222222",
    email: "admin@columbia.edu",
    role: "inst_admin",
    institutionId: "e5f6a7b8-1111-1111-1111-111111111111",
    subdomain: "columbia"
  };
  sessionStorage.setItem("profile", JSON.stringify(profile));
}

// Redirect if not admin
if (!profile || (profile.role !== "inst_admin" && profile.role !== "super_admin")) {
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  if (profile) {
    document.getElementById("admin-user-email").innerText = profile.email;
    loadDashboardStats();
    loadHeatmapData();
    loadResourceAnalytics();
    loadPendingCounselors();
    loadAnnouncements();
    loadAuditLogs();
    loadBrandingForm();
  }
});

// Tab Switcher
function switchAdminTab(tabId) {
  document.querySelectorAll(".admin-section").forEach(s => s.classList.add("d-none"));
  document.querySelectorAll(".nav-tabs button").forEach(b => b.classList.remove("active-nav"));

  document.getElementById(`sec-${tabId}`).classList.remove("d-none");
  document.getElementById(`tab-${tabId}`).classList.add("active-nav");
}

// Fetch Stats
async function loadDashboardStats() {
  try {
    const res = await fetch(`${API_ADMIN}/stats`, {
      method: "GET",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to load statistics");
    
    const stats = await res.json();
    document.getElementById("stat-students").innerText = stats.activeStudents ?? 0;
    document.getElementById("stat-counselors").innerText = stats.verifiedCounselors ?? 0;
    document.getElementById("stat-checkins").innerText = stats.totalCheckIns ?? 0;
    document.getElementById("stat-alerts").innerText = stats.unresolvedRiskAlerts ?? 0;
  } catch (err) {
    console.error("Stats error:", err);
  }
}

// Fetch Heatmap Data & Plot
async function loadHeatmapData() {
  try {
    const res = await fetch(`${API_ADMIN}/heatmap`, {
      method: "GET",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to load heatmap data");

    const data = await res.json();
    renderCharts(data.departmentStats || [], data.academicYearStats || []);
  } catch (err) {
    console.error("Heatmap error:", err);
  }
}

function renderCharts(deptStats, yearStats) {
  const deptCtx = document.getElementById("chartDept").getContext("2d");
  const yearCtx = document.getElementById("chartYear").getContext("2d");

  if (deptChartInstance) deptChartInstance.destroy();
  if (yearChartInstance) yearChartInstance.destroy();

  // Primary brand color fallback
  const primaryBrandColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#8EADC2';

  // Plot Department Chart
  deptChartInstance = new Chart(deptCtx, {
    type: "bar",
    data: {
      labels: deptStats.map(s => s.cohort),
      datasets: [{
        label: "Avg Wellness Score (%)",
        data: deptStats.map(s => s.averageScore),
        backgroundColor: primaryBrandColor + "cc",
        borderColor: primaryBrandColor,
        borderWidth: 1.5,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 0, max: 100 }
      }
    }
  });

  // Plot Academic Year Chart
  yearChartInstance = new Chart(yearCtx, {
    type: "bar",
    data: {
      labels: yearStats.map(s => s.cohort),
      datasets: [{
        label: "Avg Wellness Score (%)",
        data: yearStats.map(s => s.averageScore),
        backgroundColor: "#F5AF8Fcc",
        borderColor: "#F5AF8F",
        borderWidth: 1.5,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 0, max: 100 }
      }
    }
  });
}

// Load Resource Analytics
async function loadResourceAnalytics() {
  try {
    const res = await fetch(`${API_ADMIN}/resource-analytics`, {
      method: "GET",
      credentials: "include"
    });
    if (!res.ok) throw new Error();
    const list = await res.json();

    const tbody = document.getElementById("resource-analytics-list");
    tbody.innerHTML = "";

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-muted">No resource usage tracked yet.</td></tr>`;
      return;
    }

    list.forEach(r => {
      tbody.innerHTML += `
        <tr>
          <td><span class="fw-semibold text-dark">${escapeHtml(r.title)}</span></td>
          <td><span class="badge bg-light border text-dark text-xs">${escapeHtml(r.category)}</span></td>
          <td class="text-center fw-bold text-primary-wellness" style="color: var(--primary-color);">${r.bookmarkCount}</td>
        </tr>
      `;
    });
  } catch (err) {
    document.getElementById("resource-analytics-list").innerHTML = 
      `<tr><td colspan="3" class="text-center py-4 text-danger">Error loading resource usage metrics.</td></tr>`;
  }
}

// Load Pending Counselors
async function loadPendingCounselors() {
  try {
    const res = await fetch(`${API_ADMIN}/counselors/pending`, {
      method: "GET",
      credentials: "include"
    });
    if (!res.ok) throw new Error();
    const list = await res.json();

    const tbody = document.getElementById("pending-counselors-list");
    tbody.innerHTML = "";

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No pending counselor approvals found.</td></tr>`;
      return;
    }

    list.forEach(c => {
      tbody.innerHTML += `
        <tr>
          <td><span class="fw-bold">${escapeHtml(c.realFirstName)} ${escapeHtml(c.realLastName)}</span></td>
          <td>${escapeHtml(c.email)}</td>
          <td><span class="text-xs uppercase text-muted fw-bold">${c.role}</span></td>
          <td><span class="badge bg-warning-subtle text-warning font-semibold">Under Review</span></td>
          <td class="text-end">
            <button onclick="approveCounselor('${c.id}')" class="btn btn-sm btn-success rounded-3 px-3 me-2">Approve</button>
            <button onclick="rejectCounselor('${c.id}')" class="btn btn-sm btn-outline-danger rounded-3 px-3">Decline</button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    document.getElementById("pending-counselors-list").innerHTML = 
      `<tr><td colspan="5" class="text-center py-4 text-danger">Error fetching approval queue.</td></tr>`;
  }
}

async function approveCounselor(id) {
  try {
    const res = await fetch(`${API_ADMIN}/counselors/${id}/approve`, {
      method: "POST",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to approve counselor");
    
    showCounselorMsg("Counselor credentials approved successfully! ✨", "success");
    loadPendingCounselors();
    loadDashboardStats();
    loadAuditLogs();
  } catch (err) {
    showCounselorMsg(err.message, "danger");
  }
}

async function rejectCounselor(id) {
  try {
    const res = await fetch(`${API_ADMIN}/counselors/${id}/reject`, {
      method: "POST",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to reject counselor");
    
    showCounselorMsg("Counselor registration rejected.", "warning");
    loadPendingCounselors();
    loadDashboardStats();
    loadAuditLogs();
  } catch (err) {
    showCounselorMsg(err.message, "danger");
  }
}

function showCounselorMsg(msg, type) {
  const alertDiv = document.getElementById("counselor-alert");
  alertDiv.innerText = msg;
  alertDiv.className = `alert alert-${type} text-xs rounded-3 mb-3`;
  alertDiv.classList.remove("d-none");
  setTimeout(() => alertDiv.classList.add("d-none"), 4500);
}

// Announcements Handler
async function loadAnnouncements() {
  try {
    const res = await fetch(`${API_ANNOUNCEMENTS}/all`, {
      method: "GET",
      credentials: "include"
    });
    if (!res.ok) throw new Error();
    const list = await res.json();

    const tbody = document.getElementById("announcements-list");
    tbody.innerHTML = "";

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No notices board logs.</td></tr>`;
      return;
    }

    list.forEach(a => {
      const expiryText = a.expiresAt ? new Date(a.expiresAt).toLocaleString() : "Never";
      tbody.innerHTML += `
        <tr>
          <td><span class="fw-bold">${escapeHtml(a.title)}</span></td>
          <td><span class="badge bg-light border text-dark text-xs">${a.targetAudience}</span></td>
          <td class="text-xs text-muted">${expiryText}</td>
          <td class="text-end">
            <button onclick="deleteAnnouncement('${a.id}')" class="btn btn-sm btn-outline-danger border-0">🗑️</button>
          </td>
        </tr>
      `;
    });
  } catch (e) {
    document.getElementById("announcements-list").innerHTML = 
      `<tr><td colspan="4" class="text-center py-4 text-danger">Error loading notices.</td></tr>`;
  }
}

async function publishAnnouncement(e) {
  e.preventDefault();
  const title = document.getElementById("announce-title").value;
  const content = document.getElementById("announce-content").value;
  const targetAudience = document.getElementById("announce-audience").value;
  const expiresAtVal = document.getElementById("announce-expiry").value;

  const payload = { title, content, targetAudience };
  if (expiresAtVal) {
    payload.expiresAt = new Date(expiresAtVal).toISOString();
  }

  try {
    const res = await fetch(`${API_ANNOUNCEMENTS}/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to save announcement");

    showAnnounceMsg("Notice published successfully! 📢", "success");
    document.getElementById("announce-form").reset();
    loadAnnouncements();
  } catch (err) {
    showAnnounceMsg(err.message, "danger");
  }
}

function deleteAnnouncement(id) {
  if (!confirm("Are you sure you want to delete this announcement?")) return;
  fetch(`${API_ANNOUNCEMENTS}/delete/${id}`, {
    method: "DELETE",
    credentials: "include"
  })
  .then(res => {
    if (!res.ok) throw new Error("Failed to delete notice");
    loadAnnouncements();
  })
  .catch(err => alert(err.message));
}

function showAnnounceMsg(msg, type) {
  const alertDiv = document.getElementById("announce-alert");
  alertDiv.innerText = msg;
  alertDiv.className = `alert alert-${type} text-xs rounded-3 mb-3`;
  alertDiv.classList.remove("d-none");
  setTimeout(() => alertDiv.classList.add("d-none"), 4000);
}

// Branding Manager
function loadBrandingForm() {
  const branding = JSON.parse(sessionStorage.getItem("branding"));
  if (branding) {
    document.getElementById("brand-logo").value = branding.logoUrl || "";
    document.getElementById("brand-primary-picker").value = branding.primaryColor || "#8EADC2";
    document.getElementById("brand-primary-text").value = branding.primaryColor || "#8EADC2";
    document.getElementById("brand-accent-picker").value = branding.accentColor || "#F5AF8F";
    document.getElementById("brand-accent-text").value = branding.accentColor || "#F5AF8F";
    document.getElementById("brand-email").value = branding.supportEmail || "";
    document.getElementById("brand-emergency").value = branding.emergencyPhone || "";
  }
}

async function saveBranding(e) {
  e.preventDefault();
  const logoUrl = document.getElementById("brand-logo").value;
  const primaryColor = document.getElementById("brand-primary-text").value;
  const accentColor = document.getElementById("brand-accent-text").value;
  const supportEmail = document.getElementById("brand-email").value;
  const emergencyPhone = document.getElementById("brand-emergency").value;

  try {
    const res = await fetch(`${API_ADMIN}/branding`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl, primaryColor, accentColor, supportEmail, emergencyPhone }),
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed to update branding colors");

    const msg = await res.json();
    showBrandingMsg("Custom branding config updated! Refreshing page... 🎨", "success");

    // Clear session storage and reload
    sessionStorage.removeItem("branding");
    setTimeout(() => window.location.reload(), 1500);
  } catch (err) {
    showBrandingMsg(err.message, "danger");
  }
}

function showBrandingMsg(msg, type) {
  const alertDiv = document.getElementById("branding-alert");
  alertDiv.innerText = msg;
  alertDiv.className = `alert alert-${type} text-xs rounded-3 mb-3`;
  alertDiv.classList.remove("d-none");
  setTimeout(() => alertDiv.classList.add("d-none"), 4000);
}

// Audit Logs Timeline
async function loadAuditLogs() {
  try {
    const res = await fetch(`${API_ADMIN}/audit-logs`, {
      method: "GET",
      credentials: "include"
    });
    if (!res.ok) throw new Error();
    const list = await res.json();

    const tbody = document.getElementById("audit-logs-list");
    tbody.innerHTML = "";

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No audit events generated.</td></tr>`;
      return;
    }

    list.forEach(log => {
      const d = new Date(log.createdAt).toLocaleString();
      tbody.innerHTML += `
        <tr>
          <td class="text-xs text-muted fw-mono">${d}</td>
          <td><span class="fw-bold">${escapeHtml(log.userId ? "Admin Account" : "System")}</span></td>
          <td><span class="badge bg-light text-dark font-semibold border">${log.action}</span></td>
          <td><span class="text-sm text-neutral-600">${escapeHtml(log.targetResource || "-")}</span></td>
          <td class="text-xs text-muted fw-mono">${escapeHtml(log.ipAddress || "-")}</td>
          <td class="text-xs text-muted text-truncate" style="max-width: 150px;" title="${escapeHtml(log.userAgent || '')}">
            ${escapeHtml(log.userAgent || "-")}
          </td>
        </tr>
      `;
    });
  } catch (err) {
    document.getElementById("audit-logs-list").innerHTML = 
      `<tr><td colspan="6" class="text-center py-4 text-danger">Error loading audit event datasets.</td></tr>`;
  }
}

// Helpers
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

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
