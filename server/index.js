/**
 * Amelia's Gallery — Admin wiring (Login page)
 * - Detects backend URL (health check)
 * - Logs in with email/password
 * - Stores token in localStorage
 * - Redirects to admin-portal.html on success
 */
(function () {
  const CONFIG_BASE =
    (window.AMELIAS_CONFIG && window.AMELIAS_CONFIG.API_BASE) || "";

  function buildCandidates() {
    const candidates = [];

    // common defaults
    candidates.push("https://amelias-gallery-backend.onrender.com");
    candidates.push("https://amelias-gallery.onrender.com");

    // derive from current Render host
    try {
      const host = window.location.host;
      const proto = window.location.protocol;
      if (host.endsWith(".onrender.com")) {
        const base = `${proto}//${host}`;
        candidates.push(base);

        const cleaned = host.replace(/-\d+\.onrender\.com$/, ".onrender.com");
        candidates.push(`${proto}//${cleaned}`);

        const maybeBackend = cleaned.replace(".onrender.com", "-backend.onrender.com");
        candidates.push(`${proto}//${maybeBackend}`);
      }
    } catch {}

    if (CONFIG_BASE) candidates.unshift(CONFIG_BASE);
    return Array.from(new Set(candidates.map((c) => c.replace(/\/$/, ""))));
  }

  let API_BASE = (CONFIG_BASE || "").replace(/\/$/, "");

  const els = {
    backendUrl: document.getElementById("backendUrl"),
    status: document.getElementById("status"),
    email: document.getElementById("email"),
    password: document.getElementById("password"),
    loginBtn: document.getElementById("loginBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
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
      els.adminOutText.textContent =
        typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
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

  async function rawFetch(base, path, opts = {}) {
    const url = base.replace(/\/$/, "") + path;
    return fetch(url, opts);
  }

  async function apiFetch(path, opts = {}) {
    if (!API_BASE) throw new Error("Backend URL not set.");
    const url = API_BASE.replace(/\/$/, "") + path;

    let res;
    try {
      res = await fetch(url, {
        ...opts,
        headers: authedHeaders(opts.headers || {}),
      });
    } catch {
      throw new Error(
        "Failed to fetch (check backend URL, CORS FRONTEND_ORIGIN, or backend sleeping)."
      );
    }

    const ct = res.headers.get("content-type") || "";
    let data = null;
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

  async function healthCheckOne(base) {
    try {
      const res = await rawFetch(base, "/health", { method: "GET" });
      if (!res.ok) return null;
      return { base };
    } catch {
      return null;
    }
  }

  async function detectBackend() {
    const candidates = buildCandidates();
    setStatus("Checking backend…", true);

    for (const base of candidates) {
      const hit = await healthCheckOne(base);
      if (hit) {
        API_BASE = hit.base;
        if (els.backendUrl) els.backendUrl.textContent = API_BASE;
        setStatus(`Backend OK ✅ (${API_BASE})`, true);
        return true;
      }
    }

    if (els.backendUrl) els.backendUrl.textContent = CONFIG_BASE || "—";
    setStatus(
      "Backend not reachable ❌ (URL/CORS/sleeping). Check Render backend URL + FRONTEND_ORIGIN.",
      false
    );
    return false;
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

      // ✅ go to portal
      window.location.href = "./admin-portal.html";
    } catch (e) {
      setToken("");
      setLoggedInUI(false);
      setStatus(`Login failed ❌ (${e.message})`, false);
      setAdminOut({ ok: false, error: e.message, apiBase: API_BASE || null });
    }
  }

  function logout() {
    setToken("");
    setLoggedInUI(false);
    setStatus("Logged out.", true);
    setAdminOut("Logged out.");
  }

  async function whoami() {
    try {
      const data = await apiFetch("/admin/commissions", { method: "GET" });
      setAdminOut({
        ok: true,
        message: "Token valid ✅",
        preview: data.items?.slice(0, 1) || [],
        count: Array.isArray(data.items) ? data.items.length : undefined,
      });
    } catch (e) {
      setAdminOut({ ok: false, error: e.message, apiBase: API_BASE || null });
    }
  }

  async function ping() {
    const ok = await detectBackend();
    if (ok) setAdminOut({ ok: true, apiBase: API_BASE });
  }

  // Init
  if (els.backendUrl) els.backendUrl.textContent = API_BASE || "—";

  if (els.loginBtn) els.loginBtn.addEventListener("click", login);
  if (els.logoutBtn) els.logoutBtn.addEventListener("click", logout);
  if (els.pingBtn) els.pingBtn.addEventListener("click", ping);
  if (els.whoamiBtn) els.whoamiBtn.addEventListener("click", whoami);

  [els.email, els.password].filter(Boolean).forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") login();
    });
  });

  setLoggedInUI(!!getToken());
  detectBackend();
})();
