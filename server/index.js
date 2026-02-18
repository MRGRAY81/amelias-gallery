const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 10000;

/* =========================
   ENV
========================= */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-me";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || "10");

/* =========================
   CORS
========================= */
function buildAllowedOrigins(value) {
  if (!value || value === "*") return "*";
  return value.split(",").map(s => s.trim()).filter(Boolean);
}

const allowed = buildAllowedOrigins(FRONTEND_ORIGIN);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowed === "*") return cb(null, true);
    if (Array.isArray(allowed) && allowed.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS: " + origin), false);
  }
}));

app.use(express.json({ limit: "2mb" }));

/* =========================
   STORAGE
========================= */
const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(__dirname, "uploads");

const DB = {
  gallery: path.join(DATA_DIR, "gallery.json"),
  commissions: path.join(DATA_DIR, "commissions.json"),
  enquiries: path.join(DATA_DIR, "enquiries.json"),
};

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  Object.values(DB).forEach(file => {
    if (!fs.existsSync(file)) fs.writeFileSync(file, "[]");
  });
}
ensureStorage();

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return []; }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/* =========================
   AUTH
========================= */
function makeToken(email) {
  const payload = { email, role: "admin", iat: Date.now() };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", JWT_SECRET).update(body).digest("base64url");
  if (sig !== expected) return null;
  try { return JSON.parse(Buffer.from(body, "base64url").toString("utf8")); }
  catch { return null; }
}

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }
  req.admin = payload;
  next();
}

/* =========================
   UPLOADS
========================= */
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".png";
      const name = `img_${Date.now()}_${crypto.randomBytes(6).toString("hex")}${ext}`;
      cb(null, name);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
});

app.use("/uploads", express.static(UPLOAD_DIR));

/* =========================
   ROUTES
========================= */
app.get("/", (req, res) => {
  res.json({ ok: true, service: "amelias-gallery-backend" });
});

app.get("/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

/* AUTH */
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return res.json({ ok: true, token: makeToken(email) });
  }
  res.status(401).json({ ok: false, message: "Invalid credentials" });
});

/* COMMISSIONS */
app.post("/commissions", upload.array("refs", 3), (req, res) => {
  const { name, email, brief } = req.body || {};
  if (!name || !email || !brief) {
    return res.status(400).json({ ok: false, message: "Missing fields" });
  }

  const record = {
    id: `c_${Date.now()}`,
    name, email, brief,
    refs: (req.files || []).map(f => `/uploads/${f.filename}`),
    status: "new",
    notes: "",
    createdAt: new Date().toISOString(),
  };

  const items = readJson(DB.commissions);
  items.unshift(record);
  writeJson(DB.commissions, items);

  res.json({ ok: true });
});

app.get("/admin/commissions", requireAdmin, (req, res) => {
  res.json({ ok: true, items: readJson(DB.commissions) });
});

app.patch("/admin/commissions/:id", requireAdmin, (req, res) => {
  const id = req.params.id;
  const { status, notes } = req.body || {};

  const items = readJson(DB.commissions);
  const idx = items.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ ok: false });

  items[idx] = { ...items[idx], status, notes, updatedAt: new Date().toISOString() };
  writeJson(DB.commissions, items);

  res.json({ ok: true, item: items[idx] });
});

/* ENQUIRIES */
app.post("/enquiries", (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ ok: false });
  }

  const items = readJson(DB.enquiries);
  items.unshift({
    id: `e_${Date.now()}`,
    name, email, message,
    status: "new",
    notes: "",
    createdAt: new Date().toISOString(),
  });

  writeJson(DB.enquiries, items);
  res.json({ ok: true });
});

app.get("/admin/enquiries", requireAdmin, (req, res) => {
  res.json({ ok: true, items: readJson(DB.enquiries) });
});

app.patch("/admin/enquiries/:id", requireAdmin, (req, res) => {
  const id = req.params.id;
  const { status, notes } = req.body || {};

  const items = readJson(DB.enquiries);
  const idx = items.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ ok: false });

  items[idx] = { ...items[idx], status, notes, updatedAt: new Date().toISOString() };
  writeJson(DB.enquiries, items);

  res.json({ ok: true, item: items[idx] });
});

/* START */
app.listen(PORT, () => {
  console.log(`Backend running on ${PORT}`);
});
