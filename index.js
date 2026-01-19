const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN || "http://localhost:5500";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-me";

/* Middleware */
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: false
  })
);
app.use(express.json({ limit: "2mb" }));

/* Root / Health */
app.get("/", (req, res) => {
  res.json({ ok: true, service: "amelias-gallery-backend" });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "amelias-gallery-backend",
    version: "0.1.0",
    time: new Date().toISOString()
  });
});

/* TEMP Auth (MVP) */
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  const ok = email === ADMIN_EMAIL && password === ADMIN_PASSWORD;
  if (!ok) return res.status(401).json({ ok: false, message: "Invalid login" });

  const token = Buffer.from(`${email}:${Date.now()}`).toString("base64");
  res.json({ ok: true, token, email });
});

/* Commissions JSON store */
const dataDir = path.join(__dirname, "data");
const commissionsFile = path.join(dataDir, "commissions.json");

function ensureDataStore() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(commissionsFile)) fs.writeFileSync(commissionsFile, "[]");
}
ensureDataStore();

function readCommissions() {
  try {
    return JSON.parse(fs.readFileSync(commissionsFile, "utf8") || "[]");
  } catch {
    return [];
  }
}
function writeCommissions(items) {
  fs.writeFileSync(commissionsFile, JSON.stringify(items, null, 2));
}

app.post("/commissions", (req, res) => {
  const { name, email, message, referenceImageUrl } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({
      ok: false,
      message: "Missing required fields: name, email, message"
    });
  }

  const items = readCommissions();
  const record = {
    id: `c_${Date.now()}`,
    name,
    email,
    message,
    referenceImageUrl: referenceImageUrl || null,
    status: "new",
    createdAt: new Date().toISOString()
  };
  items.unshift(record);
  writeCommissions(items);

  res.json({ ok: true, commission: record });
});

app.get("/admin/commissions", (req, res) => {
  const token = req.headers["x-admin-token"];
  if (!token) return res.status(401).json({ ok: false, message: "No token" });

  const items = readCommissions();
  res.json({ ok: true, items });
});

/* Uploads (images only) */
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

function fileFilter(req, file, cb) {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only image files are allowed"), false);
  }
  cb(null, true);
}

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
});

app.use("/uploads", express.static(uploadsDir));

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, message: "No file" });

  const ext = (req.file.originalname.split(".").pop() || "").toLowerCase();
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)
    ? ext
    : "png";

  const newName = `img_${Date.now()}_${Math.random()
    .toString(16)
    .slice(2)}.${safeExt}`;

  fs.renameSync(req.file.path, path.join(uploadsDir, newName));

  res.json({ ok: true, url: `/uploads/${newName}` });
});

/* Error handler */
app.use((err, req, res, next) => {
  res.status(400).json({ ok: false, message: err.message || "Error" });
});

/* Start */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
