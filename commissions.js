// Amelia's Gallery — Commissions
// Backend targets (we'll implement in backend step):
// GET  /           -> { ok:true }
// POST /commissions -> accepts multipart/form-data OR json (we'll do multipart)

const API = "https://amelias-gallery-backend.onrender.com";

const $ = (id) => document.getElementById(id);

const form = $("commissionForm");
const statusEl = $("formStatus");
const backendPill = $("backendState");

const refs = $("refs");
const thumbs = $("thumbs");
const clearFiles = $("clearFiles");

function setStatus(msg, ok=true){
  statusEl.textContent = msg || "";
  statusEl.classList.remove("ok","bad");
  if (!msg) return;
  statusEl.classList.add(ok ? "ok" : "bad");
}

async function pingBackend(){
  try{
    const r = await fetch(`${API}/`);
    const j = await r.json();
    backendPill.textContent = j?.ok ? "Backend: online" : "Backend: unknown";
  }catch{
    backendPill.textContent = "Backend: offline";
  }
}

function validateFiles(files){
  const allowed = ["image/png","image/jpeg","image/webp"];
  const list = Array.from(files || []);

  if (list.length > 3) throw new Error("Max 3 reference images.");
  list.forEach(f => {
    if (!allowed.includes(f.type)) throw new Error("Only PNG/JPG/WEBP allowed.");
    if (f.size > 8 * 1024 * 1024) throw new Error("Each file must be under 8MB.");
  });

  return list;
}

function renderThumbs(files){
  thumbs.innerHTML = "";
  const list = Array.from(files || []);
  if (!list.length) return;

  list.forEach(file => {
    const img = document.createElement("img");
    img.alt = "Reference";
    img.src = URL.createObjectURL(file);
    thumbs.appendChild(img);
  });
}

refs.addEventListener("change", () => {
  try{
    const list = validateFiles(refs.files);
    renderThumbs(list);
    setStatus("", true);
  }catch(e){
    refs.value = "";
    thumbs.innerHTML = "";
    setStatus(e.message || "Invalid files.", false);
  }
});

clearFiles.addEventListener("click", () => {
  refs.value = "";
  thumbs.innerHTML = "";
  setStatus("", true);
});

async function submitCommission(payload){
  // We send as multipart so we can attach images
  const fd = new FormData();
  fd.append("name", payload.name);
  fd.append("email", payload.email);
  fd.append("type", payload.type);
  fd.append("size", payload.size);
  fd.append("brief", payload.brief);

  payload.files.forEach(f => fd.append("refs", f));

  const r = await fetch(`${API}/commissions`, {
    method: "POST",
    body: fd
  });

  if (!r.ok){
    const text = await r.text();
    throw new Error(text || "Failed to send request.");
  }
  return r.json();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("Sending… (backend may take up to a minute on free tier)", true);

  const name = $("name").value.trim();
  const email = $("email").value.trim();
  const type = $("type").value;
  const size = $("size").value;
  const brief = $("brief").value.trim();

  try{
    const files = validateFiles(refs.files);
    await submitCommission({ name, email, type, size, brief, files });
    setStatus("Request sent ✅ We’ll reply by email soon.", true);
    form.reset();
    thumbs.innerHTML = "";
  }catch(err){
    setStatus(err?.message || "Could not send request.", false);
  }
});

pingBackend();
