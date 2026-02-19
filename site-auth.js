// Amelia’s Gallery — site auth helper
// Makes the hidden tower button log OUT when a token exists.

(function () {
  const tokenKey = "amelias_admin_token";
  const tower = document.querySelector(".tower-login");
  if (!tower) return;

  const token = localStorage.getItem(tokenKey);

  if (token) {
    // Become a hidden logout button
    tower.setAttribute("href", "#logout");
    tower.setAttribute("aria-label", "Logout (Admin)");
    tower.setAttribute("title", "Logout");

    tower.addEventListener("click", (e) => {
      e.preventDefault();
      try {
        localStorage.removeItem(tokenKey);
        // if you store anything else later, remove it here too
        // localStorage.removeItem("amelias_admin_user");
      } catch (_) {}

      // send them home after logout
      window.location.href = "./index.html";
    });
  } else {
    // Normal hidden login link
    tower.setAttribute("href", "./admin.html");
    tower.setAttribute("aria-label", "Admin Login");
    tower.setAttribute("title", "Admin Login");
  }
})();
