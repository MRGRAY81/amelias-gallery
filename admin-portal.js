/**
 * Amelia's Gallery — Admin Portal
 * Uses:
 *  - /auth/login (token stored by admin.js)
 *  - /admin/commissions
 *  - /admin/enquiries
 *  - /gallery
 *  - /upload (multipart)
 */

(function () {
  const DEFAULT_API =
    (window.AMELIAS_CONFIG && window.AMELIAS_CONFIG.API_BASE) ||
    "https://amelias-gallery-backend.onrender.com";

  const TOKEN_KEY = "amelias_admin_token";
  const API_KEY = "amelias_api_base_override";

  const els = {
    backendTag: document.getElementById("backendTag"),
    status: document.getElementById("status"),
    refreshBtn: document.getElementById("refreshBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    viewRequestsBtn: document.getElementById("viewRequestsBtn"),
    heroSub: document.getElementById("heroSub"),

    ordersList: document.getElementById("ordersList"),
    enquiriesList: document.getElementById("enquiriesList"),
    galleryGrid: document.getElementById("galleryGrid"),

    orderSearch: document.getElementById("orderSearch"),
    enquirySearch: document.getElementById("enquirySearch"),

    gTitle: document.getElementById("gTitle"),
    gCategory: document.getElementById("gCategory"),
    gFile: document.getElementById("gFile"),
    uploadBtn: document.getElementById("uploadBtn"),

    apiBase: document.getElementById("apiBase"),
    saveApiBtn: document.getElementById("saveApiBtn"),
    resetApiBtn: document.getElementById("resetApiBtn"),
  };

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function setStatus(msg, ok = true) {
    if (!els.status) return;
    els.status.textContent = msg;
    els.status.className = "status " + (ok ? "good" : "bad");
  }

  function getApiBase() {
    const override = localStorage.getItem(API_KEY);
    return (override && override.trim()) ? override.trim() : DEFAULT_API;
  }

  function setApiBase(v) {
    if (!v) localStorage.removeItem(API_KEY);
    else localStorage.setItem(API_KEY, v);
  }

  async function apiFetch(path, opts = {}) {
    const API_BASE = getApiBase();
    const url = API_BASE.replace(/\/$/, "") + path;

    const headers = { ...(opts.headers || {}) };
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;

    const res = await fetch(url, { ...opts, headers });

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

  function fmtDate(iso) {
    if (!iso) return "";
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }

  function normStatus(x) {
    const s = String(x || "new").toLowerCase();
    if (s === "inprogress") return "in_progress";
    if (s === "in-progress") return "in_progress";
    if (s === "done") return "completed";
    return s;
  }

  function orderCard(o) {
    const status = normStatus(o.status || "new");
    const badgeClass = status === "in_progress" ? "in_progress" : status;

    const safeBrief = (o.brief || "").slice(0, 140);
    const refs = Array.isArray(o.refs) ? o.refs : [];

    const wrap = document.createElement("div");
    wrap.className = "item";

    wrap.innerHTML = `
      <div>
        <h3>${escapeHtml(o.name || "Unknown")}</h3>
        <div class="meta">
          <b>Email:</b> ${escapeHtml(o.email || "")}
          <span style="margin:0 8px;">•</span>
          <b>Created:</b> ${escapeHtml(fmtDate(o.createdAt))}
        </div>
        <div style="margin-top:8px;">
          ${escapeHtml(safeBrief)}${(o.brief || "").length > 140 ? "…" : ""}
        </div>

        <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn" data-action="copy-email">Copy Email</button>
          <button class="btn ghost" data-action="copy-brief">Copy Brief</button>
          <button class="btn" data-action="set-new">New</button>
          <button class="btn" data-action="set-progress">In Progress</button>
          <button class="btn" data-action="set-completed">Completed</button>
        </div>

        ${refs.length ? `
          <div class="meta" style="margin-top:10px;"><b>Refs:</b></div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:6px;">
            ${refs.map(r => `<a class="btnlink" target="_blank" rel="noreferrer" href="${escapeAttr(fullUrl(r))}">Open ref</a>`).join("")}
          </div>
        ` : ""}
      </div>

      <div class="badge ${badgeClass}">${labelStatus(status)}</div>
    `;

    wrap.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const act = btn.getAttribute("data-action");

        if (act === "copy-email") return copyText(o.email || "");
        if (act === "copy-brief") return copyText(o.brief || "");

        const next =
          act === "set-new" ? "new" :
          act === "set-progress" ? "in_progress" :
          "completed";

        try {
          setStatus("Updating order…", true);
          await apiFetch(`/admin/commissions/${encodeURIComponent(o.id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: next }),
          });
          await loadAll();
          setStatus("Updated ✅", true);
        } catch (e) {
          setStatus(`Update failed ❌ (${e.message})`, false);
        }
      });
    });

    return wrap;
  }

  function enquiryCard(e) {
    const status = normStatus(e.status || "new");
    const badgeClass = status === "in_progress" ? "in_progress" : status;

    const wrap = document.createElement("div");
    wrap.className = "item";

    const msg = (e.message || "").slice(0, 220);

    wrap.innerHTML = `
      <div>
        <h3>${escapeHtml(e.name || "Unknown")}</h3>
        <div class="meta">
          <b>Email:</b> ${escapeHtml(e.email || "")}
          <span style="margin:0 8px;">•</span>
          <b>Created:</b> ${escapeHtml(fmtDate(e.createdAt))}
        </div>
        <div style="margin-top:8px;">
          ${escapeHtml(msg)}${(e.message || "").length > 220 ? "…" : ""}
        </div>

        <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn" data-action="copy-email">Copy Email</button>
          <button class="btn ghost" data-action="copy-msg">Copy Message</button>
          <button class="btn" data-action="set-new">New</button>
          <button class="btn" data-action="set-completed">Replied</button>
        </div>
      </div>

      <div class="badge ${badgeClass}">${labelEnquiry(status)}</div>
    `;

    wrap.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const act = btn.getAttribute("data-action");

        if (act === "copy-email") return copyText(e.email || "");
        if (act === "copy-msg") return copyText(e.message || "");

        const next = act === "set-new" ? "new" : "completed";

        try {
          setStatus("Updating enquiry…", true);
          await apiFetch(`/admin/enquiries/${encodeURIComponent(e.id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: next }),
          });
          await loadAll();
          setStatus("Updated ✅", true);
        } catch (err) {
          setStatus(`Update failed ❌ (${err.message})`, false);
        }
      });
    });

    return wrap;
  }

  function labelStatus(s) {
    if (s === "in_progress") return "In Progress";
    if (s === "completed") return "Completed";
    return "New Request";
  }
  function labelEnquiry(s) {
    if (s === "completed") return "Replied";
    return "New Enquiry";
  }

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replaceAll("`", "&#096;");
  }

  function fullUrl(p) {
    // backend returns "/uploads/..."
    const API_BASE = getApiBase().replace(/\/$/, "");
    if (!p) return "";
    if (String(p).startsWith("http")) return p;
    return API_BASE + p;
  }

  async function copyText(t) {
    try {
      await navigator.clipboard.writeText(String(t || ""));
      setStatus("Copied ✅", true);
    } catch {
      setStatus("Copy failed ❌", false);
    }
  }

  function wireTabs() {
    document.querySelectorAll(".menu-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".menu-item").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const tab = btn.getAttribute("data-tab");
        document.querySelectorAll(".tabpanel").forEach(p => p.style.display = "none");
        const panel = document.getElementById(`tab-${tab}`);
        if (panel) panel.style.display = "block";
      });
    });

    document.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        renderOrders();
      });
    });
  }

  let commissions = [];
  let enquiries = [];
  let gallery = [];

  function renderOrders() {
    const list = els.ordersList;
    if (!list) return;
    list.innerHTML = "";

    const q = (els.orderSearch?.value || "").trim().toLowerCase();
    const activeFilter = document.querySelector(".chip.active")?.getAttribute("data-filter") || "all";

    const filtered = commissions
      .filter(o => {
        const hay = `${o.name||""} ${o.email||""} ${o.brief||""}`.toLowerCase();
        if (q && !hay.includes(q)) return false;
        const s = normStatus(o.status || "new");
        if (activeFilter === "all") return true;
        return s === activeFilter;
      });

    filtered.forEach(o => list.appendChild(orderCard(o)));

    if (els.heroSub) {
      const newCount = commissions.filter(o => normStatus(o.status) === "new").length;
      els.heroSub.textContent = `You have ${newCount} new commission request${newCount === 1 ? "" : "s"}!`;
    }
  }

  function renderEnquiries() {
    const list = els.enquiriesList;
    if (!list) return;
    list.innerHTML = "";

    const q = (els.enquirySearch?.value || "").trim().toLowerCase();

    const filtered = enquiries.filter(e => {
      const hay = `${e.name||""} ${e.email||""} ${e.message||""}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      return true;
    });

    filtered.forEach(e => list.appendChild(enquiryCard(e)));
  }

  function renderGallery() {
    const grid = els.galleryGrid;
    if (!grid) return;
    grid.innerHTML = "";

    (gallery || []).slice(0, 30).forEach((g) => {
      const card = document.createElement("div");
      card.className = "gimg";
      card.innerHTML = `
        <img src="${escapeAttr(fullUrl(g.url))}" alt="${escapeAttr(g.title || "Artwork")}" loading="lazy" />
        <div class="cap">${escapeHtml(g.title || "Untitled")}</div>
      `;
      grid.appendChild(card);
    });
  }

  async function loadAll() {
    const token = getToken();
    if (!token) {
      // no token -> send back to login
      window.location.href = "./admin.html";
      return;
    }

    const API_BASE = getApiBase();
    if (els.backendTag) els.backendTag.textContent = `Backend: ${API_BASE}`;

    try {
      setStatus("Loading admin data…", true);

      // commissions
      const c = await apiFetch("/admin/commissions");
      commissions = Array.isArray(c.items) ? c.items : [];

      // enquiries (may not exist until backend updated)
      try {
        const e = await apiFetch("/admin/enquiries");
        enquiries = Array.isArray(e.items) ? e.items : [];
      } catch {
        enquiries = [];
      }

      // gallery
      const g = await apiFetch("/gallery", { method: "GET" });
      gallery = Array.isArray(g.items) ? g.items : [];

      renderOrders();
      renderEnquiries();
      renderGallery();

      setStatus("Ready ✅", true);
    } catch (err) {
      setStatus(`Load failed ❌ (${err.message})`, false);
    }
  }

  async function uploadGallery() {
    const title = (els.gTitle?.value || "").trim() || "Untitled";
    const category = (els.gCategory?.value || "").trim() || "other";
    const file = els.gFile?.files?.[0];

    if (!file) return setStatus("Pick an image file first.", false);

    try {
      setStatus("Uploading…", true);
      const fd = new FormData();
      fd.append("title", title);
      fd.append("category", category);
      fd.append("file", file);

      await apiFetch("/upload", { method: "POST", body: fd });
      await loadAll();
      setStatus("Uploaded ✅", true);

      if (els.gFile) els.gFile.value = "";
    } catch (err) {
      setStatus(`Upload failed ❌ (${err.message})`, false);
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setStatus("Logged out.", true);
    window.location.href = "./admin.html";
  }

  // Settings controls
  function initSettingsUI() {
    if (els.apiBase) els.apiBase.value = getApiBase();

    els.saveApiBtn?.addEventListener("click", () => {
      const v = (els.apiBase?.value || "").trim();
      setApiBase(v);
      setStatus("Saved ✅ Reloading…", true);
      loadAll();
    });

    els.resetApiBtn?.addEventListener("click", () => {
      localStorage.removeItem(API_KEY);
      if (els.apiBase) els.apiBase.value = getApiBase();
      setStatus("Reset ✅ Reloading…", true);
      loadAll();
    });
  }

  // Wire buttons
  els.refreshBtn?.addEventListener("click", loadAll);
  els.logoutBtn?.addEventListener("click", logout);
  els.viewRequestsBtn?.addEventListener("click", () => {
    // go to Orders tab
    document.querySelector('[data-tab="orders"]')?.click();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  els.orderSearch?.addEventListener("input", renderOrders);
  els.enquirySearch?.addEventListener("input", renderEnquiries);

  els.uploadBtn?.addEventListener("click", uploadGallery);

  // Init
  wireTabs();
  initSettingsUI();
  loadAll();
})();
