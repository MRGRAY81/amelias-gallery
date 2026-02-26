// admin-portal.js — WORKS WITH /api/messages + PATCH /api/messages/:id

(function () {
  const TOKEN_KEY = "amelias_admin_ok";
  const LOGIN_PAGE = "./admin.html";

  const API_BASE =
    (window.AMELIAS_CONFIG && window.AMELIAS_CONFIG.API_BASE) || "";

  const els = {
    backendUrl: document.getElementById("backendUrl"),
    statusText: document.getElementById("statusText"),

    logoutBtn: document.getElementById("logoutBtn"),
    searchInput: document.getElementById("searchInput"),

    countText: document.getElementById("countText"),
    list: document.getElementById("list"),

    detail: document.getElementById("detail"),
    detailHint: document.getElementById("detailHint"),

    createdAt: document.getElementById("createdAt"),
    statusPill: document.getElementById("statusPill"),

    nameText: document.getElementById("nameText"),
    emailText: document.getElementById("emailText"),
    messageText: document.getElementById("messageText"),

    statusSelect: document.getElementById("statusSelect"),
    notesInput: document.getElementById("notesInput"),
    saveBtn: document.getElementById("saveBtn"),
    saveStatus: document.getElementById("saveStatus"),
  };

  let items = [];
  let activeId = null;
  let searchTerm = "";

  function normBase(b) {
    return String(b || "").replace(/\/$/, "");
  }

  function authed() {
    return localStorage.getItem(TOKEN_KEY) === "yes";
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = LOGIN_PAGE;
  }

  function setStatus(msg, ok = true) {
    if (!els.statusText) return;
    els.statusText.textContent = msg || "";
    els.statusText.style.color = ok ? "" : "#b00020";
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function apiGetMessages() {
    const base = normBase(API_BASE);
    const r = await fetch(`${base}/api/messages`);
    if (!r.ok) throw new Error(`GET /api/messages failed (${r.status})`);
    const j = await r.json();
    return Array.isArray(j.items) ? j.items : [];
  }

  async function apiPatchMessage(id, patch) {
    const base = normBase(API_BASE);
    const r = await fetch(`${base}/api/messages/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (!r.ok) {
      const t = await r.text();
      throw new Error(t || `PATCH failed (${r.status})`);
    }
    return r.json();
  }

  function filtered() {
    const q = String(searchTerm || "").trim().toLowerCase();
    const arr = items.filter((m) => {
      if (!q) return true;
      return (
        String(m.name || "").toLowerCase().includes(q) ||
        String(m.email || "").toLowerCase().includes(q) ||
        String(m.text || "").toLowerCase().includes(q) ||
        String(m.status || "").toLowerCase().includes(q)
      );
    });

    arr.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return arr;
  }

  function setCount(n) {
    if (!els.countText) return;
    els.countText.textContent = `${n} item${n === 1 ? "" : "s"}`;
  }

  function renderList() {
    const data = filtered();
    setCount(data.length);

    els.list.innerHTML = "";

    if (!data.length) {
      els.list.innerHTML = `<div class="muted">Nothing here yet.</div>`;
      return;
    }

    data.forEach((m) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "list-item" + (m.id === activeId ? " active" : "");

      const snippet = String(m.text || "").slice(0, 100);

      btn.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:10px;">
          <strong>${escapeHtml(m.name || "(no name)")}</strong>
          <span class="muted small">${escapeHtml(m.status || "new")}</span>
        </div>
        <div class="muted small">${escapeHtml(m.email || "")}</div>
        <div class="muted">${escapeHtml(snippet || "—")}</div>
        <div class="muted small">${escapeHtml(fmtDate(m.createdAt))}</div>
      `;

      btn.addEventListener("click", () => {
        activeId = m.id;
        renderList();
        renderDetail();
      });

      els.list.appendChild(btn);
    });
  }

  function renderDetail() {
    const m = items.find((x) => x.id === activeId);
    if (!m) {
      els.detail.style.display = "none";
      els.detailHint.textContent = "Select a message from the left.";
      return;
    }

    els.detailHint.textContent = "";
    els.detail.style.display = "block";

    els.nameText.textContent = m.name || "—";
    els.emailText.textContent = m.email || "—";
    els.createdAt.textContent = fmtDate(m.createdAt);
    els.statusPill.textContent = m.status || "new";
    els.messageText.textContent = m.text || "";

    els.statusSelect.value = m.status || "new";
    els.notesInput.value = m.notes || "";
    els.saveStatus.textContent = "";
  }

  async function load() {
    if (!authed()) {
      window.location.href = LOGIN_PAGE;
      return;
    }

    const base = normBase(API_BASE);
    if (els.backendUrl) els.backendUrl.textContent = base || "—";

    setStatus("Loading inbox…", true);

    try {
      items = await apiGetMessages();
      setStatus("Loaded ✅", true);

      const vis = filtered();
      if (!activeId && vis.length) activeId = vis[0].id;

      renderList();
      renderDetail();
    } catch (e) {
      setStatus(`Error ❌ ${e.message}`, false);
    }
  }

  async function save() {
    const m = items.find((x) => x.id === activeId);
    if (!m) return;

    const status = els.statusSelect.value;
    const notes = els.notesInput.value;

    els.saveStatus.textContent = "Saving…";

    try {
      const res = await apiPatchMessage(m.id, { status, notes });

      // backend returns {ok:true,msg}
      const updated = res.msg || res.item || null;
      if (updated) {
        m.status = updated.status || status;
        m.notes = updated.notes || notes;
      } else {
        m.status = status;
        m.notes = notes;
      }

      els.saveStatus.textContent = "Saved ✅";
      renderList();
      renderDetail();
    } catch (e) {
      els.saveStatus.textContent = `Save failed ❌ ${e.message}`;
    }
  }

  // events
  els.logoutBtn?.addEventListener("click", logout);
  els.saveBtn?.addEventListener("click", save);

  els.searchInput?.addEventListener("input", () => {
    searchTerm = els.searchInput.value || "";
    renderList();
    renderDetail();
  });

  // boot
  load();
})();
