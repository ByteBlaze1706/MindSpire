// frontend/js/assessments.js
const API_ASSESSMENT = "http://localhost:8080/api/assessment";
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

let phq9TypeId = null;
let gad7TypeId = null;

let activeTypeId = null;
let questionsCache = [];
let currentQuestionIndex = 0;
let answersMap = {}; // Maps question ID to selected score value (0-3)

document.addEventListener("DOMContentLoaded", () => {
  if (profile) {
    loadAssessmentTypes();
    loadHistory();
  }

  document.getElementById("start-phq9-btn").addEventListener("click", () => startScreening(phq9TypeId));
  document.getElementById("start-gad7-btn").addEventListener("click", () => startScreening(gad7TypeId));
});

// Load assessment scale type UUID mappings
async function loadAssessmentTypes() {
  try {
    const res = await fetch(`${API_ASSESSMENT}/list`, {
      method: "GET",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Could not load scales.");
    const data = await res.json();
    
    data.forEach(type => {
      const name = type.name.toUpperCase();
      if (name.includes("PHQ-9") || name.includes("PHQ9")) {
        phq9TypeId = type.id;
      } else if (name.includes("GAD-7") || name.includes("GAD7")) {
        gad7TypeId = type.id;
      }
    });
  } catch (err) {
    console.error("Scale loading error:", err);
  }
}

// Load Screening score history logs
async function loadHistory() {
  const loading = document.getElementById("history-loading");
  const empty = document.getElementById("history-empty");
  const container = document.getElementById("history-table-container");
  const body = document.getElementById("history-table-body");

  loading.classList.remove("d-none");
  empty.classList.add("d-none");
  container.classList.add("d-none");
  body.innerHTML = "";

  try {
    const res = await fetch(`${API_ASSESSMENT}/history`, {
      method: "GET",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Could not load score history.");
    const data = await res.json();

    loading.classList.add("d-none");
    if (data.length === 0) {
      empty.classList.remove("d-none");
      return;
    }

    data.forEach(result => {
      const tr = document.createElement("tr");
      const date = new Date(result.completedAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      const severity = result.severityLevel || "Minimal";
      let badgeClass = "severity-minimal";
      if (severity.toLowerCase().includes("mild")) badgeClass = "severity-mild";
      else if (severity.toLowerCase().includes("moderately severe") || severity.toLowerCase().includes("moderate")) badgeClass = "severity-moderate";
      else if (severity.toLowerCase().includes("severe")) badgeClass = "severity-severe";

      tr.innerHTML = `
        <td class="font-semibold">${result.assessmentType.name}</td>
        <td>${date}</td>
        <td class="font-bold">${result.totalScore}</td>
        <td><span class="badge-severity ${badgeClass}">${severity}</span></td>
      `;
      body.appendChild(tr);
    });

    container.classList.remove("d-none");
  } catch (err) {
    loading.classList.add("d-none");
    empty.innerText = `Error loading history: ${err.message}`;
    empty.classList.remove("d-none");
  }
}

// Start active assessment wizard
async function startScreening(typeId) {
  if (!typeId) {
    alert("This scale is not seeded or active in database. Check seed.sql");
    return;
  }

  activeTypeId = typeId;
  currentQuestionIndex = 0;
  answersMap = {};

  const selectionsRow = document.getElementById("selections-row");
  const wizardSection = document.getElementById("wizard-section");
  const historySection = document.getElementById("history-section");

  // Show loading indicator in wizard
  document.getElementById("active-question-text").innerText = "Loading scale questions...";
  document.getElementById("question-options-container").innerHTML = "";

  selectionsRow.classList.add("d-none");
  historySection.classList.add("d-none");
  wizardSection.classList.remove("d-none");

  try {
    const res = await fetch(`${API_ASSESSMENT}/questions/${typeId}`, {
      method: "GET",
      credentials: "include"
    });
    if (!res.ok) throw new Error("Could not load questions.");
    const questions = await res.json();
    
    questionsCache = questions;

    if (questions.length === 0) {
      alert("No questions found for this scale.");
      cancelAssessment();
      return;
    }

    // Load active title
    const activeTestName = typeId === phq9TypeId ? "PHQ-9 Depression Severity Screen" : "GAD-7 Generalized Anxiety Screen";
    const activeTestDesc = typeId === phq9TypeId ? "Over the last 2 weeks, how often have you been bothered by any of the following problems?" : "Over the last 2 weeks, how often have you been bothered by the following problems?";
    document.getElementById("wizard-test-title").innerText = activeTestName;
    document.getElementById("wizard-test-desc").innerText = activeTestDesc;

    loadQuestion(0);
  } catch (err) {
    alert("Connection error: " + err.message);
    cancelAssessment();
  }
}

// Load Question at index
function loadQuestion(index) {
  currentQuestionIndex = index;
  const q = questionsCache[index];

  // Update Stepper indicators
  const total = questionsCache.length;
  const currentNum = index + 1;
  const pct = Math.round((currentNum / total) * 100);

  document.getElementById("wizard-progress-text").innerText = `Question ${currentNum} of ${total}`;
  document.getElementById("wizard-percentage").innerText = `${pct}% Complete`;
  document.getElementById("wizard-progress-bar").style.width = `${pct}%`;
  document.getElementById("wizard-progress-bar").ariaValueNow = pct;

  // Set text
  document.getElementById("active-question-text").innerText = `${currentNum}. ${q.questionText}`;

  // Render option cards
  let options = [];
  try {
    options = JSON.parse(q.options);
  } catch (e) {
    options = [
      { label: "Not at all", value: 0 },
      { label: "Several days", value: 1 },
      { label: "More than half the days", value: 2 },
      { label: "Nearly every day", value: 3 }
    ];
  }

  const container = document.getElementById("question-options-container");
  container.innerHTML = "";

  options.forEach(opt => {
    const card = document.createElement("div");
    card.className = "option-card";
    if (answersMap[q.id] === opt.value) {
      card.classList.add("selected");
    }
    card.innerText = opt.label;
    card.onclick = () => selectOption(q.id, opt.value, card);
    container.appendChild(card);
  });

  // Enable/Disable buttons
  document.getElementById("prev-btn").disabled = index === 0;
  
  if (index === total - 1) {
    document.getElementById("next-btn").innerText = "Submit Screening";
  } else {
    document.getElementById("next-btn").innerText = "Next →";
  }

  // Handle PHQ-9 self-harm warning on Question 9
  const isPhq9 = activeTypeId === phq9TypeId;
  const isQuestion9 = q.displayOrder === 9;
  const crisisWarning = document.getElementById("crisis-warning");

  if (isPhq9 && isQuestion9 && answersMap[q.id] > 0) {
    crisisWarning.classList.remove("d-none");
  } else {
    crisisWarning.classList.add("d-none");
  }
}

// Select option value
function selectOption(questionId, val, cardElement) {
  answersMap[questionId] = val;
  document.querySelectorAll(".option-card").forEach(el => el.classList.remove("selected"));
  cardElement.classList.add("selected");

  // Re-eval self-harm warning instantly if active
  const q = questionsCache[currentQuestionIndex];
  const isPhq9 = activeTypeId === phq9TypeId;
  const isQuestion9 = q.displayOrder === 9;
  const crisisWarning = document.getElementById("crisis-warning");

  if (isPhq9 && isQuestion9 && val > 0) {
    crisisWarning.classList.remove("d-none");
  } else {
    crisisWarning.classList.add("d-none");
  }
}

// Next question or submit
async function nextQuestion() {
  const q = questionsCache[currentQuestionIndex];
  if (answersMap[q.id] === undefined) {
    alert("Please select an option before continuing.");
    return;
  }

  if (currentQuestionIndex < questionsCache.length - 1) {
    loadQuestion(currentQuestionIndex + 1);
  } else {
    await submitAssessmentAnswers();
  }
}

// Previous question
function prevQuestion() {
  if (currentQuestionIndex > 0) {
    loadQuestion(currentQuestionIndex - 1);
  }
}

// Submit Answers
async function submitAssessmentAnswers() {
  const btn = document.getElementById("next-btn");
  btn.disabled = true;
  btn.innerText = "Submitting answers...";

  try {
    const res = await fetch(`${API_ASSESSMENT}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        typeId: activeTypeId,
        answers: answersMap
      }),
      credentials: "include"
    });

    if (!res.ok) {
      throw new Error("Answers submission failed.");
    }

    const result = await res.json();
    alert(`Screening successfully recorded! Score: ${result.totalScore} (${result.severityLevel})`);
    cancelAssessment();
  } catch (err) {
    alert("Failed: " + err.message);
    btn.disabled = false;
    btn.innerText = "Submit Screening";
  }
}

// Cancel screening / go back
function cancelAssessment() {
  activeTypeId = null;
  questionsCache = [];
  currentQuestionIndex = 0;
  answersMap = {};

  document.getElementById("wizard-section").classList.add("d-none");
  document.getElementById("selections-row").classList.remove("d-none");
  document.getElementById("history-section").classList.remove("d-none");
  
  loadHistory();
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
