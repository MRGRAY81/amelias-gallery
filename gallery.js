// Amelia’s Gallery — Carousel Rows + Category Chips + Lightbox
(function () {
  const chipBar = document.getElementById("chipBar");
  const galleryRows = document.getElementById("galleryRows");
  if (!galleryRows) return;

  /* -----------------------
     LIGHTBOX
  ------------------------ */
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

  /* -----------------------
     DATA (placeholder)
     Swap these later for Amelia’s real images.
     You can use local files like "./images/art/01.jpg"
  ------------------------ */
  const rows = [
    {
      title: "Landscapes",
      reverse: false,
      items: [
        { src: "https://picsum.photos/id/1018/800/600", title: "Golden Field" },
        { src: "https://picsum.photos/id/1025/800/600", title: "River Valley" },
        { src: "https://picsum.photos/id/1039/800/600", title: "Blue Hills" },
        { src: "https://picsum.photos/id/1056/800/600", title: "Coastal Light" },
        { src: "https://picsum.photos/id/1069/800/600", title: "Autumn Path" },
      ],
    },
    {
      title: "Characters",
      reverse: true,
      items: [
        { src: "https://picsum.photos/id/64/800/600", title: "Happy Hero" },
        { src: "https://picsum.photos/id/433/800/600", title: "Mystery Friend" },
        { src: "https://picsum.photos/id/823/800/600", title: "Cartoon Style" },
        { src: "https://picsum.photos/id/839/800/600", title: "Portrait Study" },
      ],
    },
    {
      title: "Cute Animals",
      reverse: false,
      items: [
        { src: "https://picsum.photos/id/237/800/600", title: "Doggo" },
        { src: "https://picsum.photos/id/219/800/600", title: "Fluffy Friend" },
        { src: "https://picsum.photos/id/582/800/600", title: "Forest Pal" },
        { src: "https://picsum.photos/id/593/800/600", title: "Little Explorer" },
      ],
    },
  ];

  /* -----------------------
     CATEGORY CHIPS
     (Shows All + each row title)
  ------------------------ */
  let active = "All";

  function renderChips() {
    if (!chipBar) return;

    const cats = ["All", ...rows.map((r) => r.title)];
    chipBar.innerHTML = "";

    cats.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chipbtn" + (cat === active ? " active" : "");
      btn.textContent = cat;

      btn.addEventListener("click", () => {
        active = cat;
        renderChips();
        renderRows();
      });

      chipBar.appendChild(btn);
    });
  }

  /* -----------------------
     ROW BUILDER
     Expects CSS classes you already have:
     .row, .rowhead, .stripWrap, .strip, .tile, .cap
  ------------------------ */
  function buildRow(row, index) {
    const wrap = document.createElement("div");
    wrap.className = "row";

    const head = document.createElement("div");
    head.className = "rowhead";
    head.innerHTML = `
      <h3>${escapeHtml(row.title)}</h3>
      <p class="hint">Swipe • loops forever</p>
    `;

    const stripWrap = document.createElement("div");
    stripWrap.className = "stripWrap";

    const strip = document.createElement("div");
    strip.className = "strip";

    // Duplicate items to give a “looping” feel
    const loopItems = [...row.items, ...row.items, ...row.items];

    loopItems.forEach((item) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";
      tile.innerHTML = `
        <img src="${item.src}" alt="${escapeHtml(item.title)}" loading="lazy" />
        <div class="cap">${escapeHtml(item.title)}</div>
      `;
      tile.addEventListener("click", () => openLightbox(item.src, item.title));
      strip.appendChild(tile);
    });

    // Auto-scroll animation (JS driven)
    // We animate translateX and wrap around.
    let x = 0;
    const speed = 0.35 + index * 0.05; // subtle variation per row
    const dir = row.reverse ? 1 : -1;

    function tick() {
      // If user prefers reduced motion, don’t animate
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      x += speed * dir;
      strip.style.transform = `translateX(${x}px)`;

      // Reset when far enough (keeps it feeling infinite)
      // Using a large reset threshold to avoid flicker.
      const resetAt = 260 * row.items.length; // tile width * original count
      if (dir < 0 && x < -resetAt) x = 0;
      if (dir > 0 && x > resetAt) x = 0;

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    stripWrap.appendChild(strip);
    wrap.appendChild(head);
    wrap.appendChild(stripWrap);

    return wrap;
  }

  function renderRows() {
    galleryRows.innerHTML = "";

    const list = active === "All" ? rows : rows.filter((r) => r.title === active);

    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "emptyRow";
      empty.textContent = "No artwork in this category yet ✨";
      galleryRows.appendChild(empty);
      return;
    }

    list.forEach((row, i) => galleryRows.appendChild(buildRow(row, i)));
  }

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
})();
