// frontend/js/dashboard.js
const API_WELLNESS = "http://localhost:8080/api/wellness";
const API_MOOD = "http://localhost:8080/api/mood";
const API_AUTH = "http://localhost:8080/api/auth";

let selectedMoodScore = null;
let selectedMoodDescriptor = null;
let moodChartInstance = null;

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

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
  if (profile) {
    document.getElementById("welcome-message").innerText = `Hello, welcome back to your space 🍃`;
    loadDashboardData();
  }
});

// Select Mood handler
function selectMood(button, score, descriptor) {
  document.querySelectorAll(".mood-btn").forEach(btn => btn.classList.remove("selected"));
  button.classList.add("selected");
  selectedMoodScore = score;
  selectedMoodDescriptor = descriptor;
}

// Submit Mood Log
async function submitMoodLog() {
  if (selectedMoodScore === null) {
    showMoodAlert("Please select a mood before saving.", "danger");
    return;
  }

  const notes = document.getElementById("mood-notes").value;
  const btn = document.getElementById("submit-mood-btn");
  btn.disabled = true;
  btn.innerText = "Saving...";

  try {
    const res = await fetch(`${API_MOOD}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score: selectedMoodScore,
        descriptor: selectedMoodDescriptor,
        notes: notes
      }),
      credentials: "include" // Include HttpOnly token cookie
    });

    if (!res.ok) {
      throw new Error("Failed to save mood log.");
    }

    showMoodAlert("Daily mood logged successfully! ✨", "success");
    document.getElementById("mood-notes").value = "";
    selectedMoodScore = null;
    selectedMoodDescriptor = null;
    document.querySelectorAll(".mood-btn").forEach(btn => btn.classList.remove("selected"));

    // Reload Dashboard Stats & Charts
    loadDashboardData();
  } catch (err) {
    showMoodAlert(err.message, "danger");
  } finally {
    btn.disabled = false;
    btn.innerText = "Save Log";
  }
}

// Show feedback alert for mood logger
function showMoodAlert(msg, type) {
  const alertDiv = document.getElementById("mood-alert");
  alertDiv.innerText = msg;
  alertDiv.className = `alert alert-${type} text-xs rounded-3 mb-3`;
  alertDiv.classList.remove("d-none");
  setTimeout(() => alertDiv.classList.add("d-none"), 4000);
}

// Load Dashboard Data
async function loadDashboardData() {
  try {
    const res = await fetch(`${API_WELLNESS}/dashboard`, {
      method: "GET",
      credentials: "include"
    });

    if (!res.ok) {
      throw new Error("Could not fetch wellness dashboard data.");
    }

    const data = await res.json();

    // 1. Update Wellness Score Indicator
    const scoreVal = data.wellnessScore !== undefined ? data.wellnessScore : 0;
    const progressCircle = document.getElementById("score-progress");
    progressCircle.innerText = `${scoreVal}%`;
    progressCircle.style.background = `radial-gradient(closest-side, white 79%, transparent 80% 100%),
                                       conic-gradient(var(--primary-color) ${scoreVal}%, #e2e8f0 ${scoreVal}% 100%)`;

    // 2. Update Streak
    const streakVal = data.streak !== undefined ? data.streak : 0;
    document.getElementById("streak-counter").innerText = `${streakVal} Day${streakVal !== 1 ? 's' : ''}`;

    // 3. Render Trend Chart
    const logs = data.moodLogs || [];
    renderTrendChart(logs);

  } catch (err) {
    console.error("Dashboard error:", err);
  }
}

// Render line chart with Chart.js
function renderTrendChart(moodLogs) {
  const ctx = document.getElementById("moodChart").getContext("2d");
  
  // Clean logs: reverse list to chronological order (oldest to newest)
  const sortedLogs = [...moodLogs].reverse();
  
  const labels = sortedLogs.map(l => {
    const d = new Date(l.loggedAt);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
  
  const dataset = sortedLogs.map(l => l.score);

  if (moodChartInstance) {
    moodChartInstance.destroy();
  }

  moodChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Mood Score (1-5)",
        data: dataset,
        borderColor: "#8EADC2",
        backgroundColor: "rgba(142, 173, 194, 0.15)",
        borderWidth: 3,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: "#8EADC2",
        pointBorderColor: "#FFFFFF",
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          min: 1,
          max: 5,
          ticks: { stepSize: 1 }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
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
