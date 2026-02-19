/**
 * Amelia's Gallery — Site Auth Helper
 * - Makes the hidden tower hotspot act as:
 *   - Login (when logged out) -> goes to /admin.html
 *   - Logout (when logged in) -> clears token + returns to home
 *
 * Put this file in the ROOT (same folder as index.html).
 */
(function () {
  const TOKEN_KEY = "amelias_admin_token";
  const LOGIN_URL = "./admin.html";
  const HOME_URL = "./index.html";

  function isLoggedIn() {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = HOME_URL; // hard redirect
  }

  function wireTower() {
    const tower = document.querySelector(".tower-login");
    if (!tower) return;

    // Always ensure it has a valid href (some browsers treat <a> without href oddly)
    tower.setAttribute("href", LOGIN_URL);

    if (isLoggedIn()) {
      tower.setAttribute("aria-label", "Logout");
      tower.setAttribute("title", "Logout");

      tower.addEventListener("click", (e) => {
        e.preventDefault();
        logout();
      });
    } else {
      tower.setAttribute("aria-label", "Admin Login");
      tower.setAttribute("title", "Admin Login");
      // default click = go to admin.html (no handler needed)
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireTower);
  } else {
    wireTower();
  }
})();
