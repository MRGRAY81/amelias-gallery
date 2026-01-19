import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import sharp from "sharp";

dotenv.config();

const app = express();

// --------------------
// Config
// --------------------
const PORT = process.env.PORT || 10000;

// Frontend origin for CORS (set this in Render env)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";

// Auth settings
const JWT_SECRET = process.env.JWT_SECRET || "";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "";

// Storage paths (local MVP)
const DATA_DIR = path.resolve("./data");
const UPLOADS_DIR = path.resolve("./uploads");
const COMMISSIONS_FILE = path.join(DATA_DIR, "commissions.json");
const ENQUIRIES_FILE = path.join(DATA_DIR, "enquiries.json");

// Upload limits
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 10);
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

// Ensure dirs exist
await fs.mkdir(DATA_DIR, { recursive: true });
await fs.mkdir(UPLOADS_DIR, { recursive: true });

// --------------------
// Middleware
// --------------------
app.use(helmet());
app.use(express.json({ limit: "2mb" })); // keep JSON light
app.use(
  cors({
    origin: FRONTEND_ORIGIN === "*" ? true : FRONTEND_ORIGIN,
    credentials: true
  })
);

// Serve uploaded files (admin-only is enforced at API level; the files themselves are not indexed)
app.use("/uploads", express.static(UPLOADS_DIR));

// --------------------
// Helpers: JSON file storage
// --------------------
async function readJson(filePath, fallback = []) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  // good enough for MVP
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// --------------------
// Auth (httpOnly cookie JWT)
// --------------------
function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("ag_admin", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/"
  });
}

function clearAuthCookie(res) {
  res.clearCookie("ag_admin", { path: "/" });
}

function getTokenFromCookie(req) {
  const header = req.headers.cookie || "";
  const parts = header.split(";").map(s => s.trim());
  const found = parts.find(p => p.startsWith("ag_admin="));
  if (!found) return null;
  return decodeURIComponent(found.split("=").slice(1).join("="));
}

function requireAdmin(req, res, next) {
  if (!JWT_SECRET) return res.status(500).json({ error: "JWT_SECRET not set" });

  const token = getTokenFromCookie(req);
  if (!token) return res.status(401).json({ error: "Not logged in" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid session" });
  }
}

// --------------------
// Multer upload (memory) + image validation
// --------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("Only JPG/PNG/WebP images allowed"), ok);
  }
});

// Re-encode image for safety (strips metadata & reduces attack surface)
async function sanitizeAndSaveImage(buffer, originalName) {
  // Always output WEBP for consistency (small + safe)
  const outName = `${makeId()}_${safeBaseName(originalName)}.webp`;
  const outPath = path.join(UPLOADS_DIR, outName);

  const img = sharp(buffer, { failOn: "error" });

  // Basic constraints to avoid insane images
  const meta = await img.metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (w > 8000 || h > 8000) throw new Error("Image too large (dimensions)");

  // Re-encode
  await img
    .rotate() // respects orientation tag then strips it
    .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
    .toFormat("webp", { quality: 82 })
    .toFile(outPath);

  return { filename: outName, urlPath: `/uploads/${outName}` };
}

function safeBaseName(name) {
  return String(name || "upload")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .slice(0, 40);
}

// --------------------
// Routes
// --------------------
app.get("/", (req, res) => {
  res.json({ ok: true, service: "amelias-gallery-backend" });
});

// Healthcheck
app.get("/health", (req, res) => res.json({ ok: true }));

// Auth
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!JWT_SECRET) return res.status(500).json({ error: "JWT_SECRET not set" });
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH) {
    return res.status(500).json({ error: "Admin credentials not configured" });
  }

  const emailOk = String(email || "").trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
  if (!emailOk) return res.status(401).json({ error: "Invalid credentials" });

  const passOk = await bcrypt.compare(String(password || ""), ADMIN_PASSWORD_HASH);
  if (!passOk) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ role: "admin", email: ADMIN_EMAIL }, JWT_SECRET, { expiresIn: "7d" });
  setAuthCookie(res, token);
  res.json({ ok: true });
});

app.post("/api/auth/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAdmin, (req, res) => {
  res.json({ ok: true, admin: req.admin });
});

// Upload endpoint (admin-only OR public?)
// For commission references: public is ok, but we keep it simple and allow PUBLIC upload
// because it is image-only + re-encoded. If you want admin-only, add requireAdmin here.
app.post("/api/uploads/image", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const saved = await sanitizeAndSaveImage(req.file.buffer, req.file.originalname);
    res.json({ ok: true, ...saved });
  } catch (err) {
    res.status(400).json({ error: String(err.message || err) });
  }
});

// Commissions (public submit)
app.post("/api/commissions", async (req, res) => {
  const { name, email, type, deadline, details, attachmentUrl } = req.body || {};
  if (!name || !email || !type) return res.status(400).json({ error: "Missing required fields" });

  const item = {
    id: makeId(),
    name: String(name).trim(),
    email: String(email).trim(),
    type: String(type).trim(),
    deadline: String(deadline || "").trim(),
    details: String(details || "").trim(),
    attachmentUrl: attachmentUrl ? String(attachmentUrl) : null,
    status: "New Request",
    createdAt: nowIso()
  };

  const list = await readJson(COMMISSIONS_FILE, []);
  list.unshift(item);
  await writeJson(COMMISSIONS_FILE, list);

  res.json({ ok: true, item });
});

// Commissions (admin list)
app.get("/api/admin/commissions", requireAdmin, async (req, res) => {
  const list = await readJson(COMMISSIONS_FILE, []);
  res.json({ ok: true, list });
});

// Enquiries (public submit)
app.post("/api/enquiries", async (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: "Missing required fields" });

  const item = {
    id: makeId(),
    name: String(name).trim(),
    email: String(email).trim(),
    message: String(message || "").trim(),
    createdAt: nowIso()
  };

  const list = await readJson(ENQUIRIES_FILE, []);
  list.unshift(item);
  await writeJson(ENQUIRIES_FILE, list);

  res.json({ ok: true, item });
});

// Enquiries (admin list)
app.get("/api/admin/enquiries", requireAdmin, async (req, res) => {
  const list = await readJson(ENQUIRIES_FILE, []);
  res.json({ ok: true, list });
});

// --------------------
// Start
// --------------------
app.listen(PORT, () => {
  console.log(`Backend running on :${PORT}`);
});
