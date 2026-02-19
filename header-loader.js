// header-loader.js (FULL SWAP)
(function () {
  const mount = document.getElementById("site-header");
  if (!mount) {
    console.warn("header-loader: #site-header not found on this page.");
    return;
  }

  // Cache-bust so changes to header.html always show immediately
  const url = "./header.html?v=" + Date.now();

  fetch(url, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load header.html");
      return res.text();
    })
    .then((html) => {
      mount.innerHTML = html;

      // Refresh login/logout state once header is in the DOM
      if (window.AMELIAS_SITEAUTH_REFRESH) window.AMELIAS_SITEAUTH_REFRESH();
    })
    .catch((err) => {
      console.warn("Could not load header.html", err);
    });
})();
