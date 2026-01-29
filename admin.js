// Amelia's Gallery — Admin wiring (Step 1)
// - Checks backend health
// - Logs in with email/password
// - Stores token in localStorage
// - Provides helper for authenticated fetch

(function () {
  // ✅ Your Render backend URL
  const API_BASE = "https://amelias-gallery-backend.onrender.com";

  const els = {
    backendUrl: document.getElementById("backendUrl"),
    status: document.getElementById("status"),
    email: document.getElementById("email"),
    password: document.getElementById("password"),
    loginBtn: document.getElementById("loginBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    loginPanel: document.getElementById("loginPanel"),
    adminPanel: document.getElementById("adminPanel"),
    pingBtn: document.getElementById("pingBtn"),
    whoamiBtn: document.getElementById("whoamiBtn"),
    adminOutText: document.getElementById("adminOutText"),
  };

  const TOKEN_KEY = "amelias_admin_token";

  function setStatus(msg, ok = true) {
    if (!els.status) return;
    els.status.textContent = msg;
    els.status.className = "status " + (ok ? "good" : "bad");
  }

  function setAdminOut(obj) {
    if (!els.adminOutText) return;
    try {
      els.adminOutText.textContent = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
    } catch {
      els.adminOutText.textContent = String(obj);
    }
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function setToken(token) {
    if (!token) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, token);
  }

  function authedHeaders(extra = {}) {
    const token = getToken();
    const headers = { ...extra };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  }

  async function apiFetch(path, opts = {}) {
    const url = API_BASE.replace(/\/$/, "") + path;

    const res = await fetch(url, {
      ...opts,
      headers: authedHeaders(opts.headers || {}),
    });

    const ct = res.headers.get("content-type") || "";
    let data;
    try {
      data = ct.includes("application/json") ? await res.json() : await res.text();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const msg =
        (data && (data.message || data.error)) ||
        `Request failed: ${res.status} ${res.statusText}`;
      throw new Error(msg);
    }

    return data;
  }

  function setLoggedInUI(isLoggedIn) {
    if (els.logoutBtn) els.logoutBtn.style.display = isLoggedIn ? "inline-flex" : "none";
    if (els.adminPanel) els.adminPanel.style.display = isLoggedIn ? "block" : "none";
  }

  async function healthCheck() {
    try {
      const data = await apiFetch("/health", { method: "GET" });
      setStatus(`Backend OK ✅ (${API_BASE})`, true);
      return data;
    } catch (e) {
      setStatus(`Backend not reachable ❌ (${e.message})`, false);
      return null;
    }
  }

  async function login() {
    const email = (els.email?.value || "").trim();
    const password = els.password?.value || "";

    if (!email || !password) {
      setStatus("Enter email + password.", false);
      return;
    }

    setStatus("Logging in…", true);

    try {
      // ✅ BACKEND ROUTE (matches your backend code): POST /auth/login
      const data = await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const token = data && (data.token || data.jwt || data.accessToken);
      if (!token) throw new Error("No token returned from backend.");

      setToken(token);
      setLoggedInUI(true);
      setStatus("Logged in ✅ Token saved.", true);
      setAdminOut({ ok: true, message: "Logged in", tokenPreview: token.slice(0, 18) + "…" });
    } catch (e) {
      setToken("");
      setLoggedInUI(false);
      setStatus(`Login failed ❌ (${e.message})`, false);
      setAdminOut({ ok: false, error: e.message });
    }
  }

  async function logout() {
    setToken("");
    setLoggedInUI(false);
    setStatus("Logged out.", true);
    setAdminOut("Logged out.");
  }

  async function whoami() {
    try {
      // Your backend doesn't have /admin/me yet, so let's verify by calling a protected endpoint:
      // ✅ GET /admin/commissions (requires admin token)
      const data = await apiFetch("/admin/commissions", { method: "GET" });
      setAdminOut(data);
    } catch (e) {
      setAdminOut({ ok: false, error: e.message });
    }
  }

  async function ping() {
    const data = await healthCheck();
    if (data) setAdminOut(data);
  }

  // Init
  if (els.backendUrl) els.backendUrl.textContent = API_BASE;
  if (els.loginBtn) els.loginBtn.addEventListener("click", login);
  if (els.logoutBtn) els.logoutBtn.addEventListener("click", logout);
  if (els.pingBtn) els.pingBtn.addEventListener("click", ping);
  if (els.whoamiBtn) els.whoamiBtn.addEventListener("click", whoami);

  // Enter submits
  [els.email, els.password].filter(Boolean).forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") login();
    });
  });

  // If token exists, show admin panel
  setLoggedInUI(!!getToken());

  // Always do a health check on load
  healthCheck();
})();
