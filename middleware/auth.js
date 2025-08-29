// Importa la libreria jsonwebtoken per verificare e decodificare i JWT
const jwt = require('jsonwebtoken');

// Importa un middleware di autenticazione personalizzato
const authenticate = require('../middleware/authenticate');

// Middleware di autenticazione per Express
// Controlla che la richiesta contenga un token JWT valido
const auth = (req, res, next) => {
  // Legge l'header Authorization dalla richiesta
  const authHeader = req.headers.authorization;

  // Se non esiste oppure non inizia con "Bearer " → errore 401
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token mancante o non valido" });
  }

  // Estrae il token dall'header (rimuovendo "Bearer ")
  const token = authHeader.split(" ")[1];

  try {
    // Verifica il token con la chiave segreta definita nelle variabili d'ambiente
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Salva le informazioni decodificate dentro req.user
    req.user = decoded;

    // Continua con il prossimo middleware o controller
    next();
  } catch (err) {
    // Se il token non è valido → errore 403
    return res.status(403).json({ error: "Token non valido" });
  }
};

// Esporta il middleware per usarlo nelle route protette
module.exports = auth;


// Funzione lato client per il logout
function logout() {
  // Rimuove il token e i dati dell'utente salvati in localStorage
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  // Reindirizza l'utente alla pagina di login
  window.location.href = "login.html";
}
