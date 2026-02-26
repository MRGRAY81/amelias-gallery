// commissions.js — Amelia's Gallery (Commissions -> Inbox + Uploads)

(function () {
  const API =
    (window.AMELIAS_CONFIG && window.AMELIAS_CONFIG.API_BASE) || "";

  const $ = (id) => document.getElementById(id);

  const form = $("commissionForm");
  const statusEl = $("formStatus");
  const backendPill = $("backendState");

  const refs = $("refs");
  const thumbs = $("thumbs");
  const clearFiles = $("clearFiles");

  function setStatus(msg, ok = true) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.classList.remove("ok", "bad");
    if (!msg) return;
    statusEl.classList.add(ok ? "ok" : "bad");
  }

  async function pingBackend() {
    if (!backendPill) return;
    try {
      const r = await fetch(`${API}/api/health`);
      const j = await r.json();
      backendPill.textContent = j?.ok ? "Backend: online" : "Backend: unknown";
    } catch {
      backendPill.textContent = "Backend: offline";
    }
  }

  function validateFiles(files) {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    const list = Array.from(files || []);

    if (list.length > 3) throw new Error("Max 3 reference images.");
    list.forEach((f) => {
      if (!allowed.includes(f.type)) throw new Error("Only PNG/JPG/WEBP allowed.");
      if (f.size > 8 * 1024 * 1024) throw new Error("Each file must be under 8MB.");
    });

    return list;
  }

  function renderThumbs(files) {
    if (!thumbs) return;
    thumbs.innerHTML = "";
    const list = Array.from(files || []);
    if (!list.length) return;

    list.forEach((file) => {
      const img = document.createElement("img");
      img.alt = "Reference";
      img.src = URL.createObjectURL(file);
      thumbs.appendChild(img);
    });
  }

  async function uploadOne(file) {
    const fd = new FormData();
    fd.append("file", file);

    const r = await fetch(`${API}/api/upload`, { method: "POST", body: fd });
    if (!r.ok) throw new Error("Upload failed.");
    const j = await r.json();
    if (!j?.url) throw new Error("Upload returned no URL.");
    return j.url;
  }

  async function createMessage({ name, email
