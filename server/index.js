/**
 * Amelia's Gallery Backend (Render) — CommonJS build
 * Fixes: "Cannot use import statement outside a module"
 *
 * Supports BOTH route styles:
 * - Legacy (frontend friendly): /gallery /commissions /enquiries /auth/login /upload
 * - API style: /api/gallery /api/commissions /api/enquiries /api/auth/login /api/upload
 *
 * ENV (Render):
 *  ADMIN_EMAIL
 *  ADMIN_PASSWORD
 *  JWT_SECRET
 *  FRONTEND_ORIGIN   (use * for now)
 *  MAX_UPLOAD_MB     (default 10)
 */

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 10000;

// --------------------
// ENV
// --------------------
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-me";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || "10");

// --------------------
// Middleware
// --------------------
app.use(
  cors({
    origin: FRONTEND_ORIGIN === "*" ? true : FRONTEND_ORIGIN,
    credentials: false
  })
);

app.use(express.json({ limit: "2mb" }));

// --------------------
// Storage
// --------------------
const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(__dirname, "uploads");

const DB_FILES = {
  gallery: path.join(DATA_DIR, "gallery.json"),
  commissions: path.join(DATA_DIR, "commissions.json"),
  enquiries: path.join(DATA_DIR, "enquiries.json")
};

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  for (const key of Object.keys(DB_FILES)) {
    const file = DB_FILES[key];
    if (!fs.existsSync(file)) fs.writeFileSync(file, "[]", "utf8");
  }
}
ensureStore();

function readJson(file) {
  try {
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

// --------------------
// Simple signed token (Bearer)
// token = base64url(payload).base64url(hmac)
// --------------------
function makeToken(email) {
  const payload = { email, role: "admin", iat: Date.now() };
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;

  const expected = crypto.createHmac("sha256", JWT_SECRET).update(b64).digest("base64url");
  if (sig !== expected) return null;

  try {
    return JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }
  req.admin = payload;
  next();
}

// --------------------
// Upload config (disk)
// --------------------
const allowedMime = new Set(["image/jpeg", "image/png", "image/webp"]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || "").toLowerCase();
    const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".png";
    const name = `img_${Date.now()}_${crypto.randomBytes(6).toString("hex")}${safeExt}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowedMime.has(file.mimetype)) return cb(new Error("Only PNG/JPG/WEBP allowed"));
    cb(null, true);
  }
});

app.use("/uploads", express.static(UPLOAD_DIR));

// --------------------
// Routes
// --------------------
app.get("/", (req, res) => {
  res.json({ ok: true, service: "amelias-gallery-backend" });
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// ---- AUTH (both paths) ----
function loginHandler(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ ok: false, message: "Missing fields" });

  if (String(email).trim() === ADMIN_EMAIL && String(password) === ADMIN_PASSWORD) {
    const token = makeToken(ADMIN_EMAIL);
    return res.json({ ok: true, token, email: ADMIN_EMAIL });
  }
  return res.status(401).json({ ok: false, message: "Invalid login" });
}

app.post("/auth/login", loginHandler);
app.post("/api/auth/login", loginHandler);

app.get("/me", requireAdmin, (req, res) => {
  res.json({ ok: true, email: req.admin.email, role: req.admin.role });
});
app.get("/api/auth/me", requireAdmin, (req, res) => {
  res.json({ ok: true, email: req.admin.email, role: req.admin.role });
});

// ---- GALLERY (both paths) ----
function galleryListHandler(req, res) {
  const items = readJson(DB_FILES.gallery);
  res.json({ ok: true, items });
}
app.get("/gallery", galleryListHandler);
app.get("/api/gallery", galleryListHandler);

// ---- UPLOAD (admin-only) (both paths) ----
function uploadHandler(req, res) {
  if (!req.file) return res.status(400).json({ ok: false, message: "No file uploaded" });

  const title = String(req.body.title || "").trim() || "Untitled";
  const category = String(req.body.category || "other").trim() || "other";

  const url = `/uploads/${req.file.filename}`;
  const item = {
    id: `g_${Date.now()}`,
    title,
    category,
    url,
    thumbUrl: url,
    createdAt: new Date().toISOString()
  };

  const items = readJson(DB_FILES.gallery);
  items.unshift(item);
  writeJson(DB_FILES.gallery, items);

  res.json({ ok: true, item });
}

app.post("/upload", requireAdmin, upload.single("file"), uploadHandler);
app.post("/api/upload", requireAdmin, upload.single("file"), uploadHandler);

// ---- COMMISSIONS (public submit) (both paths) ----
const refsUpload = upload.fields([{ name: "refs", maxCount: 3 }]);

function commissionsCreateHandler(req, res) {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim();
  const type = String(req.body.type || "").trim();
  const size = String(req.body.size || "").trim();
  const brief = String(req.body.brief || "").trim();

  if (!name || !email || !brief) {
    return res.status(400).json({ ok: false, message: "name, email, brief required" });
  }

  const files = req.files && req.files.refs ? req.files.refs : [];
  const refs = files.map((f) => ({
    url: `/uploads/${f.filename}`,
    filename: f.filename,
    mime: f.mimetype,
    size: f.size
  }));

  const record = {
    id: `c_${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: "new",
    name,
    email,
    type: type || "custom",
    size: size || "digital",
    brief,
    refs
  };

  const items = readJson(DB_FILES.commissions);
  items.unshift(record);
  writeJson(DB_FILES.commissions, items);

  res.json({ ok: true, commission: record });
}

app.post("/commissions", refsUpload, commissionsCreateHandler);
app.post("/api/commissions", refsUpload, commissionsCreateHandler);

// Admin list (both paths)
function commissionsAdminListHandler(req, res) {
  const items = readJson(DB_FILES.commissions);
  res.json({ ok: true, items });
}
app.get("/admin/commissions", requireAdmin, commissionsAdminListHandler);
app.get("/api/admin/commissions", requireAdmin, commissionsAdminListHandler);

// ---- ENQUIRIES (public) (both paths) ----
function enquiriesHandler(req, res) {
  const name = String(req.body.cname || req.body.name || "").trim();
  const email = String(req.body.cemail || req.body.email || "").trim();
  const message = String(req.body.cmsg || req.body.message || "").trim();

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, message: "name, email, message required" });
  }

  const record = {
    id: `e_${Date.now()}`,
    createdAt: new Date().toISOString(),
    name,
    email,
    message
  };

  const items = readJson(DB_FILES.enquiries);
  items.unshift(record);
  writeJson(DB_FILES.enquiries, items);

  res.json({ ok: true });
}
app.post("/enquiries", enquiriesHandler);
app.post("/api/enquiries", enquiriesHandler);

// Admin list (both paths)
function enquiriesAdminListHandler(req, res) {
  const items = readJson(DB_FILES.enquiries);
  res.json({ ok: true, items });
}
app.get("/admin/enquiries", requireAdmin, enquiriesAdminListHandler);
app.get("/api/admin/enquiries", requireAdmin, enquiriesAdminListHandler);

// ---- Error handler ----
app.use((err, req, res, next) => {
  res.status(400).json({ ok: false, message: err && err.message ? err.message : "Error" });
});

// --------------------
// Start
// --------------------
app.listen(PORT, () => {
  console.log(`Amelia backend running on port ${PORT}`);
});
