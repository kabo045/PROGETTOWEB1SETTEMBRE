const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db/db");

const router = express.Router();
const SECRET = process.env.JWT_SECRET || "supersegreto123";

// === MIDDLEWARE DI AUTENTICAZIONE ===
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Token mancante." });

  const token = authHeader.split(" ")[1]; // Formato: "Bearer <token>"
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Token non valido." });
    req.user = user;
    next();
  });
}

// === REGISTRAZIONE ===
router.post("/register", async (req, res) => {
  const { name, surname, email, phone, password, role } = req.body;

  if (!name || !surname || !email || !password || !phone) {
    return res.status(400).json({ message: "Compila tutti i campi." });
  }

  try {
    const check = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (check.rows.length > 0) {
      return res.status(400).json({ message: "Email già registrata." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, surname, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [name, surname, email, phone, hashedPassword, role || "cliente"]
    );

    res.status(201).json({ message: "Registrazione completata", userId: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Errore durante la registrazione" });
  }
});

// === LOGIN ===
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Email non registrata." });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: "Password errata." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      SECRET,
      { expiresIn: "3h" }
    );

    res.status(200).json({
      message: "Login effettuato",
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Errore durante il login" });
  }
});

// Esporta sia il router che il middleware
module.exports = {
  router,
  authenticate
};
