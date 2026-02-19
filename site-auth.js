/**
 * Amelia's Gallery — Site Auth Helper
 * - Makes the hidden tower hotspot act as:
 *   - Login (when logged out) -> goes to /admin.html
 *   - Logout (when logged in) -> clears token + returns to home
 *
 * Place this file in the project ROOT (same folder as index.html).
 */
(function () {
  const TOKEN_KEY = "amelias_admin_token";

  function isLoggedIn() {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);

    // Optional: also clear any other legacy keys if you ever used them
    // localStorage.removeItem("token");
    // localStorage.removeItem("admin_token");

    // Hard redirect so state is definitely refreshed
    window.location.href = "./index.html";
  }

  function wireTower() {
    const tower = document.querySelector(".tower-login");
    if (!tower) return;

    if (isLoggedIn()) {
      // Convert hotspot into "Logout"
      tower.setAttribute("aria-label", "Logout");
      tower.setAttribute("title", "Logout");

      // Prevent going to admin.html and instead log out
      tower.addEventListener("click", (e) => {
        e.preventDefault();
        logout();
      });
    } else {
      // Normal login behaviour
      tower.setAttribute("aria-label", "Admin Login");
      tower.setAttribute("title", "Admin Login");
      tower.setAttribute("href", "./admin.html");
    }
  }

  // Run after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireTower);
  } else {
    wireTower();
  }
})();
