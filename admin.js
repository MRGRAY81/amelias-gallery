// Amelia's Gallery — Admin JS (UI only for now)
// Backend hooks will be added later.

(function(){
  const page = document.body?.dataset?.page;
  if (page !== "admin") return;

  const form = document.getElementById("loginForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      // UI-only: fake login success
      alert("✅ Logged in (demo). Backend auth comes next.");
    });
  }
})();
