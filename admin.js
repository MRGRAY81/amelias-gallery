/**
 * Amelia's Gallery — Admin wiring
 * - Auto-detects backend URL (health check)
 * - Logs in with email/password
 * - Stores token in localStorage
 * - Authenticated fetch helper
 * - Redirects to admin portal after login
 */
(function () {
  const PORTAL_PAGE = "./admin-portal.html";
  const TOKEN_KEY = "amelias_admin_token";

  // Prefer explicit config if provided
  const CONFIG_BASE =
    (window.AMELIAS_CONFIG && window.AMELIAS_CONFIG.API_BASE) || "";

  function buildCandidates() {
    const candidates = [];

    // Known services (keep as candidates)
    candidates.push("https://amelias-gallery-backend.onrender.com");
    candidates.push("https://amelias-gallery.onrender.com");

    // Derive from current render host
    try {
      const host = window.location.host; // e.g. amelias-gallery-1.onrender.com
      const proto = window.location.protocol; // https:
      if (host.endsWith(".onrender.com")) {
        candidates.push(`${proto}//${host}`);

        // remove "-1" / "-2"
        const cleaned = host.replace(/-\d+\.onrender\.com$/, ".onrender.com");
        candidates.push(`${proto}//${cleaned}`);

        // try "-backend"
        const maybeBackend = cleaned.replace(
          ".onrender.com",
          "-backend.onrender.com"
        );
        candidates.push(`${proto}//${maybeBackend}`);
      }
    } catch {}

    if (CONFIG_BASE) candidates.unshift(CONFIG_BASE);

    // de-dupe + trim trailing slash
    return Array.from(new Set(candidates.map((c) => String(c).replace(/\/$/, ""))));
  }

  let API_BASE = String(CONFIG_BASE || "").replace(/\/$/, "");

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

  function setLoggedInUI(isLoggedIn) {
    if (els.logoutBtn) els.logoutBtn.style.display = isLoggedIn ? "inline-flex" : "none";
    if (els.adminPanel) els.adminPanel.style.display = isLoggedIn ? "block" : "none";
  }

  function authedHeaders(extra = {}) {
    const token = getToken();
    const headers = { ...extra };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  }

  async function rawFetch(base, path, opts = {}) {
    const url = String(base).replace(/\/$/, "") + path;
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
      throw new Error("Failed to fetch (backend URL/CORS/backend sleeping).");
    }

    const ct = res.headers.get("content-type") || "";
    let data = null;
    try {
      data = ct.includes("application/json") ? await res.json() : await res.text();
    } catch {
      data = null;
    }

    if (!res.ok) {
      // Token invalid → clear session
      if (res.status === 401 || res.status === 403) {
        setToken("");
        setLoggedInUI(false);
      }
      const msg =
        (data && (data.message || data.error)) ||
        `Request failed: ${res.status} ${res.statusText}`;
      throw new Error(msg);
    }

    return data;
  }

  async function healthCheckOne(base) {
    try {
      const res = await rawFetch(base, "/health", { method: "GET" });
      if (!res.ok) return null;

      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : await res.text();
      return { base, data };
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
        API_BASE = String(hit.base).replace(/\/$/, "");
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

  async function validateTokenSilently() {
    const token = getToken();
    if (!token) return false;
    try {
      await apiFetch("/admin/commissions", { method: "GET" });
      return true;
    } catch {
      return false;
    }
  }

  async function login() {
    const email = (els.email?.value || "").trim();
    const password = els.password?.value || "";

    if (!email || !password) {
      setStatus("Enter email + password.", false);
      return;
    }

    // ✅ Ensure we have a working backend URL before trying login
    if (!API_BASE) {
      const ok = await detectBackend();
      if (!ok) return;
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
      setStatus("Logged in ✅ Redirecting…", true);
      setAdminOut({
        ok: true,
        message: "Logged in",
        apiBase: API_BASE,
        tokenPreview: token.slice(0, 18) + "…",
      });

      window.location.href = PORTAL_PAGE;
    } catch (e) {
      setToken("");
      setLoggedInUI(false);
      setStatus(`Login failed ❌ (${e.message})`, false);
      setAdminOut({ ok: false, error: e.message, apiBase: API_BASE || null });
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
      const data = await apiFetch("/admin/commissions", { method: "GET" });
      setAdminOut({
        ok: true,
        message: "Token valid ✅",
        apiBase: API_BASE,
        count: Array.isArray(data.items) ? data.items.length : undefined,
        preview: data.items?.slice(0, 1) || [],
      });
    } catch (e) {
      setAdminOut({ ok: false, error: e.message, apiBase: API_BASE || null });
    }
  }

  async function ping() {
    const ok = await detectBackend();
    if (ok) {
      try {
        const data = await apiFetch("/health", { method: "GET" });
        setAdminOut({ ok: true, apiBase: API_BASE, health: data });
      } catch (e) {
        setAdminOut({ ok: false, error: e.message, apiBase: API_BASE || null });
      }
    }
  }

  // Init bindings
  if (els.loginBtn) els.loginBtn.addEventListener("click", login);
  if (els.logoutBtn) els.logoutBtn.addEventListener("click", logout);
  if (els.pingBtn) els.pingBtn.addEventListener("click", ping);
  if (els.whoamiBtn) els.whoamiBtn.addEventListener("click", whoami);

  [els.email, els.password].filter(Boolean).forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") login();
    });
  });

  // Boot
  (async function boot() {
    if (els.backendUrl) els.backendUrl.textContent = API_BASE || "—";
    setLoggedInUI(!!getToken());

    // detect backend first
    await detectBackend();

    // if token exists, validate it
    if (getToken()) {
      const ok = await validateTokenSilently();
      if (ok) {
        setLoggedInUI(true);
        setStatus("Session active ✅ (token valid)", true);
      } else {
        setToken("");
        setLoggedInUI(false);
        setStatus("Session invalid. Please login again.", false);
      }
    }
  })();
})();
