// Amelia’s Gallery — Admin (UI + local data)

(function(){
  if (document.body.dataset.page !== "admin") return;

  const list = document.getElementById("orderList");
  const KEY = "amelias_commission_requests";

  function render(){
    const data = JSON.parse(localStorage.getItem(KEY) || "[]");
    list.innerHTML = "";

    if (!data.length){
      list.innerHTML = "<p>No commission requests yet.</p>";
      return;
    }

    data.forEach(item => {
      const el = document.createElement("div");
      el.className = "order";
      el.innerHTML = `
        <span>${item.name} — ${item.type}</span>
        <span>${item.status || "New"}</span>
      `;
      list.appendChild(el);
    });
  }

  render();
})();
