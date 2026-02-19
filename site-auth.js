/**
 * Amelia's Gallery — Site Auth Helper (FULL SWAP)
 * - Tower hotspot (.tower-login) acts as Login/Logout
 * - Visible header button (.login-btn) also acts as Login/Logout
 * - When logged in: both become "Logout" and clear token
 * - When logged out: both go to admin.html
 *
 * Put this file in ROOT (same folder as index.html).
 */
(function () {
  const TOKEN_KEY = "amelias_admin_token";
  const LOGIN_HREF = "./admin.html";
  const HOME_HREF = "./index.html";

  function isLoggedIn() {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = HOME_HREF;
  }

  function wireAuthTargets() {
    const loggedIn = isLoggedIn();

    // Tower hotspot
    const tower = document.querySelector(".tower-login");
    // Visible login button (optional)
    const loginBtn = document.querySelector(".login-btn");

    // Helper to apply state to any link-like element
    function apply(el) {
      if (!el) return;

      if (loggedIn) {
        el.setAttribute("aria-label", "Logout");
        el.setAttribute("title", "Logout");

        // If it's the visible button, show "Logout"
        if (el.classList.contains("login-btn")) el.textContent = "Logout";

        // Keep href for accessibility, but override click to logout
        el.setAttribute("href", HOME_HREF);
        el.onclick = (e) => {
          e.preventDefault();
          logout();
        };
      } else {
        el.setAttribute("aria-label", "Admin Login");
        el.setAttribute("title", "Admin Login");

        // If it's the visible button, show "Login"
        if (el.classList.contains("login-btn")) el.textContent = "Login";

        el.setAttribute("href", LOGIN_HREF);
        el.onclick = null; // normal link behaviour
      }
    }

    apply(tower);
    apply(loginBtn);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireAuthTargets);
  } else {
    wireAuthTargets();
  }

  // Header loader calls this after injecting header.html
  window.AMELIAS_SITEAUTH_REFRESH = wireAuthTargets;
  })();
