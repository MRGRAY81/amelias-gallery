(function () {
  const rowsEl = document.getElementById("rows");
  if (!rowsEl) return;

  // TEMP demo data (replace later with real items / backend)
  const demo = [
    {
      title: "Landscapes",
      hint: "Swipe to browse",
      items: [
        { title: "Mountain", src: "https://picsum.photos/seed/a1/900/700" },
        { title: "Sea", src: "https://picsum.photos/seed/a2/900/700" },
        { title: "Forest", src: "https://picsum.photos/seed/a3/900/700" },
        { title: "Sky", src: "https://picsum.photos/seed/a4/900/700" },
      ],
    },
    {
      title: "City & Places",
      hint: "Swipe to browse",
      items: [
        { title: "Street", src: "https://picsum.photos/seed/b1/900/700" },
        { title: "Buildings", src: "https://picsum.photos/seed/b2/900/700" },
        { title: "Window", src: "https://picsum.photos/seed/b3/900/700" },
        { title: "Cafe", src: "https://picsum.photos/seed/b4/900/700" },
      ],
    },
  ];

  rowsEl.innerHTML = demo.map(renderRow).join("");

  function renderRow(row) {
    const tiles = row.items
      .map(
        (it) => `
        <button class="tile" type="button" data-src="${it.src}" data-title="${escapeHtml(it.title)}">
          <img src="${it.src}" alt="${escapeHtml(it.title)}" loading="lazy"/>
          <div class="cap">${escapeHtml(it.title)}</div>
        </button>
      `
      )
      .join("");

    return `
      <section class="row">
        <div class="rowhead">
          <h3>${escapeHtml(row.title)}</h3>
          <p class="hint">${escapeHtml(row.hint || "")}</p>
        </div>
        <div class="stripWrap">
          <div class="strip">${tiles}</div>
        </div>
      </section>
    `;
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
