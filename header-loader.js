(function () {
  const mount = document.getElementById("site-header");
  if (!mount) return;

  fetch("./header.html", { cache: "no-store" })
    .then((res) => res.text())
    .then((html) => {
      mount.innerHTML = html;
    })
    .catch(() => {
      // If header fails, don't break the page
      mount.innerHTML = "";
    });
})();
