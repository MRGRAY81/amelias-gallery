/* site-auth.js
   Amelia’s Gallery — lightweight auth helper (frontend)
   - Uses localStorage token set by admin.js (amelias_admin_token)
   - Turns hidden tower login into Logout when signed in
   - Optionally hides admin-only links when logged out
*/

(function () {
  const TOKEN_KEY = "amelias_admin_token";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function isAuthed() {
    const t = getToken();
    return !!(t && String(t).trim().length > 10);
  }

  function setTowerToLogout(towerLink) {
    // Convert the hidden tower hotspot into a logout click target
    towerLink.setAttribute("href", "#logout");
    towerLink.setAttribute("aria-label", "Logout");

    towerLink.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem(TOKEN_KEY);

      // Friendly: bounce to home after logout
      window.location.href = "./index.html";
    });
  }

  function setTowerToLogin(towerLink) {
    towerLink.setAttribute("href", "./admin.html");
    towerLink.setAttribute("aria-label", "Admin Login");
  }

  function applyTowerToggle() {
    const towerLink = document.querySelector(".tower-login");
    if (!towerLink) return;

    if (isAuthed()) setTowerToLogout(towerLink);
    else setTowerToLogin(towerLink);
  }

  function protectAdminPages() {
    const page = document.body?.dataset?.page || "";

    // If user tries to access admin portal while logged out, bounce to admin login
    if ((page === "admin-portal" || page === "admin") && !isAuthed()) {
      // Allow admin.html itself (login page) even when logged out
      if (page === "admin-portal") {
        window.location.replace("./admin.html");
      }
    }
  }

  function hideAdminOnlyLinks() {
    // Optional: if you ever add visible admin links, hide them unless authed
    const authed = isAuthed();
    document.querySelectorAll("[data-admin-only]").forEach((el) => {
      el.style.display = authed ? "" : "none";
    });
  }

  // Run
  protectAdminPages();
  applyTowerToggle();
  hideAdminOnlyLinks();
})();
