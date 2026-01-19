const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-me";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";

app.use(helmet());
app.use(express.json({ limit: "2mb" }));

app.use(
  cors({
    origin: FRONTEND_ORIGIN === "*" ? true : FRONTEND_ORIGIN,
    credentials: true
  })
);

const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const COMMISSIONS_FILE = path.join(DATA_DIR, "commissions.json");

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
  if (!fs.existsSync(COMMISSIONS_FILE)) fs.writeFileSync(COMMISSIONS_FILE, "[]");
}
ensureDirs();

function readCommissions() {
  try {
    return JSON.parse(fs.readFileSync(COMMISSIONS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeCommissions(items) {
  fs.writeFileSync(COMMISSIONS_FILE, JSON.stringify(items, null, 2));
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeBase = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safeBase}`);
  }
});

const allowedMime = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf"
]);

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowedMime.has(file.mimetype)) return cb(new Error("File type not allowed"));
    cb(null, true);
  }
});

app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "amelias-gallery-backend" });
});

app.post("/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Missing fields" });

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = signToken({ role: "admin", email });
    return res.json({ token });
  }
  return res.status(401).json({ error: "Invalid login" });
});

app.get("/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.post("/commissions", (req, res) => {
  const { name, email, message, referenceUrl } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: "name, email, message required" });
  }

  const items = readCommissions();
  const newItem = {
    id: `c_${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: "new",
    name,
    email,
    message,
    referenceUrl: referenceUrl || null
  };

  items.unshift(newItem);
  writeCommissions(items);

  res.json({ ok: true, commission: newItem });
});

app.get("/admin/commissions", requireAuth, (req, res) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  res.json({ items: readCommissions() });
});

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const url = `/uploads/${req.file.filename}`;
  res.json({ ok: true, url });
});

app.use((err, req, res, next) => {
  res.status(400).json({ error: err?.message || "Server error" });
});

app.listen(PORT, () => console.log(`Backend running on ${PORT}`));
