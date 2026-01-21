// Amelia's Gallery — Endless carousel rows + lightbox (backend-aware)
(function () {
  const rowsEl = document.getElementById("rows");
  const chipsEl = document.getElementById("chips");

  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxClose = document.getElementById("lightboxClose");

  // ✅ Set your Render backend here
  // If you leave as "" it will try same-origin (only works if proxied).
  const API_BASE = "https://amelias-gallery-backend.onrender.com";

  // Collections (rows). Categories should match backend "category" values.
  const COLLECTIONS = [
    { key: "characters", title: "Characters", hint: "Never-ending carousel" },
    { key: "animals", title: "Animals", hint: "Click any piece to enlarge" },
    { key: "landscapes", title: "Landscapes", hint: "Loops back around forever" },
    { key: "fantasy", title: "Fantasy Worlds", hint: "Soft gallery vibe" },
    { key: "roblox", title: "Roblox Scenes", hint: "Great for commissions" }
  ];

  // Fallback categories (chips). We will also auto-extend from backend categories.
  let CATEGORIES = [
    { key: "all", label: "All" },
    { key: "characters", label: "Characters" },
    { key: "animals", label: "Animals" },
    { key: "landscapes", label: "Landscapes" },
    { key: "fantasy", label: "Fantasy" },
    { key: "roblox", label: "Roblox Scenes" }
  ];

  let activeFilter = "all";
  let ALL_ITEMS = []; // populated from backend OR fallback

  // --------------------
  // Backend fetch
  // --------------------
  async function fetchBackendGallery() {
    try {
      const res = await fetch(`${API_BASE}/gallery`, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      // Normalize to our shape
      const normalized = items.map((it) => {
        const title = String(it.title || "Untitled");
        const category = String(it.category || "other").toLowerCase();
        const full = toAbsUrl(it.url);
        const thumb = toAbsUrl(it.thumbUrl || it.url);
        return { id: it.id || makeId(), title, category, thumb, full };
      });
      return normalized;
    } catch (e) {
      return null;
    }
  }

  function toAbsUrl(p) {
    const s = String(p || "");
    if (!s) return "";
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    // backend serves /uploads/...
    return `${API_BASE}${s.startsWith("/") ? "" : "/"}${s}`;
  }

  // --------------------
  // Fallback placeholder data (picsum)
  // --------------------
  function makeItemsFor(key, count = 12) {
    return Array.from({ length: count }).map((_, i) => {
      const n = i + 1;
      const label = (CATEGORIES.find(c => c.key === key)?.label) || "Artwork";
      return {
        id: `${key}-${n}`,
        title: `${label} #${n}`,
        thumb: `https://picsum.photos/seed/amelia-${key}-${n}/700/500`,
        full: `https://picsum.photos/seed/amelia-${key}-${n}/1600/1100`,
        category: key
      };
    });
  }

  function buildFallbackItems() {
    const base = COLLECTIONS.flatMap(c => makeItemsFor(c.key, 12));
    // add a few "other" so we never show empty if you pick it later
    return base;
  }

  // --------------------
  // Chips (filter)
  // --------------------
  function renderChips() {
    if (!chipsEl) return;
    chipsEl.innerHTML = "";

    CATEGORIES.forEach(c => {
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

  // --------------------
  // Endless strip engine
  // --------------------
  const strips = [];

  function createRow(collection) {
    const wrap = document.createElement("div");
    wrap.className = "row";

    const head = document.createElement("div");
    head.className = "rowhead";
    head.innerHTML = `<h3>${collection.title}</h3><p class="hint">${collection.hint}</p>`;
    wrap.appendChild(head);

    const stripWrap = document.createElement("div");
    stripWrap.className = "stripWrap";

    const strip = document.createElement("div");
    strip.className = "strip";
    stripWrap.appendChild(strip);

    wrap.appendChild(stripWrap);

    // choose items for this row
    let items = ALL_ITEMS.filter(it => it.category === collection.key);

    // global filter (chip)
    if (activeFilter !== "all") {
      items = items.filter(it => it.category === activeFilter);
    }

    if (items.length === 0) {
      strip.innerHTML = `<div class="emptyRow">No items here yet — coming soon ✨</div>`;
      return wrap;
    }

    const loopItems = items.concat(items);

    loopItems.forEach((it) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";
      tile.innerHTML = `
        <img src="${it.thumb}" alt="${escapeHtml(it.title)}" loading="lazy" />
        <div class="cap">${escapeHtml(it.title)}</div>
      `;
      tile.addEventListener("click", () => openLightbox(it));
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

  function setPaused(stripEl, paused) {
    const s = strips.find(x => x.el === stripEl);
    if (s) s.paused = paused;
  }

  function renderRows() {
    strips.length = 0;
    rowsEl.innerHTML = "";
    COLLECTIONS.forEach(c => rowsEl.appendChild(createRow(c)));

    requestAnimationFrame(() => {
      strips.forEach(s => {
        s.halfWidth = s.el.scrollWidth / 2;
      });
    });
  }

  function tick() {
    strips.forEach(s => {
      if (!s.halfWidth) return;
      if (s.paused) return;

      s.x -= s.speed;

      if (Math.abs(s.x) >= s.halfWidth) {
        s.x = 0;
      }
      s.el.style.transform = `translateX(${s.x}px)`;
    });

    requestAnimationFrame(tick);
  }

  // --------------------
  // Lightbox
  // --------------------
  function openLightbox(it) {
    lightboxImg.src = it.full;
    lightboxCaption.textContent = it.title;
    lightbox.classList.add("show");
    lightbox.setAttribute("aria-hidden", "false");
  }

  function closeLightbox() {
    lightbox.classList.remove("show");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImg.src = "";
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

  // --------------------
  // Utils
  // --------------------
  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function makeId() {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function titleCase(s) {
    return String(s || "").replace(/(^|\s)\S/g, (m) => m.toUpperCase());
  }

  // --------------------
  // Init
  // --------------------
  (async function init() {
    const backendItems = await fetchBackendGallery();

    if (backendItems && backendItems.length) {
      ALL_ITEMS = backendItems;

      // auto-build chips from backend categories
      const set = new Set(backendItems.map(i => i.category).filter(Boolean));
      const extra = Array.from(set)
        .filter(k => k !== "all")
        .map(k => ({ key: k, label: titleCase(k) }));

      // keep "all" first, then your known ones, then extras not already listed
      const known = new Set(CATEGORIES.map(c => c.key));
      CATEGORIES = [
        { key: "all", label: "All" },
        ...CATEGORIES.filter(c => c.key !== "all"),
        ...extra.filter(x => !known.has(x.key))
      ];
    } else {
      ALL_ITEMS = buildFallbackItems();
    }

    renderChips();
    renderRows();
    requestAnimationFrame(tick);
  })();
})();
