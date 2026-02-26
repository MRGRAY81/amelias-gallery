(function () {
  const TOKEN_KEY = "amelias_admin_token";

  const API_BASE =
    (window.AMELIAS_CONFIG && window.AMELIAS_CONFIG.API_BASE) || "";

  const els = {
    backendUrl: document.getElementById("backendUrl"),
    status: document.getElementById("status"),
    loginForm: document.getElementById("loginForm"),
    email: document.getElementById("email"),
    password: document.getElementById("password"),
    loginBtn: document.getElementById("loginBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    portalBtn: document.getElementById("portalBtn"),
    out: document.getElementById("adminOutText"),
  };

  function setStatus(text, ok = true) {
    if (!els.status) return;
    els.status.textContent = text || "";
    els.status.classList.remove("ok", "bad");
    els.status.classList.add(ok ? "ok" : "bad");
  }

  function setBackendLabel() {
    if (els.backendUrl) els.backendUrl.textContent = API_BASE || "—";
  }

  function setToken(t) {
    if (!t) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, t);
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function showOut(obj) {
    if (!els.out) return;
    els.out.style.display = "block";
    els.out.textContent = JSON.stringify(obj, null, 2);
  }

  async function ping() {
    try {
      const r = await fetch(`${API_BASE}/api/health`);
      const j = await r.json();
      setStatus(j?.ok ? "Backend: online ✅" : "Backend: unknown", !!j?.ok);
      return !!j?.ok;
    } catch (e) {
      setStatus("Backend: offline / sleeping ❌", false);
      return false;
    }
  }

  function setLoggedInUI(isLoggedIn) {
    if (els.logoutBtn) els.logoutBtn.style.display = isLoggedIn ? "inline-flex" : "none";
    if (els.portalBtn) els.portalBtn.style.display = isLoggedIn ? "inline-flex" : "none";
  }

  async function whoami() {
    const token = getToken();
    if (!token) return false;

    try {
      const r = await fetch(`${API_BASE}/api/admin/whoami`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return false;
      const j = await r.json();
      showOut(j);
      return true;
    } catch {
      return false;
    }
  }

  async function login(email, password) {
    const r = await fetch(`${API_BASE}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.error || "Login failed");

    setToken(data.token);
    return data;
  }

  function logout() {
    setToken("");
    setLoggedInUI(false);
    showOut({ ok: true, message: "Logged out" });
    setStatus("Logged out.", true);
  }

  // Events
  if (els.logoutBtn) els.logoutBtn.addEventListener("click", logout);

  if (els.loginForm) {
    els.loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const ok = await ping();
      if (!ok) return;

      const email = (els.email?.value || "").trim();
      const password = els.password?.value || "";

      try {
        setStatus("Logging in…", true);
        const data = await login(email, password);
        showOut(data);
        setStatus("Logged in ✅", true);
        setLoggedInUI(true);
      } catch (err) {
        setLoggedInUI(false);
        setStatus(err?.message || "Login failed", false);
      }
    });
  }

  // Boot
  (async function boot() {
    setBackendLabel();
    await ping();
    const ok = await whoami();
    setLoggedInUI(ok);
    if (ok) setStatus("Already logged in ✅", true);
  })();
})();
