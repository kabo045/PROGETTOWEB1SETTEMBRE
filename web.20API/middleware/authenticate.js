const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "supersegreto123";

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Token mancante." });
  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token mancante nel Bearer." });
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Token non valido." });
    req.user = user;
    next();
  });
}

function isAdmin(req, res, next) {
  if (req.user && req.user.role === "admin") return next();
  return res.status(403).json({ message: "Accesso riservato solo agli admin!" });
}

module.exports = { authenticate, isAdmin };
