// frontend/js/auth.js
const API_BASE = "http://localhost:8080/api/auth";

/**
 * Handles user login request.
 */
async function handleLogin(email, password) {
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (res.status === 423) {
      const err = await res.json();
      throw new Error(err.error || "Account is locked. Please try again after 15 minutes.");
    }

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Invalid credentials.");
    }

    const data = await res.json();

    if (data.requiresApproval) {
      // Counselor verification pending, redirect to holding portal
      sessionStorage.setItem("pending_profile", JSON.stringify(data));
      window.location.href = "pending-approval.html";
      return;
    }

    // Save non-sensitive metadata for route configurations
    sessionStorage.setItem("profile", JSON.stringify(data));
    
    // Redirect based on user role
    redirectUserByRole(data.role);
  } catch (err) {
    throw err;
  }
}

/**
 * Handles student registration.
 */
async function handleRegister(email, password, subdomain, firstName, lastName) {
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        institutionSubdomain: subdomain,
        realFirstName: firstName,
        realLastName: lastName,
        role: "student"
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Registration failed. Verify domain permissions.");
    }

    const data = await res.json();
    sessionStorage.setItem("profile", JSON.stringify(data));
    
    // Redirect to onboarding questionnaire
    window.location.href = "onboarding.html";
  } catch (err) {
    throw err;
  }
}

/**
 * Handles user logout.
 */
async function handleLogout() {
  try {
    await fetch(`${API_BASE}/logout`, { method: "POST" });
  } catch (err) {
    // Continue cleanup even if server call fails
  }
  sessionStorage.clear();
  window.location.href = "login.html";
}

/**
 * Redirects user based on verified role claims.
 */
function redirectUserByRole(role) {
  if (role === "student") {
    window.location.href = "dashboard.html";
  } else if (role === "counselor") {
    window.location.href = "counselor.html";
  } else if (role === "inst_admin") {
    window.location.href = "admin.html";
  } else if (role === "super_admin") {
    window.location.href = "admin.html"; // Redirects superadmins to global overview portals
  } else {
    window.location.href = "login.html";
  }
}

/**
 * Guard utility enforcing active sessions on client views.
 */
function checkAuthGuard(requiredRole) {
  const profileStr = sessionStorage.getItem("profile");
  if (!profileStr) {
    window.location.href = "login.html";
    return null;
  }
  
  const profile = JSON.parse(profileStr);
  if (requiredRole && profile.role !== requiredRole) {
    window.location.href = "login.html";
    return null;
  }
  
  return profile;
}
