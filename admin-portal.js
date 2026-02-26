// Amelia's Gallery — Admin Portal (SIMPLE WORKING VERSION)

(function () {

  const API = "https://amelias-gallery-ytkr.onrender.com";

  const listEl = document.getElementById("list");
  const detailEl = document.getElementById("detail");
  const statusSelect = document.getElementById("statusSelect");
  const saveBtn = document.getElementById("saveBtn");

  const nameText = document.getElementById("nameText");
  const emailText = document.getElementById("emailText");
  const messageText = document.getElementById("messageText");
  const createdAt = document.getElementById("createdAt");

  let items = [];
  let activeId = null;

  function fmtDate(iso){
    try { return new Date(iso).toLocaleString(); }
    catch { return iso || "—"; }
  }

  function renderList(){
    listEl.innerHTML = "";

    if (!items.length){
      listEl.innerHTML = `<div class="empty">No messages yet.</div>`;
      return;
    }

    items.forEach(msg => {

      const btn = document.createElement("button");
      btn.className = "list-item status-" + msg.status;
      btn.innerHTML = `
        <div><strong>${msg.name || "(no name)"}</strong></div>
        <div class="small muted">${msg.email || ""}</div>
        <div class="small">${(msg.text || "").slice(0,80)}</div>
        <div class="pill ${msg.status}">${msg.status}</div>
      `;

      btn.onclick = () => {
        activeId = msg.id;
        renderDetail(msg);
      };

      listEl.appendChild(btn);
    });
  }

  function renderDetail(msg){
    if (!msg) return;

    detailEl.style.display = "block";

    nameText.textContent = msg.name || "—";
    emailText.textContent = msg.email || "—";
    messageText.textContent = msg.text || "—";
    createdAt.textContent = fmtDate(msg.createdAt);

    statusSelect.value = msg.status || "new";
  }

  async function loadMessages(){
    const res = await fetch(API + "/api/messages");
    const data = await res.json();
    items = data.items || [];
    renderList();
  }

  async function saveStatus(){
    if (!activeId) return;

    const status = statusSelect.value;

    await fetch(API + "/api/messages/" + activeId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

    await loadMessages();
  }

  saveBtn.addEventListener("click", saveStatus);

  loadMessages();

})();
