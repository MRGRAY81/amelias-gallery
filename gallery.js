// Amelia's Gallery — Endless carousel rows + lightbox
(function () {
  const rowsEl = document.getElementById("rows");
  const chipsEl = document.getElementById("chips");

  // Lightbox IDs (must match your HTML)
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxClose = document.getElementById("lightboxClose");

  // --- Data (placeholder): swap these later for Amelia's real art + categories
  const CATEGORIES = [
    { key: "all", label: "All" },
    { key: "characters", label: "Characters" },
    { key: "animals", label: "Animals" },
    { key: "landscapes", label: "Landscapes" },
    { key: "fantasy", label: "Fantasy" },
    { key: "roblox", label: "Roblox Scenes" },
  ];

  // Each row is a "collection" (type order)
  const COLLECTIONS = [
    { key: "characters", title: "Characters", hint: "Never-ending carousel" },
    { key: "animals", title: "Animals", hint: "Click any piece to enlarge" },
    { key: "landscapes", title: "Landscapes", hint: "Loops back around forever" },
    { key: "fantasy", title: "Fantasy Worlds", hint: "Soft gallery vibe" },
    { key: "roblox", title: "Roblox Scenes", hint: "Great for commissions" },
  ];

  // Placeholder art items (Picsum). Replace with local images later.
  // Use {thumb:"./images/xxx.jpg", full:"./images/xxx.jpg"} when ready.
  function makeItemsFor(key, count = 10) {
    return Array.from({ length: count }).map((_, i) => {
      const n = i + 1;
      return {
        id: `${key}-${n}`,
        title: `${CATEGORIES.find(c => c.key === key)?.label || "Artwork"} #${n}`,
        thumb: `https://picsum.photos/seed/amelia-${key}-${n}/700/500`,
        full: `https://picsum.photos/seed/amelia-${key}-${n}/1600/1100`,
        category: key
      };
    });
  }

  const ALL_ITEMS = COLLECTIONS.flatMap(c => makeItemsFor(c.key, 12));

  // --- Chips (filter)
  let activeFilter = "all";

  function renderChips() {
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

  // --- Endless strip engine
  const strips = []; // keep refs for animation loop

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

    // choose items
    let items = ALL_ITEMS.filter(it => it.category === collection.key);
    if (activeFilter !== "all") {
      items = items.filter(it => it.category === activeFilter);
    }

    // If filter hides everything, show an empty friendly state
    if (items.length === 0) {
      strip.innerHTML = `<div style="padding:18px;color:rgba(42,37,48,.62);font-weight:900;">No items in this category yet — coming soon ✨</div>`;
      return wrap;
    }

    // We duplicate items to simulate endless loop
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

    // Animation state
    const speed = 0.35 + Math.random() * 0.35; // slightly different per row
    strips.push({
      el: strip,
      wrap: stripWrap,
      x: 0,
      speed,
      paused: false,
      // total width half (first set) - computed later
      halfWidth: 0
    });

    // Pause on hover / touch hold
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

    // Compute half-widths after DOM paints
    requestAnimationFrame(() => {
      strips.forEach(s => {
        // half width = width of first item set (since we duplicated)
        s.halfWidth = s.el.scrollWidth / 2;
      });
    });
  }

  // Animation loop
  function tick() {
    strips.forEach(s => {
      if (!s.halfWidth) return;
      if (s.paused) return;

      s.x -= s.speed;

      // When moved past half, wrap around seamlessly
      if (Math.abs(s.x) >= s.halfWidth) {
        s.x = 0;
      }
      s.el.style.transform = `translateX(${s.x}px)`;
    });

    requestAnimationFrame(tick);
  }

  // --- Lightbox
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

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Init
  renderChips();
  renderRows();
  requestAnimationFrame(tick);
})();
