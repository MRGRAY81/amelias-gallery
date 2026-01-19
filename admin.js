// Amelia's Gallery — Admin client
// Requires backend routes:
// POST /auth/login  -> { token }
// GET  /me          -> { ok:true, email }
// GET  /gallery     -> { items:[...] }
// POST /upload      -> multipart/form-data (file, title, category)

const API = "https://amelias-gallery-backend.onrender.com";
const TOKEN_KEY = "amelia_admin_token_v1";

const $ = (id) => document.getElementById(id);

const loginPanel = $("loginPanel");
const dashPanel = $("dashPanel");

const loginForm = $("loginForm");
const loginStatus = $("loginStatus");

const logoutBtn = $("logoutBtn");
const logoutBtn2 = $("logoutBtn2");

const kpiAuth = $("kpiAuth");
const kpiCount = $("kpiCount");
const kpiApi = $("kpiApi");

const fileInput = $("file");
const titleInput = $("title");
const categoryInput = $("category");
const uploadBtn = $("uploadBtn");
const uploadStatus = $("uploadStatus");

const uploadList = $("uploadList");
const refreshBtn = $("refreshBtn");

function setStatus(el, msg, ok=true){
  el.textContent = msg || "";
  el.classList.remove("ok","bad");
  if (!msg) return;
  el.classList.add(ok ? "ok" : "bad");
}

function getToken(){
  return localStorage.getItem(TOKEN_KEY);
}
function setToken(t){
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch(path, opts={}){
  const token = getToken();
  const headers = new Headers(opts.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API}${path}`, { ...opts, headers });
}

function showDash(){
  loginPanel.classList.add("hide");
  dashPanel.classList.remove("hide");
  logoutBtn.classList.add("hide");
  setStatus(loginStatus, "");
}

function showLogin(){
  dashPanel.classList.add("hide");
  loginPanel.classList.remove("hide");
  logoutBtn.classList.remove("hide");
}

async function checkBackend(){
  try{
    const r = await fetch(`${API}/`);
    const j = await r.json();
    kpiApi.textContent = j?.ok ? "Online" : "Unknown";
  }catch{
    kpiApi.textContent = "Offline";
  }
}

async function whoAmI(){
  try{
    const r = await apiFetch("/me");
    if (!r.ok) throw new Error("not authed");
    const j = await r.json();
    kpiAuth.textContent = j?.email ? "Logged in" : "Logged in";
    return true;
  }catch{
    kpiAuth.textContent = "Logged out";
    return false;
  }
}

function fmtTime(ts){
  try{
    const d = new Date(ts);
    return d.toLocaleString();
  }catch{ return ""; }
}

function renderList(items){
  uploadList.innerHTML = "";
  if (!items || !items.length){
    uploadList.innerHTML = `<div class="pill">No uploads yet.</div>`;
    return;
  }

  items.slice(0, 12).forEach(it => {
    const row = document.createElement("div");
    row.className = "item";

    const img = document.createElement("img");
    img.className = "thumb";
    img.src = it.thumbUrl || it.url || it.src || "";
    img.alt = it.title || "Artwork";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `
      <div class="name">${it.title || "Untitled"}</div>
      <div class="sub">${(it.category || "uncategorised")} • ${it.createdAt ? fmtTime(it.createdAt) : ""}</div>
    `;

    const link = document.createElement("a");
    link.className = "pill";
    link.href = it.url || it.src || it.fullUrl || "#";
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Open";

    row.appendChild(img);
    row.appendChild(meta);
    row.appendChild(link);

    uploadList.appendChild(row);
  });

  kpiCount.textContent = String(items.length);
}

async function loadGallery(){
  try{
    const r = await fetch(`${API}/gallery`);
    if (!r.ok) throw new Error("gallery fetch failed");
    const j = await r.json();
    const items = j.items || [];
    renderList(items);
  }catch(e){
    renderList([]);
  }
}

async function login(email, password){
  const r = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!r.ok){
    const text = await r.text();
    throw new Error(text || "Login failed");
  }
  const j = await r.json();
  if (!j.token) throw new Error("No token returned");
  setToken(j.token);
}

async function uploadImage(file, title, category){
  // client-side sanity checks
  const allowed = ["image/png","image/jpeg","image/webp"];
  if (!allowed.includes(file.type)) throw new Error("Only PNG/JPG/WEBP allowed.");
  if (file.size > 8 * 1024 * 1024) throw new Error("File too big. Max 8MB.");

  const fd = new FormData();
  fd.append("file", file);
  fd.append("title", title || "");
  fd.append("category", category || "other");

  const r = await apiFetch("/upload", { method:"POST", body: fd });
  if (!r.ok){
    const text = await r.text();
    throw new Error(text || "Upload failed");
  }
  return r.json();
}

function doLogout(){
  setToken(null);
  showLogin();
  kpiAuth.textContent = "Logged out";
  setStatus(uploadStatus, "");
  setStatus(loginStatus, "Logged out.", true);
}

logoutBtn?.addEventListener("click", doLogout);
logoutBtn2?.addEventListener("click", doLogout);

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus(loginStatus, "Logging in… (backend may take up to a minute on free tier)", true);

  const email = $("email").value.trim();
  const password = $("password").value;

  try{
    await login(email, password);
    await whoAmI();
    showDash();
    await loadGallery();
    setStatus(loginStatus, "");
  }catch(err){
    setToken(null);
    setStatus(loginStatus, "Login failed. Check email/password (or backend waking up).", false);
  }
});

uploadBtn?.addEventListener("click", async () => {
  setStatus(uploadStatus, "Uploading…", true);

  const file = fileInput.files?.[0];
  const title = titleInput.value.trim();
  const category = categoryInput.value;

  if (!file){
    setStatus(uploadStatus, "Choose a file first.", false);
    return;
  }

  try{
    await uploadImage(file, title, category);
    setStatus(uploadStatus, "Uploaded ✅", true);
    fileInput.value = "";
    titleInput.value = "";
    categoryInput.value = "featured";
    await loadGallery();
  }catch(err){
    setStatus(uploadStatus, err?.message || "Upload failed.", false);
  }
});

refreshBtn?.addEventListener("click", async () => {
  await loadGallery();
});

(async function init(){
  await checkBackend();

  const token = getToken();
  if (!token){
    showLogin();
    return;
  }

  // If token exists, try to validate and show dashboard
  const ok = await whoAmI();
  if (ok){
    showDash();
    await loadGallery();
  }else{
    setToken(null);
    showLogin();
  }
})();
