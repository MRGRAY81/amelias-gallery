// Amelia’s Gallery — Unified Frontend JS
(function () {
  const API_BASE = "https://amelias-gallery-backend.onrender.com";
  const GALLERY_ENDPOINT = `${API_BASE}/gallery`;

  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxClose = document.getElementById("lightboxClose");

  function openLightbox(src, caption) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    if (lightboxCaption) lightboxCaption.textContent = caption || "";
    lightbox.classList.add("show");
    lightbox.setAttribute("aria-hidden", "false");
  }

  function closeLightbox() {
    if (!lightbox || !lightboxImg) return;
    lightbox.classList.remove("show");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImg.src = "";
    if (lightboxCaption) lightboxCaption.textContent = "";
  }

  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightbox) {
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function fetchJson(url, timeoutMs = 6500) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }

  function normalizeBackendItems(items) {
    return (items || []).map((it) => {
      const rawUrl = it.url || it.thumbUrl || "";
      const abs =
        rawUrl.startsWith("http")
          ? rawUrl
          : `${API_BASE}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
      return {
        id: it.id || `g_${Math.random().toString(16).slice(2)}`,
        title: it.title || "Untitled",
        category: it.category || "other",
        thumb: abs,
        full: abs
      };
    });
  }

  function placeholderItems() {
    const cats = ["characters", "animals", "landscapes", "fantasy", "roblox"];
    const out = [];
    cats.forEach((c) => {
      for (let i = 1; i <= 12; i++) {
        out.push({
          id: `${c}-${i}`,
          title: `${c[0].toUpperCase() + c.slice(1)} #${i}`,
          category: c,
          thumb: `https://picsum.photos/seed/amelia-${c}-${i}/800/600`,
          full: `https://picsum.photos/seed/amelia-${c}-${i}/1600/1100`
        });
      }
    });
    return out;
  }

  async function getGalleryItems() {
    try {
      const data = await fetchJson(GALLERY_ENDPOINT);
      const items = normalizeBackendItems(data && data.items ? data.items : []);
      return items.length ? items : placeholderItems();
    } catch (e) {
      return placeholderItems();
    }
  }

  async function renderHomeFeatured() {
    const grid = document.getElementById("homeGrid");
    if (!grid) return;
    const items = await getGalleryItems();
    const featured = items.slice(0, 6);

    grid.innerHTML = "";
    featured.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card";
      btn.innerHTML = `<img src="${item.thumb}" alt="${escapeHtml(item.title)}" loading="lazy" />`;
      btn.addEventListener("click", () => openLightbox(item.full, item.title));
      grid.appendChild(btn);
    });
  }

  async function renderGalleryGrid() {
    const grid = document.getElementById("galleryGrid");
    if (!grid) return;

    const items = await getGalleryItems();

    grid.innerHTML = "";
    items.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card";
      btn.innerHTML = `<img src="${item.thumb}" alt="${escapeHtml(item.title)}" loading="lazy" />`;
      btn.addEventListener("click", () => openLightbox(item.full, item.title));
      grid.appendChild(btn);
    });
  }

  renderHomeFeatured();
  renderGalleryGrid();
})();
