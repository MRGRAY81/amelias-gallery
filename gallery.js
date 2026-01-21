// Amelia’s Gallery — Gallery Page JS
// Handles gallery grid, carousel rows, and lightbox

(function () {
  const galleryGrid = document.getElementById("galleryGrid");
  const rowsWrap = document.getElementById("galleryRows");

  // Lightbox
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

  if (lightboxClose) {
    lightboxClose.addEventListener("click", closeLightbox);
  }

  if (lightbox) {
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });

  // =========================
  // TEMP GALLERY DATA
  // Replace with Amelia’s real images later
  // =========================
  const galleryItems = [
    {
      title: "Forest Path",
      thumb: "https://picsum.photos/seed/amelia-gal-1/600/450",
      full: "https://picsum.photos/seed/amelia-gal-1/1600/1100",
      row: "Nature"
    },
    {
      title: "Coastal Walk",
      thumb: "https://picsum.photos/seed/amelia-gal-2/600/450",
      full: "https://picsum.photos/seed/amelia-gal-2/1600/1100",
      row: "Nature"
    },
    {
      title: "Mountain View",
      thumb: "https://picsum.photos/seed/amelia-gal-3/600/450",
      full: "https://picsum.photos/seed/amelia-gal-3/1600/1100",
      row: "Nature"
    },
    {
      title: "Lighthouse",
      thumb: "https://picsum.photos/seed/amelia-gal-4/600/450",
      full: "https://picsum.photos/seed/amelia-gal-4/1600/1100",
      row: "Places"
    },
    {
      title: "City Lines",
      thumb: "https://picsum.photos/seed/amelia-gal-5/600/450",
      full: "https://picsum.photos/seed/amelia-gal-5/1600/1100",
      row: "Places"
    },
    {
      title: "Quiet Room",
      thumb: "https://picsum.photos/seed/amelia-gal-6/600/450",
      full: "https://picsum.photos/seed/amelia-gal-6/1600/1100",
      row: "Mood"
    }
  ];

  // =========================
  // GRID VIEW (basic gallery)
  // =========================
  if (galleryGrid) {
    galleryGrid.innerHTML = "";
    galleryItems.forEach(item => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card";
      btn.innerHTML = `
        <img src="${item.thumb}" alt="${escapeHtml(item.title)}" loading="lazy" />
      `;
      btn.addEventListener("click", () =>
        openLightbox(item.full, item.title)
      );
      galleryGrid.appendChild(btn);
    });
  }

  // =========================
  // CAROUSEL ROWS
  // =========================
  if (rowsWrap) {
    rowsWrap.innerHTML = "";

    const rows = {};
    galleryItems.forEach(item => {
      if (!rows[item.row]) rows[item.row] = [];
      rows[item.row].push(item);
    });

    Object.keys(rows).forEach(rowName => {
      const row = document.createElement("section");
      row.className = "row";

      row.innerHTML = `
        <div class="rowhead">
          <h3>${escapeHtml(rowName)}</h3>
          <p class="hint">Swipe to explore</p>
        </div>
        <div class="stripWrap">
          <div class="strip"></div>
        </div>
      `;

      const strip = row.querySelector(".strip");

      rows[rowName].forEach(item => {
        const tile = document.createElement("button");
        tile.type = "button";
        tile.className = "tile";
        tile.innerHTML = `
          <img src="${item.thumb}" alt="${escapeHtml(item.title)}" loading="lazy" />
          <div class="cap">${escapeHtml(item.title)}</div>
        `;
        tile.addEventListener("click", () =>
          openLightbox(item.full, item.title)
        );
        strip.appendChild(tile);
      });

      rowsWrap.appendChild(row);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
