// Amelia's Gallery — Commissions (FULL SWAP)
// Sends commission requests into backend messages:
// POST /api/messages
// Health: GET /api/health

const API = "https://amelias-gallery-ytkr.onrender.com";

const $ = (id) => document.getElementById(id);

const form = $("commissionForm");
const statusEl = $("formStatus");
const backendPill = $("backendState");

const refs = $("refs");
const thumbs = $("thumbs");
const clearFiles = $("clearFiles");

function setStatus(msg, ok = true) {
  if (!statusEl) return;
  statusEl.textContent = msg || "";
  statusEl.classList.remove("ok", "bad");
  if (!msg) return;
  statusEl.classList.add(ok ? "ok" : "bad");
}

async function pingBackend() {
  if (!backendPill) return;
  try {
    const r = await fetch(`${API}/api/health`);
    const j = await r.json();
    backendPill.textContent = j?.ok ? "Backend: online" : "Backend: unknown";
  } catch {
    backendPill.textContent = "Backend: offline";
  }
}

function validateFiles(files) {
  const allowed = ["image/png", "image/jpeg", "image/webp"];
  const list = Array.from(files || []);

  if (list.length > 3) throw new Error("Max 3 reference images.");
  list.forEach((f) => {
    if (!allowed.includes(f.type)) throw new Error("Only PNG/JPG/WEBP allowed.");
    if (f.size > 8 * 1024 * 1024) throw new Error("Each file must be under 8MB.");
  });

  return list;
}

function renderThumbs(files) {
  if (!thumbs) return;
  thumbs.innerHTML = "";
  const list = Array.from(files || []);
  if (!list.length) return;

  list.forEach((file) => {
    const img = document.createElement("img");
    img.alt = "Reference";
    img.src = URL.createObjectURL(file);
    thumbs.appendChild(img);
  });
}

if (refs) {
  refs.addEventListener("change", () => {
    try {
      const list = validateFiles(refs.files);
      renderThumbs(list);
      setStatus("", true);
    } catch (e) {
      refs.value = "";
      if (thumbs) thumbs.innerHTML = "";
      setStatus(e.message || "Invalid files.", false);
    }
  });
}

if (clearFiles) {
  clearFiles.addEventListener("click", () => {
    if (refs) refs.value = "";
    if (thumbs) thumbs.innerHTML = "";
    setStatus("", true);
  });
}

async function submitCommission(payload) {
  // For now: store as a message (fastest working integration)
  const text =
    `Commission Request\n` +
    `Type: ${payload.type}\n` +
    `Size: ${payload.size}\n\n` +
    `Brief:\n${payload.brief}\n\n` +
    `Refs selected: ${payload.files?.length || 0} (uploads coming next)`;

  const r = await fetch(`${API}/api/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      text,
    }),
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(j.error || "Failed to send request.");
  return j;
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("Sending… (Render free tier may take a moment)", true);

    const name = ($("name")?.value || "").trim();
    const email = ($("email")?.value || "").trim();
    const type = $("type")?.value || "";
    const size = $("size")?.value || "";
    const brief = ($("brief")?.value || "").trim();

    try {
      const files = validateFiles(refs?.files);
      await submitCommission({ name, email, type, size, brief, files });
      setStatus("Request sent ✅ Amelia will see it in her messages.", true);
      form.reset();
      if (thumbs) thumbs.innerHTML = "";
    } catch (err) {
      setStatus(err?.message || "Could not send request.", false);
    }
  });
}

pingBackend();
