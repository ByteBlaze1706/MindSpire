// frontend/js/branding-injector.js
(function() {
  const API_BRANDING = "http://localhost:8080/api/auth/branding";

  // Resolve subdomain based on profile session or hostname
  let profile = null;
  try {
    profile = JSON.parse(sessionStorage.getItem("profile"));
  } catch (e) {}

  let subdomain = "columbia";
  if (profile && profile.subdomain) {
    subdomain = profile.subdomain;
  } else {
    const hostParts = window.location.hostname.split('.');
    if (hostParts.length > 2 && hostParts[0] !== 'www') {
      subdomain = hostParts[0];
    }
  }

  // Fetch branding config dynamically
  fetch(`${API_BRANDING}?subdomain=${subdomain}`, {
    method: "GET",
    credentials: "include"
  })
  .then(res => {
    if (!res.ok) throw new Error("Branding fetch failed");
    return res.json();
  })
  .then(config => {
    if (config) {
      // Inject CSS variables to override style.css defaults dynamically
      if (config.primaryColor) {
        document.documentElement.style.setProperty('--primary-color', config.primaryColor);
      }
      if (config.accentColor) {
        document.documentElement.style.setProperty('--accent-color', config.accentColor);
      }

      sessionStorage.setItem("branding", JSON.stringify(config));

      // Bind DOM updates
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => applyBrandingToDom(config));
      } else {
        applyBrandingToDom(config);
      }
    }
  })
  .catch(err => {
    console.error("Dynamic branding application error:", err);
  });

  function applyBrandingToDom(config) {
    // 1. Institution Logo
    const logoImg = document.getElementById("institution-logo");
    if (logoImg && config.logoUrl) {
      logoImg.src = config.logoUrl;
      logoImg.classList.remove("d-none");
      // Hide standard emoji if logo exists
      const logoEmoji = document.getElementById("institution-logo-emoji");
      if (logoEmoji) logoEmoji.classList.add("d-none");
    }

    // 2. Support Email Address
    const supportEmailLinks = document.querySelectorAll(".branding-support-email");
    supportEmailLinks.forEach(link => {
      if (config.supportEmail) {
        link.href = `mailto:${config.supportEmail}`;
        link.textContent = config.supportEmail;
      }
    });

    // 3. Emergency Contact Info
    const emergencyContactSpans = document.querySelectorAll(".branding-emergency-phone");
    emergencyContactSpans.forEach(span => {
      if (config.emergencyPhone) {
        span.textContent = config.emergencyPhone;
      }
    });
  }
})();
