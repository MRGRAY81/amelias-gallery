const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const app = express();

/**
 * ENV on Render:
 * ADMIN_EMAIL=amelia@demo.com
 * ADMIN_PASSWORD=Amelia1
 * JWT_SECRET=super-long-random-string
 * FRONTEND_ORIGIN=https://amelias-gallery-1.onrender.com
 * PUBLIC_BASE_URL=https://<YOUR-NODE-SERVICE>.onrender.com   (optional, only needed for uploads)
 */

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "amelia@demo.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Amelia1";

// --- CORS (allow your static frontend)
app.use(
  cors({
    origin: FRONTEND_ORIGIN === "*" ? true : FRONTEND_ORIGIN,
    credentials: false,
  })
);

app.use(express.json({ limit: "10mb" }));

// ---------- uploads folder
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOAD_DIR));

// ---------- multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const safe = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
    cb(null, safe);
  },
});
const upload = multer({ storage });

// ---------- in-memory store
const MESSAGES = []; // {id,name,email,text,status,notes,refs[],createdAt}

// ---------- helpers
function publicBase(req) {
  const env = process.env.PUBLIC_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

function safeStatus(s) {
  const allowed = new Set(["new", "progress", "done"]);
  return allowed.has(s) ? s : "new";
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ---------- routes
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// admin login
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Missing credentials" });

  const ok =
    String(email).toLowerCase() === String(ADMIN_EMAIL).toLowerCase() &&
    String(password) === String(ADMIN_PASSWORD);

  if (!ok) return res.status(401).json({ error: "Invalid login" });

  const token = jwt.sign({ email: ADMIN_EMAIL, role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ ok: true, token });
});

// upload image (admin only)
app.post("/api/upload", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const base = publicBase(req);
  const url = `${base}/uploads/${req.file.filename}`;
  res.json({ ok: true, url });
});

// PUBLIC: create message (from contact/commissions)
app.post("/api/messages", (req, res) => {
  const { name, email, text, refs } = req.body || {};
  if (!text) return res.status(400).json({ error: "Missing message text" });

  const msg = {
    id: crypto.randomUUID(),
    name: String(name || "Unknown"),
    email: String(email || ""),
    text: String(text),
    refs: Array.isArray(refs) ? refs.map(String) : [],
    status: "new",
    notes: "",
    createdAt: new Date().toISOString(),
  };

  MESSAGES.unshift(msg);
  res.json({ ok: true, msg });
});

// ADMIN: list messages
app.get("/api/admin/messages", requireAuth, (_req, res) => {
  res.json({ ok: true, items: MESSAGES });
});

// ADMIN: update message status/notes
app.patch("/api/admin/messages/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body || {};

  const msg = MESSAGES.find((m) => m.id === id);
  if (!msg) return res.status(404).json({ error: "Not found" });

  if (status !== undefined) msg.status = safeStatus(status);
  if (notes !== undefined) msg.notes = String(notes || "");

  res.json({ ok: true, msg });
});

// OPTIONAL: keep old endpoint for quick testing (not admin)
app.get("/api/messages", (_req, res) => res.json({ ok: true, items: MESSAGES }));

// ---------- start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on", PORT));
