(function () {
  const API_BASE =
    (window.AMELIAS_CONFIG && window.AMELIAS_CONFIG.API_BASE) || "";

  const TOKEN_KEY = "amelias_admin_token";
  const token = localStorage.getItem(TOKEN_KEY) || "";

  const els = {
    backendUrl: document.getElementById("backendUrl"),
    dot: document.getElementById("dot"),
    statusText: document.getElementById("statusText"),
    refreshBtn: document.getElementById("refreshBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    tabs: Array.from(document.querySelectorAll(".tab")),
    searchInput: document.getElementById("searchInput"),
    list: document.getElementById("list"),
    countText: document.getElementById("countText"),
    detail: document.getElementById("detail"),
    detailHint: document.getElementById("detailHint"),
    typeTag: document.getElementById("typeTag"),
    createdAt: document.getElementById("createdAt"),
    nameText: document.getElementById("nameText"),
    emailText: document.getElementById("emailText"),
    messageText: document.getElementById("messageText"),
    refsBlock: document.getElementById("refsBlock"),
    refs: document.getElementById("refs"),
    statusSelect: document.getElementById("statusSelect"),
    notesInput: document.getElementById("notesInput"),
    saveBtn: document.getElementById("saveBtn"),
    saveStatus: document.getElementById("saveStatus"),
  };

  if (!token) {
    window.location.href = "./admin.html";
    return;
  }

  if (els.backendUrl) els.backendUrl.textContent = API_BASE || "—";

  let filter = "all";
  let search = "";
  let items = [];
  let activeId = null;

  function setOnline(ok, msg) {
    if (!els.dot || !els.statusText) return;
    els.dot.className = "dot " + (ok ? "good" : "bad");
    els.statusText.textContent = msg;
  }

  function authHeaders(extra = {}) {
    return {
      ...extra,
      Authorization: `Bearer ${token}`,
    };
  }

  async function apiFetch(path, opts = {}) {
    if (!API_BASE) throw new Error("Missing API_BASE in config.js");
    const url = API_BASE.replace(/\/$/, "") + path;
    const res = await fetch(url, {
      ...opts,
      headers: authHeaders(opts.headers || {}),
    });

    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await res.json() : await res.text();

    if (!res.ok) {
      const msg = (data && (data.message || data.error)) || `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return data;
  }

  function normalizeStatus(s) {
    if (!s) return "new";
    return String(s).toLowerCase();
  }

  // ✅ Map:
  // - enquiries = Direct Sale (green)
  // - commissions = Commission (purple)
  function merge(commissions, enquiries) {
    const a = (commissions || []).map((x) => ({
      ...x,
      _type: "commission",
      _label: "COMMISSION",
      _status: normalizeStatus(x.status),
      _text: `${x.name || ""} ${x.email || ""} ${x.brief || ""}`.toLowerCase(),
      _created: x.createdAt || "",
    }));

    const b = (enquiries || []).map((x) => ({
      ...x,
      _type: "sale",
      _label: "DIRECT SALE",
      _status: normalizeStatus(x.status),
      _text: `${x.name || ""} ${x.email || ""} ${x.message || ""}`.toLowerCase(),
      _created: x.createdAt || "",
    }));

    // newest first
    return [...a, ...b].sort((p, q) => (q._created || "").localeCompare(p._created || ""));
  }

  function applyFilters(list) {
    let out = list;

    if (filter !== "all") out = out.filter((x) => x._status === filter);

    if (search) {
      const s = search.toLowerCase();
      out = out.filter((x) => x._text.includes(s));
    }

    return out;
  }

  function badgeHtml(x) {
    const typeClass = x._type === "sale" ? "sale" : "commission";
    const statusClass = `status-${x._status}`;
    return `
      <span class="badge ${typeClass}">${x._label}</span>
      <span class="badge ${statusClass}">${x._status}</span>
    `;
  }

  function previewText(x) {
    const t = x._type === "sale" ? (x.message || "") : (x.brief || "");
    return String(t).slice(0, 120);
  }

  function renderList() {
    const filtered = applyFilters(items);
    if (els.countText) els.countText.textContent = `${filtered.length} item(s)`;

    if (!els.list) return;
    els.list.innerHTML = filtered
      .map((x) => {
        const active = x.id === activeId ? "active" : "";
        return `
          <div class="item ${active}" data-id="${x.id}">
            <div class="item-top">
              <div class="item-name">${escapeHtml(x.name || "Unknown")}</div>
              <div class="item-meta">${badgeHtml(x)}</div>
            </div>
            <div class="item-preview">${escapeHtml(previewText(x))}</div>
            <div class="muted small mono">${escapeHtml(x.email || "")}</div>
          </div>
        `;
      })
      .join("");
  }

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showDetail(x) {
    activeId = x.id;
    renderList();

    if (!els.detail || !els.detailHint) return;

    els.detailHint.style.display = "none";
    els.detail.style.display = "block";

    if (els.typeTag) {
      els.typeTag.textContent = x._label;
      els.typeTag.className = "tag " + (x._type === "sale" ? "sale" : "commission");
    }

    if (els.createdAt) els.createdAt.textContent = x.createdAt ? new Date(x.createdAt).toLocaleString() : "—";
    if (els.nameText) els.nameText.textContent = x.name || "—";
    if (els.emailText) els.emailText.textContent = x.email || "—";

    const main = x._type === "sale" ? (x.message || "") : (x.brief || "");
    if (els.messageText) els.messageText.textContent = main || "—";

    if (els.statusSelect) els.statusSelect.value = x._status || "new";
    if (els.notesInput) els.notesInput.value = x.notes || "";

    // refs (commissions only)
    if (els.refsBlock && els.refs) {
      const refs = Array.isArray(x.refs) ? x.refs : [];
      if (x._type === "commission" && refs.length) {
        els.refsBlock.style.display = "block";
        els.refs.innerHTML = refs
          .map((r, i) => `<a href="${r}" target="_blank" rel="noreferrer">Ref ${i + 1} ↗</a>`)
          .join("");
      } else {
        els.refsBlock.style.display = "none";
        els.refs.innerHTML = "";
      }
    }

    if (els.saveStatus) els.saveStatus.textContent = "";
  }

  async function loadAll() {
    try {
      setOnline(true, "Loading…");
      const health = await fetch(API_BASE.replace(/\/$/, "") + "/health");
      setOnline(health.ok, health.ok ? "Online" : "Online (but health not OK)");

      const [c, e] = await Promise.all([
        apiFetch("/admin/commissions", { method: "GET" }),
        apiFetch("/admin/enquiries", { method: "GET" }),
      ]);

      items = merge(c.items || [], e.items || []);
      renderList();

      // keep selection if possible
      if (activeId) {
        const found = items.find((x) => x.id === activeId);
        if (found) showDetail(found);
      }
    } catch (err) {
      setOnline(false, err.message || "Offline");
      if (els.list) els.list.innerHTML = `<div class="item"><b>Error:</b> ${escapeHtml(err.message)}</div>`;
    }
  }

  async function saveActive() {
    if (!activeId) return;
    const x = items.find((z) => z.id === activeId);
    if (!x) return;

    const status = els.statusSelect ? els.statusSelect.value : "new";
    const notes = els.notesInput ? els.notesInput.value : "";

    const path =
      x._type === "commission"
        ? `/admin/commissions/${encodeURIComponent(x.id)}`
        : `/admin/enquiries/${encodeURIComponent(x.id)}`;

    try {
      if (els.saveStatus) els.saveStatus.textContent = "Saving…";
      await apiFetch(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });

      // update local copy
      x.status = status;
      x.notes = notes;
      x._status = normalizeStatus(status);

      if (els.saveStatus) els.saveStatus.textContent = "Saved ✅";
      renderList();
    } catch (err) {
      if (els.saveStatus) els.saveStatus.textContent = `Save failed ❌ (${err.message})`;
    }
  }

  // Events
  if (els.list) {
    els.list.addEventListener("click", (e) => {
      const itemEl = e.target.closest(".item");
      if (!itemEl) return;
      const id = itemEl.getAttribute("data-id");
      const found = items.find((x) => x.id === id);
      if (found) showDetail(found);
    });
  }

  if (els.tabs) {
    els.tabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        els.tabs.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        filter = btn.getAttribute("data-filter") || "all";
        renderList();
      });
    });
  }

  if (els.searchInput) {
    els.searchInput.addEventListener("input", (e) => {
      search = e.target.value || "";
      renderList();
    });
  }

  if (els.refreshBtn) els.refreshBtn.addEventListener("click", loadAll);
  if (els.saveBtn) els.saveBtn.addEventListener("click", saveActive);

  if (els.logoutBtn) {
    els.logoutBtn.addEventListener("click", () => {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "./admin.html";
    });
  }

  // Init
  loadAll();
})();
