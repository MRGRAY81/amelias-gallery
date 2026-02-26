// admin-portal.js — Amelia's Gallery Inbox (messages + uploads)

(function () {
  const TOKEN_KEY = "amelias_admin_token";
  const LOGIN_PAGE = "./admin.html";

  const API =
    (window.AMELIAS_CONFIG && window.AMELIAS_CONFIG.API_BASE) || "";

  // ---------- DOM ----------
  const els = {
    dot: document.getElementById("dot"),
    statusText: document.getElementById("statusText"),
    backendUrl: document.getElementById("backendUrl"),

    refreshBtn: document.getElementById("refreshBtn"),
    logoutBtn: document.getElementById("logoutBtn"),

    tabs: Array.from(document.querySelectorAll(".tab")),
    searchInput: document.getElementById("searchInput"),

    countText: document.getElementById("countText"),
    list: document.getElementById("list"),

    detail: document.getElementById("detail"),
    detailHint: document.getElementById("detailHint"),

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
  };

  // ---------- State ----------
  let items = []; // {id,name,email,text,status,notes,refs[],createdAt}
  let activeId = null;
  let activeFilter = "all";
  let searchTerm = "";

  // ---------- Helpers ----------
  function isLoggedIn() {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  function setStatus(text, ok) {
    if (els.statusText) els.statusText.textContent = text || "";
    if (els.dot) els.dot.className = "dot " + (ok ? "good" : "bad");
  }

  function setBackendLabel() {
    if (els.backendUrl) els.backendUrl.textContent = API || "—";
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  function safeLower(s) {
    return String(s || "").toLowerCase();
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function health() {
    try {
      const r = await fetch(`${API}/api/health`);
      const j = await r.json();
      if (j?.ok) {
        setStatus("Connected ✅", true);
        return true;
      }
    } catch {}
    setStatus("Backend not reachable ❌", false);
    return false;
  }

  function currentFiltered() {
    const q = safeLower(searchTerm).trim();

    const filtered = items.filter((x) => {
      const matchesStatus = activeFilter === "all" ? true : x.status === activeFilter;

      const matchesSearch =
        !q ||
        safeLower(x.name).includes(q) ||
        safeLower(x.email).includes(q) ||
        safeLower(x.text).includes(q) ||
        safeLower(x.status).includes(q);

      return matchesStatus && matchesSearch;
    });

    filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
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

    if (!data.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Nothing here yet.";
      els.list.appendChild(empty);
      return;
    }

    data.forEach((x) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "list-item " + (x.id === activeId ? "active " : "") + "status-" + x.status;

      const title = x.name || "(no name)";
      const sub = x.email || "";
      const snippet = (x.text || "").trim().slice(0, 110);

      row.innerHTML = `
        <div class="li-top">
          <div class="li-title">${escapeHtml(title)}</div>
          <div class="badge">Message</div>
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
    const x = items.find((m) => m.id === id);

    if (!x) {
      if (els.detail) els.detail.style.display = "none";
      if (els.detailHint) els.detailHint.textContent = "Select an item on the left.";
      return;
    }

    if (els.detailHint) els.detailHint.textContent = "";
    if (els.detail) els.detail.style.display = "block";

    if (els.createdAt) els.createdAt.textContent = fmtDate(x.createdAt);
    if (els.statusSelect) els.statusSelect.value = x.status || "new";

    if (els.nameText) els.nameText.textContent = x.name || "—";
    if (els.emailText) els.emailText.textContent = x.email || "—";
    if (els.messageText) els.messageText.textContent = x.text || "—";

    if (els.notesInput) els.notesInput.value = x.notes || "";
    if (els.saveStatus) els.saveStatus.textContent = "";

    // refs thumbnails
    if (els.refsBlock && els.refs) {
      const refs = Array.isArray(x.refs) ? x.refs : [];
      if (refs.length) {
        els.refsBlock.style.display = "block";
        els.refs.innerHTML = "";

        refs.forEach((url) => {
          const a = document.createElement("a");
          a.href = url;
          a.target = "_blank";
          a.rel = "noreferrer";
          a.className = "ref-thumb";
          a.innerHTML = `<img src="${url}" alt="reference" loading="lazy">`;
          els.refs.appendChild(a);
        });
      } else {
        els.refsBlock.style.display = "none";
        els.refs.innerHTML = "";
      }
    }
  }

  async function loadAll() {
    if (!isLoggedIn()) {
      window.location.href = LOGIN_PAGE;
      return;
    }

    setStatus("Loading inbox…", true);

    try {
      const r = await fetch(`${API}/api/messages`);
      const j = await r.json();
      items = Array.isArray(j.items) ? j.items : [];

      setStatus("Loaded ✅", true);

      const visible = currentFiltered();
      if (activeId && !items.find((i) => i.id === activeId)) activeId = null;
      if (!activeId && visible.length) activeId = visible[0].id;

      renderList();
      renderDetail(activeId);
    } catch (e) {
      setStatus("Error loading messages ❌", false);
    }
  }

  async function saveActive() {
    const x = items.find((m) => m.id === activeId);
    if (!x) return;

    const status = els.statusSelect ? els.statusSelect.value : x.status;
    const notes = els.notesInput ? els.notesInput.value : x.notes;

    if (els.saveStatus) els.saveStatus.textContent = "Saving…";

    try {
      const r = await fetch(`${API}/api/messages/${encodeURIComponent(x.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });

      if (!r.ok) throw new Error("Save failed");
      const j = await r.json();
      if (j?.msg) {
        // update local
        x.status = j.msg.status;
        x.notes = j.msg.notes;
      } else {
        x.status = status;
        x.notes = notes;
      }

      if (els.saveStatus) els.saveStatus.textContent = "Saved ✅";
      renderList();
      renderDetail(activeId);
    } catch {
      if (els.saveStatus) els.saveStatus.textContent = "Save failed ❌";
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = LOGIN_PAGE;
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
    await health();
    await loadAll();
  })();
})();
