// header-loader.js
(function () {
  const mount = document.getElementById("site-header");
  if (!mount) return;

  fetch("./header.html")
    .then((res) => res.text())
    .then((html) => {
      mount.innerHTML = html;

      // Refresh login/logout state once header is in the DOM
      if (window.AMELIAS_SITEAUTH_REFRESH) {
        window.AMELIAS_SITEAUTH_REFRESH();
      }
    })
    .catch(() => {
      console.warn("Could not load header.html");
    });
})();
