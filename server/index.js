const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");

const app = express();

// ---------- middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ---------- uploads folder (INSIDE /server/uploads)
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// serve uploads publicly
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

// ---------- in-memory store (swap to DB later)
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

// ---------- routes
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// upload image (multipart: "file")
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const base = publicBase(req);
  const url = `${base}/uploads/${req.file.filename}`;
  res.json({ ok: true, url });
});

// create message (from contact/commissions)
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

// list messages
app.get("/api/messages", (_req, res) => res.json({ ok: true, items: MESSAGES }));

// update message status/notes
app.patch("/api/messages/:id", (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body || {};

  const msg = MESSAGES.find((m) => m.id === id);
  if (!msg) return res.status(404).json({ error: "Not found" });

  if (status !== undefined) msg.status = safeStatus(status);
  if (notes !== undefined) msg.notes = String(notes || "");

  res.json({ ok: true, msg });
});

// ---------- start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on", PORT));
