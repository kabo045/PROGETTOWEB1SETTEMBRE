const express = require("express");
const path = require("path");
const cors = require("cors");
const multer = require("multer");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Static, immagini e upload
const staticFolder = path.join(__dirname, "public");
app.use(express.static(staticFolder));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Solo immagini!"), false);
    cb(null, true);
  }
});
app.post("/api/upload/immagine", upload.single("immagine"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "File mancante!" });
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// ROUTES
const { router: authRouter } = require("./routes/auth");
app.use("/api", authRouter);

const clienteRoutes = require("./routes/client");
app.use("/api/cliente", clienteRoutes);
app.use("/api", clienteRoutes);

// Fallback per HTML senza estensione
app.get('/:page', (req, res, next) => {
  const requestedPage = req.params.page;
  const filePath = path.join(staticFolder, `${requestedPage}.html`);
  res.sendFile(filePath, function(err) {
    if (err) next();
  });
});
// 2. Router gestore
const gestoreRoutes = require("./routes/gestore");
app.use("/api/gestore", gestoreRoutes);

// Rotte pubbliche per sedi, spazi, postazioni
const { Pool } = require('pg');
const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:0000@db:5432/web'
});


// Tutte le sedi (public)
app.get('/api/sedi', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM locations ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore recupero sedi' });
  }
});

// Tutti gli spazi di una sede (public)
app.get('/api/sedi/:id/spazi', async (req, res) => {
  try {
    const sedeId = req.params.id;
    const result = await db.query(
      'SELECT * FROM spaces WHERE location_id = $1 ORDER BY name',
      [sedeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore recupero spazi' });
  }
});

// Tutte le postazioni di uno spazio (public)
app.get('/api/spazi/:id/postazioni', async (req, res) => {
  try {
    const spazioId = req.params.id;
    const result = await db.query(
      'SELECT * FROM workstations WHERE space_id = $1 ORDER BY name',
      [spazioId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore recupero postazioni' });
  }
});

// Disponibilità fasce orarie di una postazione in una data (dummy, esempio)
app.get('/api/postazioni/:id/disponibilita', async (req, res) => {
  try {
    const fasce = [
      { time_slot: '09:00-12:00', available: true },
      { time_slot: '12:00-15:00', available: true },
      { time_slot: '15:00-18:00', available: true }
    ];
    res.json(fasce);
  } catch (err) {
    res.status(500).json({ error: 'Errore recupero fasce' });
  }
});

const adminRoutes = require("./routes/admin"); // il file dove hai messo tutte le API admin che hai scritto!
app.use("/", adminRoutes); // oppure app.use("/api", adminRoutes);

// Server
const PORT = 3000;

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server avviato su http://localhost:${PORT}`);
  });

}

module.exports = app;
