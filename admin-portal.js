/**
 * Amelia's Gallery — Admin Portal
 * - Detect backend (health check)
 * - Load commissions + enquiries (admin)
 * - Unified inbox list + details pane
 * - Filter by status + search
 * - Save status + notes via PATCH endpoints
 */

(function () {
  const TOKEN_KEY = "amelias_admin_token";
  const LOGIN_PAGE = "./admin.html";

  // Prefer config.js if present
  const CONFIG_BASE =
    (window.AMELIAS_CONFIG && window.AMELIAS_CONFIG.API_BASE) || "";

  // ---------- DOM ----------
  const els = {
    backendUrl: document.getElementById("backendUrl"),
    dot: document.getElementById("dot"),
    statusText: document.getElementById("statusText"),

    refreshBtn: document.getElementById("refreshBtn"),
    logoutBtn: document.getElementById("logoutBtn"),

    tabs: Array.from(document.querySelectorAll(".tab")),
    searchInput: document.getElementById("searchInput"),

    countText: document.getElementById("countText"),
    list: document.getElementById("list"),

    detail: document.getElementById("detail"),
    detailHint: document.getElementById("detailHint"),

    typeTag: document.getElementById("typeTag"),
    createdAt: document.getElementById("createdAt"),
    statusSelect: document.getElementById("statusSelect"),

    nameText: document.getElementById("nameText"),
    emailText: document.getElementById("emailText"),
    messageText: document.getElementById("messageText"),

    refsBlock: document.getElementById("refsBlock"),
    refs: document.getElementById("refs"),

    notesInput: document.getElementById("notesInput"),
    saveBtn: document.getElementById("saveBtn"),
    saveStatus: document.getElementById("saveStatus"),

    debugOut: document.getElementById("debugOut"),
  };

  // ---------- State ----------
  let API_BASE = String(CONFIG_BASE || "").replace(/\/$/, "");
  let items = []; // unified inbox: [{type, id, status, notes, createdAt, name, email, message/brief, refs[], raw}]
  let activeId = null;
  let activeFilter = "all";
  let searchTerm = "";

  // ---------- Helpers ----------
  function setStatus(text, ok) {
    if (els.statusText) els.statusText.textContent = text || "";
    if (els.dot) {
      els.dot.className = "dot " + (ok ? "good" : "bad");
    }
  }

  function setBackendLabel() {
    if (els.backendUrl) els.backendUrl.textContent = API_BASE || "—";
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

  function normBase(base) {
    return String(base || "").replace(/\/$/, "");
  }

  function buildCandidates() {
    const candidates = [];

    candidates.push("https://amelias-gallery-backend.onrender.com");
    candidates.push("https://amelias-gallery.onrender.com");

    try {
      const host = window.location.host; // amelias-gallery-1.onrender.com etc
      const proto = window.location.protocol;
      if (host.endsWith(".onrender.com")) {
        candidates.push(`${proto}//${host}`);

        const cleaned = host.replace(/-\d+\.onrender\.com$/, ".onrender.com");
        candidates.push(`${proto}//${cleaned}`);

        const maybeBackend = cleaned.replace(".onrender.com", "-backend.onrender.com");
        candidates.push(`${proto}//${maybeBackend}`);
      }
    } catch {}

    if (CONFIG_BASE) candidates.unshift(CONFIG_BASE);

    return Array.from(new Set(candidates.map(normBase))).filter(Boolean);
  }

  async function rawFetch(base, path, opts = {}) {
    const url = normBase(base) + path;
    return fetch(url, opts);
  }

  async function healthCheckOne(base) {
    try {
      const res = await rawFetch(base, "/health", { method: "GET" });
      if (!res.ok) return null;
      return { base: normBase(base) };
    } catch {
      return null;
    }
  }

  async function detectBackend() {
    setStatus("Checking backend…", true);

    // If config provided, test it first
    const candidates = buildCandidates();

    for (const base of candidates) {
      const hit = await healthCheckOne(base);
      if (hit) {
        API_BASE = hit.base;
        setBackendLabel();
        setStatus("Connected ✅", true);
        return true;
      }
    }

    setBackendLabel();
    setStatus("Backend not reachable ❌", false);
    return false;
  }

  async function apiFetch(path, opts = {}) {
    if (!API_BASE) throw new Error("Backend URL not set.");
    const url = normBase(API_BASE) + path;

    let res;
    try {
      res = await fetch(url, {
        ...opts,
        headers: authedHeaders(opts.headers || {}),
      });
    } catch {
      throw new Error("Failed to fetch (URL/CORS/backend sleeping).");
    }

    const ct = res.headers.get("content-type") || "";
    let data = null;
    try {
      data = ct.includes("application/json") ? await res.json() : await res.text();
    } catch {
      data = null;
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        // token invalid
        setToken("");
        throw new Error("Unauthorized (token invalid). Please login again.");
      }
      const msg =
        (data && (data.message || data.error)) ||
        `Request failed: ${res.status} ${res.statusText}`;
      throw new Error(msg);
    }

    return data;
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  }

  function safeLower(s) {
    return String(s || "").toLowerCase();
  }

  function unifyCommission(c) {
    return {
      type: "commission",
      id: c.id,
      status: c.status || "new",
      notes: c.notes || "",
      createdAt: c.createdAt || c.created_at || "",
      name: c.name || "",
      email: c.email || "",
      text: c.brief || "",
      refs: Array.isArray(c.refs) ? c.refs : [],
      raw: c,
    };
  }

  function unifyEnquiry(e) {
    return {
      type: "enquiry",
      id: e.id,
      status: e.status || "new",
      notes: e.notes || "",
      createdAt: e.createdAt || e.created_at || "",
      name: e.name || "",
      email: e.email || "",
      text: e.message || "",
      refs: [],
      raw: e,
    };
  }

  function currentFiltered() {
    const filtered = items.filter((x) => {
      const matchesStatus = activeFilter === "all" ? true : x.status === activeFilter;

      const q = safeLower(searchTerm).trim();
      const matchesSearch =
        !q ||
        safeLower(x.name).includes(q) ||
        safeLower(x.email).includes(q) ||
        safeLower(x.text).includes(q) ||
        safeLower(x.type).includes(q) ||
        safeLower(x.status).includes(q);

      return matchesStatus && matchesSearch;
    });

    // newest first
    filtered.sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return tb - ta;
    });

    return filtered;
  }

  function setCount(n) {
    if (!els.countText) return;
    els.countText.textContent = `${n} item${n === 1 ? "" : "s"}`;
  }

  function renderList() {
    if (!els.list) return;
    const data = currentFiltered();
    setCount(data.length);

    els.list.innerHTML = "";

    if (data.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Nothing here yet.";
      els.list.appendChild(empty);
      return;
    }

    data.forEach((x) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className =
        "list-item " +
        (x.id === activeId ? "active " : "") +
        (x.type === "commission" ? "type-commission " : "type-enquiry ") +
        "status-" +
        x.status;

      const title = x.name || "(no name)";
      const sub = x.email || "";
      const snippet = (x.text || "").trim().slice(0, 110);

      row.innerHTML = `
        <div class="li-top">
          <div class="li-title">${escapeHtml(title)}</div>
          <div class="badge ${escapeHtml(x.type)}">${x.type === "commission" ? "Commission" : "Enquiry"}</div>
        </div>
        <div class="li-sub mono">${escapeHtml(sub)}</div>
        <div class="li-snippet">${escapeHtml(snippet || "—")}</div>
        <div class="li-meta">
          <span class="pill ${escapeHtml(x.status)}">${escapeHtml(x.status)}</span>
          <span class="muted small">${escapeHtml(fmtDate(x.createdAt))}</span>
        </div>
      `;

      row.addEventListener("click", () => {
        activeId = x.id;
        renderList();
        renderDetail(x.id);
      });

      els.list.appendChild(row);
    });
  }

  function renderDetail(id) {
    const x = items.find((i) => i.id === id);
    if (!x) {
      if (els.detail) els.detail.style.display = "none";
      if (els.detailHint) els.detailHint.textContent = "Select an item on the left.";
      return;
    }

    if (els.detailHint) els.detailHint.textContent = "";

    if (els.detail) els.detail.style.display = "block";
    if (els.typeTag) {
      els.typeTag.textContent = x.type.toUpperCase();
      els.typeTag.className =
        "tag " + (x.type === "commission" ? "tag-commission" : "tag-enquiry");
    }
    if (els.createdAt) els.createdAt.textContent = fmtDate(x.createdAt);

    if (els.statusSelect) els.statusSelect.value = x.status || "new";

    if (els.nameText) els.nameText.textContent = x.name || "—";
    if (els.emailText) els.emailText.textContent = x.email || "—";
    if (els.messageText) els.messageText.textContent = x.text || "—";

    if (els.notesInput) els.notesInput.value = x.notes || "";

    // refs
    if (els.refsBlock && els.refs) {
      if (x.type === "commission" && Array.isArray(x.refs) && x.refs.length) {
        els.refsBlock.style.display = "block";
        els.refs.innerHTML = "";

        x.refs.forEach((ref) => {
          const url = ref.startsWith("http")
            ? ref
            : normBase(API_BASE) + (ref.startsWith("/") ? ref : "/" + ref);

          const a = document.createElement("a");
          a.href = url;
          a.target = "_blank";
          a.rel = "noreferrer";
          a.className = "ref-thumb";
          a.innerHTML = `<img src="${escapeAttr(url)}" alt="reference" loading="lazy">`;
          els.refs.appendChild(a);
        });
      } else {
        els.refsBlock.style.display = "none";
        els.refs.innerHTML = "";
      }
    }

    if (els.saveStatus) els.saveStatus.textContent = "";
  }

  async function loadAll() {
    if (!getToken()) {
      // not logged in
      window.location.href = LOGIN_PAGE;
      return;
    }

    if (!API_BASE) {
      const ok = await detectBackend();
      if (!ok) return;
    }

    setStatus("Loading inbox…", true);

    try {
      const [comm, enq] = await Promise.all([
        apiFetch("/admin/commissions", { method: "GET" }),
        apiFetch("/admin/enquiries", { method: "GET" }),
      ]);

      const commissions = Array.isArray(comm.items) ? comm.items : [];
      const enquiries = Array.isArray(enq.items) ? enq.items : [];

      items = [
        ...commissions.map(unifyCommission),
        ...enquiries.map(unifyEnquiry),
      ];

      setStatus("Loaded ✅", true);

      // keep selection if possible
      const visible = currentFiltered();
      if (activeId && !items.find((i) => i.id === activeId)) activeId = null;
      if (!activeId && visible.length) activeId = visible[0].id;

      renderList();
      renderDetail(activeId);
    } catch (e) {
      setStatus(`Error ❌ (${e.message})`, false);
      setAdminOutDebug({ error: e.message, apiBase: API_BASE });
      if (String(e.message || "").toLowerCase().includes("unauthorized")) {
        setToken("");
        window.location.href = LOGIN_PAGE;
      }
    }
  }

  async function saveActive() {
    const x = items.find((i) => i.id === activeId);
    if (!x) return;

    const status = els.statusSelect ? els.statusSelect.value : x.status;
    const notes = els.notesInput ? els.notesInput.value : x.notes;

    if (els.saveStatus) els.saveStatus.textContent = "Saving…";

    try {
      const isCommission = x.type === "commission";
      const path = isCommission
        ? `/admin/commissions/${encodeURIComponent(x.id)}`
        : `/admin/enquiries/${encodeURIComponent(x.id)}`;

      const data = await apiFetch(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });

      // update local item
      x.status = status;
      x.notes = notes;

      if (data && data.item) {
        // if backend returns updated item
        x.raw = data.item;
      }

      if (els.saveStatus) els.saveStatus.textContent = "Saved ✅";
      renderList();
      renderDetail(activeId);
    } catch (e) {
      if (els.saveStatus) els.saveStatus.textContent = `Save failed ❌ (${e.message})`;
    }
  }

  function logout() {
    setToken("");
    window.location.href = LOGIN_PAGE;
  }

  function setAdminOutDebug(obj) {
    if (!els.debugOut) return;
    els.debugOut.style.display = "block";
    els.debugOut.textContent = JSON.stringify(obj, null, 2);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(s) {
    return String(s || "").replaceAll('"', "&quot;");
  }

  // ---------- Events ----------
  if (els.refreshBtn) els.refreshBtn.addEventListener("click", loadAll);
  if (els.logoutBtn) els.logoutBtn.addEventListener("click", logout);
  if (els.saveBtn) els.saveBtn.addEventListener("click", saveActive);

  if (els.searchInput) {
    els.searchInput.addEventListener("input", () => {
      searchTerm = els.searchInput.value || "";
      renderList();
      renderDetail(activeId);
    });
  }

  if (els.tabs && els.tabs.length) {
    els.tabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        els.tabs.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activeFilter = btn.getAttribute("data-filter") || "all";

        // reset selection to first visible item
        const visible = currentFiltered();
        activeId = visible.length ? visible[0].id : null;

        renderList();
        renderDetail(activeId);
      });
    });
  }

  // ---------- Boot ----------
  (async function boot() {
    setBackendLabel();
    await detectBackend();
    await loadAll();
  })();
})();
