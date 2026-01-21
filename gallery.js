// Amelia’s Gallery — Carousel Rows (auto-loop + swipe/drag friendly)
// Requires in gallery.html:
// <div class="chips" id="chipBar"></div>
// <div class="rows" id="galleryRows"></div>

(function () {
  const chipBar = document.getElementById("chipBar");
  const galleryRows = document.getElementById("galleryRows");
  if (!galleryRows) return;

  // ===== Lightbox =====
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxClose = document.getElementById("lightboxClose");

  function openLightbox(src, caption) {
    if (!lightbox) return;
    lightboxImg.src = src;
    lightboxCaption.textContent = caption || "";
    lightbox.classList.add("show");
    lightbox.setAttribute("aria-hidden", "false");
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("show");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImg.src = "";
    lightboxCaption.textContent = "";
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

  // ===== Data (placeholder categories) =====
  const ROWS = [
    {
      key: "land",
      title: "Landscapes",
      hint: "Swipe • loops forever",
      reverse: false,
      items: [
        { src: "https://picsum.photos/id/1018/800/600", title: "Golden Field" },
        { src: "https://picsum.photos/id/1025/800/600", title: "River Valley" },
        { src: "https://picsum.photos/id/1039/800/600", title: "Blue Hills" },
        { src: "https://picsum.photos/id/1056/800/600", title: "Coastal Light" },
        { src: "https://picsum.photos/id/1069/800/600", title: "Autumn Path" }
      ]
    },
    {
      key: "chars",
      title: "Characters",
      hint: "Swipe • loops forever",
      reverse: true,
      items: [
        { src: "https://picsum.photos/id/64/800/600", title: "Happy Hero" },
        { src: "https://picsum.photos/id/433/800/600", title: "Mystery Friend" },
        { src: "https://picsum.photos/id/823/800/600", title: "Cartoon Style" },
        { src: "https://picsum.photos/id/839/800/600", title: "Portrait Study" }
      ]
    },
    {
      key: "pets",
      title: "Cute Animals",
      hint: "Swipe • loops forever",
      reverse: false,
      items: [
        { src: "https://picsum.photos/id/237/800/600", title: "Doggo" },
        { src: "https://picsum.photos/id/219/800/600", title: "Fluffy Friend" },
        { src: "https://picsum.photos/id/582/800/600", title: "Forest Pal" },
        { src: "https://picsum.photos/id/593/800/600", title: "Little Explorer" }
      ]
    }
  ];

  // ===== Chips (filter) =====
  let activeKey = "all";

  function buildChips() {
    if (!chipBar) return;
    const all = [{ key: "all", title: "All" }, ...ROWS.map(r => ({ key: r.key, title: r.title }))];

    chipBar.innerHTML = "";
    all.forEach((c) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chipbtn" + (c.key === activeKey ? " active" : "");
      btn.textContent = c.title;
      btn.addEventListener("click", () => {
        activeKey = c.key;
        buildChips();
        renderRows();
      });
      chipBar.appendChild(btn);
    });
  }

  // ===== Build a single row (matches your CSS classes) =====
  function buildRow(row, index) {
    const rowWrap = document.createElement("div");
    rowWrap.className = "row";

    const head = document.createElement("div");
    head.className = "rowhead";
    head.innerHTML = `
      <h3>${row.title}</h3>
      <p class="hint">${row.hint || "Swipe"}</p>
    `;

    const stripWrap = document.createElement("div");
    stripWrap.className = "stripWrap";

    const strip = document.createElement("div");
    strip.className = "strip";
    strip.dataset.reverse = row.reverse ? "1" : "0";

    // Duplicate items so it can loop
    const items = [...row.items, ...row.items, ...row.items];
    items.forEach((item) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";
      tile.innerHTML = `
        <img src="${item.src}" alt="${escapeHtml(item.title)}" loading="lazy">
        <div class="cap">${escapeHtml(item.title)}</div>
      `;
      tile.addEventListener("click", () => openLightbox(item.src, item.title));
      strip.appendChild(tile);
    });

    stripWrap.appendChild(strip);
    rowWrap.appendChild(head);
    rowWrap.appendChild(stripWrap);

    // Start the auto-loop animation (requestAnimationFrame based)
    startAutoLoop(strip, stripWrap, 0.35 + index * 0.06, row.reverse);

    // Enable drag/swipe control
    enableDrag(stripWrap);

    return rowWrap;
  }

  function renderRows() {
    galleryRows.innerHTML = "";

    const list = activeKey === "all" ? ROWS : ROWS.filter(r => r.key === activeKey);
    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "emptyRow";
      empty.textContent = "Nothing here yet.";
      galleryRows.appendChild(empty);
      return;
    }

    list.forEach((row, i) => galleryRows.appendChild(buildRow(row, i)));
  }

  // ===== Auto loop (smooth) =====
  function startAutoLoop(strip, wrap, speed, reverse) {
    let x = 0;
    let rafId = null;
    let paused = false;

    const pause = () => { paused = true; };
    const play = () => { paused = false; };

    // pause on hover / touch
    wrap.addEventListener("mouseenter", pause);
    wrap.addEventListener("mouseleave", play);
    wrap.addEventListener("touchstart", pause, { passive: true });
    wrap.addEventListener("touchend", play, { passive: true });

    function tick() {
      if (!paused) {
        x += (reverse ? speed : -speed);

        // width of one "set" ~ a third of the strip (because we tripled)
        const oneSet = strip.scrollWidth / 3;

        if (x <= -oneSet) x += oneSet;
        if (x >= 0) x -= oneSet;

        strip.style.transform = `translateX(${x}px)`;
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    // Safety: stop if removed
    const obs = new MutationObserver(() => {
      if (!document.body.contains(strip)) {
        cancelAnimationFrame(rafId);
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  // ===== Drag / Swipe =====
  function enableDrag(wrap) {
    let isDown = false;
    let startX = 0;
    let startScroll = 0;

    // We'll drag by adjusting scrollLeft, while strip transform still runs.
    // So: on drag, we temporarily disable pointer events on tiles to avoid mis-clicks.
    const strip = wrap.querySelector(".strip");
    if (!strip) return;

    const setTilePointer = (v) => {
      strip.querySelectorAll(".tile").forEach(t => t.style.pointerEvents = v);
    };

    wrap.addEventListener("pointerdown", (e) => {
      isDown = true;
      wrap.setPointerCapture(e.pointerId);
      startX = e.clientX;
      startScroll = wrap.scrollLeft;
      setTilePointer("none");
    });

    wrap.addEventListener("pointermove", (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      wrap.scrollLeft = startScroll - dx;
    });

    function end(e) {
      if (!isDown) return;
      isDown = false;
      try { wrap.releasePointerCapture(e.pointerId); } catch {}
      setTilePointer("auto");
    }

    wrap.addEventListener("pointerup", end);
    wrap.addEventListener("pointercancel", end);

    // Make wheel scroll horizontal too (trackpad/mouse)
    wrap.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        wrap.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Boot
  buildChips();
  renderRows();
})();
