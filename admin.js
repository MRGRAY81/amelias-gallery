(() => {
  const TOKEN_KEY = "amelias_admin_token";

  const API_BASE = (window.AMELIAS_CONFIG && window.AMELIAS_CONFIG.API_BASE) || "";
  const $ = (id) => document.getElementById(id);

  const backendUrl = $("backendUrl");
  const statusEl = $("status");
  const emailEl = $("email");
  const passEl = $("password");
  const loginBtn = $("loginBtn");
  const portalBtn = $("portalBtn");

  function setStatus(msg, ok = true) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.style.color = ok ? "#256d3b" : "#b42318";
  }

  function setToken(t) {
    if (!t) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, t);
  }

  async function ping() {
    try {
      const r = await fetch(`${API_BASE}/api/health`);
      if (!r.ok) throw new Error("bad");
      const j = await r.json();
      if (!j.ok) throw new Error("bad");
      setStatus("Backend: online ✅", true);
      return true;
    } catch {
      setStatus("Backend: offline / sleeping ❌", false);
      return false;
    }
  }

  async function login() {
    const email = (emailEl?.value || "").trim();
    const password = (passEl?.value || "").trim();

    if (!email || !password) {
      setStatus("Enter email + password.", false);
      return;
    }

    setStatus("Logging in…", true);

    try {
      const r = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await r.json().catch(() => null);
      if (!r.ok) throw new Error((data && data.error) || "Login failed");

      setToken(data.token);
      setStatus("Logged in ✅", true);

      if (portalBtn) portalBtn.style.display = "inline-flex";
      // auto-open portal
      window.location.href = "./admin-portal.html";
    } catch (e) {
      setStatus(e.message || "Login failed", false);
    }
  }

  // boot
  if (backendUrl) backendUrl.textContent = API_BASE || "—";
  ping();

  if (loginBtn) loginBtn.addEventListener("click", login);

  // enter key support
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") login();
  });
})();
