/**
 * Amelia's Gallery — Local Admin Login (NO BACKEND)
 * Login -> sets token and redirects to admin-portal.html
 */

(function () {
  const TOKEN_KEY = "amelias_admin_token";

  // Simple family credentials (change these anytime)
  const ALLOWED = [
    { email: "amelia@demo.com", password: "gallery123" },
  ];

  const form = document.getElementById("loginForm");
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const statusEl = document.getElementById("loginStatus");

  function setStatus(msg, ok = true) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.classList.remove("ok", "bad");
    if (msg) statusEl.classList.add(ok ? "ok" : "bad");
  }

  function makeToken(email) {
    // lightweight token (not secure auth, just family gate)
    return btoa(JSON.stringify({ email, ts: Date.now() }));
  }

  function alreadyLoggedIn() {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  function goPortal() {
    window.location.href = "./admin-portal.html";
  }

  // If already logged in, go straight to portal
  if (alreadyLoggedIn()) {
    goPortal();
    return;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = (emailEl.value || "").trim().toLowerCase();
    const password = (passEl.value || "").trim();

    const ok = ALLOWED.some(
      (u) => u.email.toLowerCase() === email && u.password === password
    );

    if (!ok) {
      setStatus("Login failed ❌ (wrong email or password)", false);
      return;
    }

    localStorage.setItem(TOKEN_KEY, makeToken(email));
    setStatus("Logged in ✅ Redirecting…", true);
    goPortal();
  });
})();
