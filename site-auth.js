/**
 * Amelia's Gallery — Site Auth Helper
 * - Hidden tower hotspot acts as:
 *   - Login when logged out -> goes to /admin.html
 *   - Logout when logged in -> clears token + returns to home
 *
 * Put this file in ROOT (same folder as index.html).
 */
(function () {
  const TOKEN_KEY = "amelias_admin_token";

  function isLoggedIn() {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = "./index.html";
  }

  function wireTower() {
    const tower = document.querySelector(".tower-login");
    if (!tower) return;

    if (isLoggedIn()) {
      tower.setAttribute("aria-label", "Logout");
      tower.setAttribute("title", "Logout");

      // Keep href for accessibility, but override click
      tower.setAttribute("href", "./index.html");
      tower.onclick = (e) => {
        e.preventDefault();
        logout();
      };
    } else {
      tower.setAttribute("aria-label", "Admin Login");
      tower.setAttribute("title", "Admin Login");
      tower.setAttribute("href", "./admin.html");
      tower.onclick = null;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireTower);
  } else {
    wireTower();
  }

  // Expose a tiny hook so admin.js can refresh tower state after login
  window.AMELIAS_SITEAUTH_REFRESH = wireTower;
})();
