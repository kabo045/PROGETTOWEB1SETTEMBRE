const jwt = require('jsonwebtoken');
const authenticate = require('../middleware/authenticate');

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token mancante o non valido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // contiene id e role
    next();
  } catch (err) {
    return res.status(403).json({ error: "Token non valido" });
  }
};

module.exports = auth;
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}
