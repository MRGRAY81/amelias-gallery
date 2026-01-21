(function () {
  const rowsEl = document.getElementById("rows");
  if (!rowsEl) return;

  const chipBar = document.getElementById("chipBar");

  // Lightbox elements (shared IDs)
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxClose = document.getElementById("lightboxClose");

  function openLightbox(src, caption) {
    lightboxImg.src = src;
    lightboxCaption.textContent = caption || "";
    lightbox.classList.add("show");
    lightbox.setAttribute("aria-hidden", "false");
  }

  function closeLightbox() {
    lightbox.classList.remove("show");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImg.src = "";
    lightboxCaption.textContent = "";
  }

  lightboxClose?.addEventListener("click", closeLightbox);
  lightbox?.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });

  // TEMP demo rows (swap later to Amelia’s real sets or your backend)
  const rows = [
    {
      key: "all",
      title: "All Artworks",
      hint: "Swipe to browse",
      items: seeds("all", 10)
    },
    {
      key: "landscapes",
      title: "Landscapes",
      hint: "Swipe to browse",
      items: seeds("land", 10)
    },
    {
      key: "animals",
      title: "Animals",
      hint: "Swipe to browse",
      items: seeds("pets", 10)
    },
    {
      key: "characters",
      title: "Characters",
      hint: "Swipe to browse",
      items: seeds("chars", 10)
    }
  ];

  // Chips filter
  if (chipBar) {
    chipBar.innerHTML = rows.map((r, i) => (
      `<button class="chipbtn ${i === 0 ? "active" : ""}" type="button" data-key="${r.key}">${escapeHtml(r.title)}</button>`
    )).join("");

    chipBar.addEventListener("click", (e) => {
      const btn = e.target.closest(".chipbtn");
      if (!btn) return;
      const key = btn.getAttribute("data-key");

      chipBar.querySelectorAll(".chipbtn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      render(key);
    });
  }

  function render(filterKey) {
    const list = filterKey && filterKey !== "all"
      ? rows.filter(r => r.key === filterKey)
      : rows;

    rowsEl.innerHTML = list.map(renderRow).join("");

    // tile click → lightbox
