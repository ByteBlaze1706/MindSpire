// frontend/js/notifications.js
const API_NOTIFICATIONS = "http://localhost:8080/api/notifications";
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
    loadNotifications();
    loadPreferences();
  }
});

// Load Inbox Alerts
async function loadNotifications() {
  const loading = document.getElementById("notif-loading");
  const empty = document.getElementById("notif-empty");
  const container = document.getElementById("notif-container");

  loading.classList.remove("d-none");
  empty.classList.add("d-none");
  container.innerHTML = "";

  try {
    const res = await fetch(`${API_NOTIFICATIONS}/list`, {
      method: "GET",
      credentials: "include"
    });

    if (!res.ok) throw new Error("Could not load notifications.");
    const data = await res.json();

    loading.classList.add("d-none");
    if (data.length === 0) {
      empty.classList.remove("d-none");
      return;
    }

    renderNotifications(data);
  } catch (err) {
    loading.classList.add("d-none");
    container.innerHTML = `<div class="text-center text-danger text-xs py-5">Error: ${err.message}</div>`;
  }
}

// Render Notifications
function renderNotifications(list) {
  const container = document.getElementById("notif-container");
  container.innerHTML = "";

  list.forEach(n => {
    const card = document.createElement("div");
    card.className = `notif-card d-flex flex-column gap-2 ${!n.isRead ? 'unread' : ''}`;

    const date = new Date(n.createdAt).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    let badgeBg = "var(--primary-color)";
    let typeName = n.type;
    if (n.type === 'risk_alert') {
      badgeBg = "#dc3545";
      typeName = "Safety alert";
    } else if (n.type === 'appointment') {
      badgeBg = "#0dcaf0";
      typeName = "Booking";
    } else if (n.type === 'community_reply') {
      badgeBg = "#198754";
      typeName = "Comment reply";
    }

    const readTrigger = !n.isRead 
      ? `<button onclick="markAsRead('${n.id}')" class="btn btn-link text-xs p-0 text-decoration-none" style="font-size: 10px; color: var(--primary-color);">Mark as Read</button>` 
      : `<span class="text-xs text-muted" style="font-size: 9px;">Read</span>`;

    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <span class="notif-badge text-white" style="background-color: ${badgeBg};">${typeName}</span>
        <span class="text-xs text-muted" style="font-size: 10px;">${date}</span>
      </div>
      <h4 class="h6 text-dark font-semibold mb-0" style="font-size: 13px;">${n.title}</h4>
      <p class="text-xs text-muted mb-0 leading-relaxed">${n.body}</p>
      <div class="d-flex justify-content-end border-top pt-2 mt-1">
        ${readTrigger}
      </div>
    `;

    container.appendChild(card);
  });
}

// Mark single as read
async function markAsRead(id) {
  try {
    const res = await fetch(`${API_NOTIFICATIONS}/${id}/read`, {
      method: "POST",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed");
    loadNotifications();
  } catch (err) {
    console.error("Read mark failed");
  }
}

// Mark all as read
async function markAllAsRead() {
  const btn = document.getElementById("read-all-btn");
  btn.disabled = true;

  try {
    const res = await fetch(`${API_NOTIFICATIONS}/read-all`, {
      method: "POST",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed");
    loadNotifications();
  } catch (err) {
    alert("Connection error: " + err.message);
  } finally {
    btn.disabled = false;
  }
}

// Load user preferences
async function loadPreferences() {
  try {
    const res = await fetch(`${API_NOTIFICATIONS}/preferences`, {
      method: "GET",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();

    document.getElementById("pref-in-app").checked = data.inAppEnabled;
    document.getElementById("pref-email").checked = data.emailEnabled;
    document.getElementById("pref-push").checked = data.pushEnabled;
    document.getElementById("pref-reminders").checked = data.appointmentReminders;

    // Show risk alert controls for counselors / admins
    if (profile.role && profile.role !== 'student') {
      document.getElementById("counselor-preference-block").style.display = "block";
      document.getElementById("pref-risk-alerts").checked = data.riskAlertsSubscribed;
    }

  } catch (err) {
    console.error("Failed to load preferences", err);
  }
}

// Save preferences
async function savePreferences(e) {
  e.preventDefault();
  const alertDiv = document.getElementById("pref-alert");
  alertDiv.classList.add("d-none");

  const saveBtn = document.getElementById("save-pref-btn");
  saveBtn.disabled = true;
  saveBtn.innerText = "Saving...";

  const inApp = document.getElementById("pref-in-app").checked;
  const email = document.getElementById("pref-email").checked;
  const push = document.getElementById("pref-push").checked;
  const reminders = document.getElementById("pref-reminders").checked;
  const riskSub = document.getElementById("pref-risk-alerts") ? document.getElementById("pref-risk-alerts").checked : false;

  try {
    const res = await fetch(`${API_NOTIFICATIONS}/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inAppEnabled: inApp,
        emailEnabled: email,
        pushEnabled: push,
        appointmentReminders: reminders,
        riskAlertsSubscribed: riskSub
      }),
      credentials: "include"
    });

    if (!res.ok) throw new Error("Could not update preferences.");
    
    alertDiv.innerText = "Preferences updated successfully! ✓";
    alertDiv.classList.remove("d-none");
    setTimeout(() => alertDiv.classList.add("d-none"), 3000);
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerText = "Save Preferences";
  }
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
