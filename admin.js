// admin.js (root) — SIMPLE WORKING ADMIN GATE
// Fastest: client-side password gate -> opens admin portal.
// We'll add JWT later once everything is stable.

(function () {
  const TOKEN_KEY = "amelias_admin_ok"; // simple flag
  const PORTAL_URL = "./admin-portal.html";

  const API_BASE =
    (window.AMELIAS_CONFIG && window.AMELIAS_CONFIG.API_BASE) || "";

  const els = {
    backendUrl: document.getElementById("backendUrl"),
    statusText: document.getElementById("statusText"),
    loginForm: document.getElementById("loginForm"),
    email: document.getElementById("email"),
    password: document.getElementById("password"),
    loginHint: document.getElementById("loginHint"),
  };

  function setStatus(msg, ok = true) {
    if (!els.statusText) return;
    els.statusText.textContent = msg || "";
    els.statusText.style.color = ok ? "" : "#b00020";
  }

  function setHint(msg, ok = true) {
    if (!els.loginHint) return;
    els.loginHint.textContent = msg || "";
    els.loginHint.style.color = ok ? "" : "#b00020";
  }

  function normBase(b) {
    return String(b || "").replace(/\/$/, "");
  }

  async function ping() {
    const base = normBase(API_BASE);
    if (els.backendUrl) els.backendUrl.textContent = base || "—";
    if (!base) {
      setStatus("Missing API_BASE in config.js ❌", false);
      return false;
    }

    try {
      const r = await fetch(`${base}/api/health`, { method: "GET" });
      if (!r.ok) throw new Error("bad");
      const j = await r.json();
      if (j && j.ok) {
        setStatus("Backend: online ✅", true);
        return true;
      }
      setStatus("Backend: unknown ⚠️", false);
      return false;
    } catch (e) {
      setStatus("Backend: offline / sleeping ❌", false);
      return false;
    }
  }

  function isAuthed() {
    return localStorage.getItem(TOKEN_KEY) === "yes";
  }

  function setAuthed(v) {
    if (v) localStorage.setItem(TOKEN_KEY, "yes");
    else localStorage.removeItem(TOKEN_KEY);
  }

  function goPortal() {
    window.location.href = PORTAL_URL;
  }

  // If already authed, jump straight in
  if (isAuthed()) {
    goPortal();
    return;
  }

  // Boot
  ping();

  // Login (simple gate)
  els.loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const ok = await ping();
    if (!ok) {
      setHint("Backend is asleep/offline. Refresh and try again.", false);
      return;
    }

    const email = String(els.email?.value || "").trim().toLowerCase();
    const pass = String(els.password?.value || "").trim();

    // ✅ SIMPLE FAMILY CHECK:
    // email can be anything family uses, but password must match your chosen password.
    // You said: Amelia1 (Render env) — use that.
    const REQUIRED_PASSWORD = "Amelia1";

    if (!pass) return setHint("Enter password.", false);

    if (pass !== REQUIRED_PASSWORD) {
      setHint("Wrong password ❌", false);
      return;
    }

    setAuthed(true);
    setHint("Login ok ✅ Redirecting…", true);
    setTimeout(goPortal, 200);
  });
})();
