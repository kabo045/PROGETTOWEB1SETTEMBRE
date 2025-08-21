const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "supersegreto123";

// Middleware per autenticare il token JWT
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Token mancante" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token non valido" });

  try {
    const user = jwt.verify(token, SECRET);
    req.user = user;

    // 🔍 Debug utile per lo sviluppo
    console.log("✅ Autenticato:", user);

    next();
  } catch (err) {
    console.error("❌ Token non valido:", err.message);
    res.status(403).json({ error: "Token non valido" });
  }
}

module.exports = { authenticate };
