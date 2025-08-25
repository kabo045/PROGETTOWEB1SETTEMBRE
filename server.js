const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const multer = require("multer");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());

// Static, immagini e upload
const staticFolder = path.join(__dirname, "public");
const uploadsDir = path.join(__dirname, "uploads");

// crea uploads/ se non esiste
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.static(staticFolder));
app.use("/uploads", express.static(uploadsDir));

// Multer
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Solo immagini!"));
    cb(null, true);
  }
});

// endpoint upload
app.post("/api/upload/immagine", (req, res, next) => {
  upload.single("immagine")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || "Upload fallito" });
    if (!req.file) return res.status(400).json({ error: "File mancante!" });
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  });
});

// ROUTES
const { router: authRouter } = require("./routes/auth");
app.use("/api", authRouter);

const clienteRoutes = require("./routes/client");
// 🔧 tieni SOLO questo mount per evitare collisioni:
app.use("/api/cliente", clienteRoutes);

const gestoreRoutes = require("./routes/gestore");
app.use("/api/gestore", gestoreRoutes);

const adminRoutes = require("./routes/admin");
// 🔧 scope esplicito admin:
app.use("/api/admin", adminRoutes);

// Fallback per HTML senza estensione (serve solo file esistenti)
app.get("/:page", (req, res, next) => {
  const filePath = path.join(staticFolder, `${req.params.page}.html`);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) return next();
    res.sendFile(filePath);
  });
});

// --- DB pubblico per alcune query "public"
const {
  DATABASE_URL,
  PGUSER, PGPASSWORD, PGHOST, PGPORT, PGDATABASE
} = process.env;

const connectionString =
  DATABASE_URL ||
  `postgresql://${PGUSER || "postgres"}:${PGPASSWORD || "postgres"}@${PGHOST || "db"}:${PGPORT || "5432"}/${PGDATABASE || "web"}`;

const db = new Pool({ connectionString });

// Rotte pubbliche per sedi, spazi, postazioni
app.get("/api/sedi", async (_req, res) => {
  try {
    const result = await db.query("SELECT * FROM locations ORDER BY name");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Errore recupero sedi" });
  }
});

app.get("/api/sedi/:id/spazi", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM spaces WHERE location_id = $1 ORDER BY name",
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Errore recupero spazi" });
  }
});

app.get("/api/spazi/:id/postazioni", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM workstations WHERE space_id = $1 ORDER BY name",
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Errore recupero postazioni" });
  }
});

// Dummy disponibilità
app.get("/api/postazioni/:id/disponibilita", async (_req, res) => {
  try {
    const fasce = [
      { time_slot: "09:00-12:00", available: true },
      { time_slot: "12:00-15:00", available: true },
      { time_slot: "15:00-18:00", available: true }
    ];
    res.json(fasce);
  } catch {
    res.status(500).json({ error: "Errore recupero fasce" });
  }
});

// Server
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server avviato su http://localhost:${PORT}`);
  });
}

module.exports = app;
