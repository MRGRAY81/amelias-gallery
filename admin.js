/**
 * Amelia's Gallery — Admin wiring
 * - Auto-detects backend URL (health check)
 * - Logs in with email/password
 * - Stores token in localStorage
 * - Provides helper for authenticated fetch
 * - Redirects to admin portal page after login
 */
(function () {
  // ✅ Change this if you name your dashboard differently
  const PORTAL_PAGE = "./admin-portal.html";

  // 1) Prefer explicit config if provided (best for your own server later)
  const CONFIG_BASE =
    (window.AMELIAS_CONFIG && window.AMELIAS_CONFIG.API_BASE) || "";

  // 2) Fallback guesses (Render names + derived from current host)
  function buildCandidates() {
    const candidates = [];

    // Previous defaults (keep as candidates)
    candidates.push("https://amelias-gallery-backend.onrender.com");
    candidates.push("https://amelias-gallery.onrender.com");

    // If we're on a Render static site like: https://amelias-gallery-1.onrender.com
    // then try removing "-1"
    try {
      const host = window.location.host; // e.g. amelias-gallery-1.onrender.com
      const proto = window.location.protocol; // https:
      if (host.endsWith(".onrender.com")) {
        const base = `${proto}//${host}`;
        candidates.push(base);

        // remove "-1" / "-2" suffix patterns
        const cleaned = host.replace(/-\d+\.onrender\.com$/, ".onrender.com");
        candidates.push(`${proto}//${cleaned}`);

        // sometimes people name backend "-backend"
        const maybeBackend = cleaned.replace(
          ".onrender.com",
          "-backend.onrender.com"
        );
        candidates.push(`${proto}//${maybeBackend}`);
      }
    } catch {}

    // If CONFIG_BASE is set, prefer it first
    if (CONFIG_BASE) candidates.unshift(CONFIG_BASE);

    // de-dupe + trim trailing slash
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

  function clearTokenAndUI(message) {
    setToken("");
    setLoggedInUI(false);
    if (message) setStatus(message, false);
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
    } catch (err) {
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
      // If token is wrong/expired, clean up
      if (res.status === 401 || res.status === 403) {
        clearTokenAndUI("Session expired / invalid token. Please login again.");
      }

      const msg =
        (data && (data.message || data.error)) ||
        `Request failed: ${res.status} ${res.statusText}`;
      throw new Error(msg);
    }
    return data;
  }

  function setLoggedInUI(isLoggedIn) {
    if (els.logoutBtn)
      els.logoutBtn.style.display = isLoggedIn ? "inline-flex" : "none";
    if (els.adminPanel)
      els.adminPanel.style.display = isLoggedIn ? "block" : "none";

    // Add portal + clear token buttons once (inside adminPanel)
    ensureExtraButtons(isLoggedIn);
  }

  function ensureExtraButtons(isLoggedIn) {
    if (!els.adminPanel) return;

    // create container once
    let row = document.getElementById("portalRow");
    if (!row) {
      row = document.createElement("div");
      row.id = "portalRow";
      row.className = "row-actions";
      row.style.marginTop = "10px";
      els.adminPanel.prepend(row);
    }

    // Portal button
    let portalBtn = document.getElementById("goPortalBtn");
    if (!portalBtn) {
      portalBtn = document.createElement("button");
      portalBtn.id = "goPortalBtn";
      portalBtn.type = "button";
      portalBtn.className = "btn primary";
      portalBtn.textContent = "Go to Admin Portal";
      portalBtn.addEventListener("click", () => {
        window.location.href = PORTAL_PAGE;
      });
      row.appendChild(portalBtn);
    }

    // Clear token button
    let clearBtn = document.getElementById("clearTokenBtn");
    if (!clearBtn) {
      clearBtn = document.createElement("button");
      clearBtn.id = "clearTokenBtn";
      clearBtn.type = "button";
      clearBtn.className = "btn ghost";
      clearBtn.textContent = "Clear Token";
      clearBtn.style.marginLeft = "8px";
      clearBtn.addEventListener("click", () => {
        clearTokenAndUI("Token cleared. Please login again.");
        setAdminOut("Token cleared.");
      });
      row.appendChild(clearBtn);
    }

    portalBtn.style.display = isLoggedIn ? "inline-flex" : "none";
    clearBtn.style.display = isLoggedIn ? "inline-flex" : "none";
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
        API_BASE = hit.base;
        if (els.backendUrl) els.backendUrl.textContent = API_BASE;
        setStatus(`Backend OK ✅ (${API_BASE})`, true);
        return hit.data;
      }
    }

    if (els.backendUrl) els.backendUrl.textContent = CONFIG_BASE || "—";
    setStatus(
      "Backend not reachable ❌ (URL/CORS/sleeping). Check Render backend URL + FRONTEND_ORIGIN.",
      false
    );
    return null;
  }

  async function validateTokenSilently() {
    const token = getToken();
    if (!token) return false;

    try {
      // any protected endpoint works
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
      setStatus("Logged in ✅ Token saved. Redirecting…", true);
      setAdminOut({
        ok: true,
        message: "Logged in",
        tokenPreview: token.slice(0, 18) + "…",
      });

      // ✅ Go to dashboard/portal
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
        preview: data.items?.slice(0, 1) || [],
        count: Array.isArray(data.items) ? data.items.length : undefined,
        apiBase: API_BASE || null,
      });
    } catch (e) {
      setAdminOut({ ok: false, error: e.message, apiBase: API_BASE || null });
    }
  }

  async function ping() {
    const data = await detectBackend();
    if (data) setAdminOut(data);
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

  (async function boot() {
    setLoggedInUI(!!getToken());
    await detectBackend();

    // If already logged in, verify token and show portal button
    if (getToken()) {
      const ok = await validateTokenSilently();
      if (ok) {
        setStatus("Session active ✅ (token valid)", true);
        setLoggedInUI(true);
      } else {
        clearTokenAndUI("Session invalid. Please login again.");
      }
    }
  })();
})();
