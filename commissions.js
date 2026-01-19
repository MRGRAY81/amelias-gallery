// Amelia's Gallery — Commissions form + safe image pre-check + preview
(function () {
  const form = document.getElementById("commissionForm");
  const status = document.getElementById("status");
  const fileInput = document.getElementById("refFile");
  const preview = document.getElementById("preview");
  const previewImg = document.getElementById("previewImg");
  const filemeta = document.getElementById("filemeta");
  const clearBtn = document.getElementById("clearBtn");
  const copyEmailBtn = document.getElementById("copyEmailBtn");
  const contactEmail = document.getElementById("contactEmail");

  // Upload constraints (front-end checks; real virus scan is backend later)
  const MAX_BYTES = 10 * 1024 * 1024; // 10MB
  const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

  let selectedFile = null;
  let selectedFileDataUrl = null;

  function setStatus(msg, kind) {
    status.textContent = msg || "";
    status.className = "status" + (kind ? ` ${kind}` : "");
  }

  function resetUploadUI() {
    selectedFile = null;
    selectedFileDataUrl = null;
    if (fileInput) fileInput.value = "";
    if (preview) {
      preview.setAttribute("aria-hidden", "true");
      preview.style.display = "none";
    }
    if (filemeta) {
      filemeta.textContent = "";
      filemeta.setAttribute("aria-hidden", "true");
    }
  }

  function humanSize(bytes) {
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let n = bytes;
    while (n >= 1024 && i < units.length - 1) {
      n /= 1024;
      i++;
    }
    return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", async () => {
      setStatus("");

      const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
      if (!file) {
        resetUploadUI();
        return;
      }

      // basic type checks
      if (!ALLOWED.includes(file.type)) {
        resetUploadUI();
        setStatus("Please upload a JPG, PNG, or WebP image only.", "bad");
        return;
      }

      // size checks
      if (file.size > MAX_BYTES) {
        resetUploadUI();
        setStatus("That file is too large. Please keep uploads under 10MB.", "bad");
        return;
      }

      // Create preview (in-browser only)
      selectedFile = file;
      selectedFileDataUrl = await fileToDataUrl(file);

      previewImg.src = selectedFileDataUrl;
      preview.style.display = "block";
      preview.setAttribute("aria-hidden", "false");

      filemeta.textContent = `Attached: ${file.name} • ${humanSize(file.size)}`;
      filemeta.setAttribute("aria-hidden", "false");

      setStatus("Image attached (will be scanned server-side once backend is live).", "ok");
    });
  }

  if (copyEmailBtn && contactEmail) {
    copyEmailBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(contactEmail.textContent.trim());
        setStatus("Email copied ✅", "ok");
      } catch {
        setStatus("Couldn’t copy automatically — you can copy the email manually.", "bad");
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      form.reset();
      resetUploadUI();
      setStatus("");
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      setStatus("");

      const fd = new FormData(form);
      const payload = {
        name: String(fd.get("name") || "").trim(),
        email: String(fd.get("email") || "").trim(),
        type: String(fd.get("type") || "").trim(),
        deadline: String(fd.get("deadline") || "").trim(),
        details: String(fd.get("details") || "").trim(),
        // attach file data for backend later:
        attachment: selectedFile
          ? {
              filename: selectedFile.name,
              mime: selectedFile.type,
              size: selectedFile.size,
              dataUrl: selectedFileDataUrl // backend will decode + scan
            }
          : null
      };

      // Basic validation
      if (!payload.name || !payload.email || !payload.type) {
        setStatus("Please fill in Name, Email, and Commission type.", "bad");
        return;
      }

      // Static-site behavior for now (no backend):
      // - We store the request in localStorage so Admin can read it later (temporary)
      // - When backend goes live, we swap this to fetch('/api/commissions', { ... })
      const key = "amelias_commission_requests";
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.unshift({
        ...payload,
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        status: "New Request",
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(key, JSON.stringify(existing));

      setStatus("Sent ✅ (Saved locally for now — backend will make this live.)", "ok");
      form.reset();
      resetUploadUI();
    });
  }

  // initial
  resetUploadUI();
})();
