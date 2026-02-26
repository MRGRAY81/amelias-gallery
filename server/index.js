const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const app = express();

// -------------------- ENV --------------------
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*"; // set to your static site url
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "amelia@demo.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Gallery123";
const JWT_SECRET = process.env.JWT_SECRET || "change-me";

// -------------------- MIDDLEWARE --------------------
app.use(
  cors({
    origin: FRONTEND_ORIGIN === "*" ? true : FRONTEND_ORIGIN,
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));

// -------------------- UPLOADS --------------------
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use("/uploads", express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const safe = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
    cb(null, safe);
  },
});

const upload = multer({ storage });

// -------------------- STORE --------------------
// {id, type, name, email, text, refs[], status, notes, createdAt}
const MESSAGES = [];

// -------------------- HELPERS --------------------
function safeStatus(s) {
  const allowed = new Set(["new", "progress", "done"]);
  return allowed.has(s) ? s : "new";
}

function publicBase(req) {
  const env = process.env.PUBLIC_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// -------------------- ROUTES --------------------

// Keep this so hitting root doesn’t confuse you
app.get("/", (_req, res) => res.json({ ok: true }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ---- Admin auth
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body || {};
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (e !== String(ADMIN_EMAIL).toLowerCase() || p !== String(ADMIN_PASSWORD)) {
    return res.status(401).json({ error: "Invalid login" });
  }

  const token = jwt.sign({ email: e, role: "admin" }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.json({ ok: true, token });
});

app.get("/api/admin/whoami", requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// ---- Upload (admin-only)
app.post("/api/upload", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const base = publicBase(req);
  const url = `${base}/uploads/${req.file.filename}`;
  res.json({ ok: true, url });
});

// ---- Public message create (contact + commissions can hit this)
app.post("/api/messages", (req, res) => {
  const { name, email, text, refs, type } = req.body || {};
  if (!text) return res.status(400).json({ error: "Missing message text" });

  const msg = {
    id: crypto.randomUUID(),
    type: type === "commission" ? "commission" : "enquiry",
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

// ---- Admin list
app.get("/api/messages", requireAuth, (_req, res) => {
  res.json({ ok: true, items: MESSAGES });
});

// ---- Admin update
app.patch("/api/messages/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body || {};

  const msg = MESSAGES.find((m) => m.id === id);
  if (!msg) return res.status(404).json({ error: "Not found" });

  if (status !== undefined) msg.status = safeStatus(status);
  if (notes !== undefined) msg.notes = String(notes || "");

  res.json({ ok: true, msg });
});

// -------------------- START --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on", PORT));
