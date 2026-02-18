(function () {
  const grid = document.getElementById("homeGrid");
  if (!grid) return;

  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxClose = document.getElementById("lightboxClose");

  if (!lightbox || !lightboxImg || !lightboxCaption || !lightboxClose) {
    console.warn("Lightbox elements missing from page.");
    return;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

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

  lightboxClose.addEventListener("click", closeLightbox);

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });

  const featured = [
    { title: "Featured #1", thumb: "https://picsum.photos/seed/amelia-feature-1/800/600", full: "https://picsum.photos/seed/amelia-feature-1/1600/1100" },
    { title: "Featured #2", thumb: "https://picsum.photos/seed/amelia-feature-2/800/600", full: "https://picsum.photos/seed/amelia-feature-2/1600/1100" },
    { title: "Featured #3", thumb: "https://picsum.photos/seed/amelia-feature-3/800/600", full: "https://picsum.photos/seed/amelia-feature-3/1600/1100" },
    { title: "Featured #4", thumb: "https://picsum.photos/seed/amelia-feature-4/800/600", full: "https://picsum.photos/seed/amelia-feature-4/1600/1100" },
    { title: "Featured #5", thumb: "https://picsum.photos/seed/amelia-feature-5/800/600", full: "https://picsum.photos/seed/amelia-feature-5/1600/1100" },
    { title: "Featured #6", thumb: "https://picsum.photos/seed/amelia-feature-6/800/600", full: "https://picsum.photos/seed/amelia-feature-6/1600/1100" }
  ];

  grid.innerHTML = "";

  featured.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card";
    btn.setAttribute("aria-label", `Open ${item.title}`);
    btn.innerHTML = `<img src="${item.thumb}" alt="${escapeHtml(item.title)}" loading="lazy" />`;

    btn.addEventListener("click", () => openLightbox(item.full, item.title));
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") openLightbox(item.full, item.title);
    });

    grid.appendChild(btn);
  });
})();
