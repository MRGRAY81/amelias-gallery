// Amelia’s Gallery — Unified Frontend JS
// Supports:
// - Home featured grid (#homeGrid)
// - Gallery grid (#galleryGrid)
// - Gallery carousel rows (#rows + #chips)
// - Lightbox everywhere
(function () {
  // =========================
  // Config
  // =========================
  const API_BASE = "https://amelias-gallery-backend.onrender.com"; // backend on Render
  const GALLERY_ENDPOINT = `${API_BASE}/gallery`;

  // =========================
  // Lightbox (shared)
  // =========================
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

  // =========================
  // Helpers
  // =========================
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

  // Turn backend item into UI item (absolute image URL)
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

  // Placeholder items if backend empty/offline
  function placeholderItems() {
    const cats = ["characters", "animals", "landscapes", "fantasy", "roblox"];
    const out = [];
    cats.forEach((c) => {
      for (let i = 1; i <= 10; i++) {
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

  // =========================
  // Home: Featured grid
  // =========================
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

  // =========================
  // Gallery: Simple grid
  // =========================
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

  // =========================
  // Gallery: Endless carousel rows + chips (optional)
  // =========================
  async function renderGalleryCarouselRows() {
    const rowsEl = document.getElementById("rows");
    const chipsEl = document.getElementById("chips");
    if (!rowsEl || !chipsEl) return;

    const ALL_ITEMS = await getGalleryItems();

    // Build categories from data
    const categorySet = new Set(ALL_ITEMS.map((x) => x.category || "other"));
    const dataCats = Array.from(categorySet);

    const CATEGORIES = [{ key: "all", label: "All" }].concat(
      dataCats.map((c) => ({
        key: c,
        label: c.replace(/^\w/, (m) => m.toUpperCase())
      }))
    );

    // Collections (rows) — one row per category (except all)
    const COLLECTIONS = dataCats.map((c) => ({
      key: c,
      title: c.replace(/^\w/, (m) => m.toUpperCase()),
      hint: "Never-ending carousel"
    }));

    let activeFilter = "all";
    const strips = [];

    function renderChips() {
      chipsEl.innerHTML = "";
      CATEGORIES.forEach((c) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chipbtn" + (c.key === activeFilter ? " active" : "");
        b.textContent = c.label;
        b.addEventListener("click", () => {
          activeFilter = c.key;
          renderChips();
          renderRows();
        });
        chipsEl.appendChild(b);
      });
    }

    function setPaused(stripEl, paused) {
      const s = strips.find((x) => x.el === stripEl);
      if (s) s.paused = paused;
    }

    function createRow(collection) {
      const wrap = document.createElement("div");
      wrap.className = "row";

      const head = document.createElement("div");
      head.className = "rowhead";
      head.innerHTML = `<h3>${escapeHtml(collection.title)}</h3><p class="hint">${escapeHtml(collection.hint)}</p>`;
      wrap.appendChild(head);

      const stripWrap = document.createElement("div");
      stripWrap.className = "stripWrap";

      const strip = document.createElement("div");
      strip.className = "strip";
      stripWrap.appendChild(strip);

      wrap.appendChild(stripWrap);

      let items = ALL_ITEMS.filter((it) => it.category === collection.key);
      if (activeFilter !== "all") items = items.filter((it) => it.category === activeFilter);

      if (!items.length) {
        strip.innerHTML = `<div class="emptyRow">No items in this category yet — coming soon ✨</div>`;
        return wrap;
      }

      // Duplicate for endless loop
      const loopItems = items.concat(items);

      loopItems.forEach((it) => {
        const tile = document.createElement("button");
        tile.type = "button";
        tile.className = "tile";
        tile.innerHTML = `
          <img src="${it.thumb}" alt="${escapeHtml(it.title)}" loading="lazy" />
          <div class="cap">${escapeHtml(it.title)}</div>
        `;
        tile.addEventListener("click", () => openLightbox(it.full, it.title));
        strip.appendChild(tile);
      });

      const speed = 0.35 + Math.random() * 0.35;
      strips.push({ el: strip, wrap: stripWrap, x: 0, speed, paused: false, halfWidth: 0 });

      stripWrap.addEventListener("mouseenter", () => setPaused(strip, true));
      stripWrap.addEventListener("mouseleave", () => setPaused(strip, false));
      stripWrap.addEventListener("touchstart", () => setPaused(strip, true), { passive: true });
      stripWrap.addEventListener("touchend", () => setPaused(strip, false), { passive: true });

      return wrap;
    }

    function renderRows() {
      strips.length = 0;
      rowsEl.innerHTML = "";
      COLLECTIONS.forEach((c) => rowsEl.appendChild(createRow(c)));

      requestAnimationFrame(() => {
        strips.forEach((s) => {
          s.halfWidth = s.el.scrollWidth / 2;
        });
      });
    }

    function tick() {
      strips.forEach((s) => {
        if (!s.halfWidth) return;
        if (s.paused) return;

        s.x -= s.speed;
        if (Math.abs(s.x) >= s.halfWidth) s.x = 0;
        s.el.style.transform = `translateX(${s.x}px)`;
      });
      requestAnimationFrame(tick);
    }

    renderChips();
    renderRows();
    requestAnimationFrame(tick);
  }

  // =========================
  // Init
  // =========================
  renderHomeFeatured();
  renderGalleryGrid();
  renderGalleryCarouselRows();
})();
