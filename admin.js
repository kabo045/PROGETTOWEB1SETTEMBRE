const express = require("express");
const router = express.Router();
const pool = require("../db/db");
const bcrypt = require("bcrypt");
const { authenticate, isAdmin } = require("../middleware/authenticate"); // Modifica il path se serve!
// --- UTENTI ---
// Lista utenti (tutti o solo di un ruolo)
router.get("/api/admin/users", authenticate, isAdmin, async (req, res) => {
  try {
    let query = "SELECT id, name, surname, email, role FROM users";
    let params = [];
    if (req.query.role) {
      query += " WHERE role = $1";
      params = [req.query.role];
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Errore caricamento utenti" });
  }
});

router.post("/api/admin/users", authenticate, isAdmin, async (req, res) => {
  try {
    const { name, surname, email, password, role } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ message: "Dati mancanti" });

    // (eventuale validazione del ruolo se vuoi...)
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (name, surname, email, password_hash, role) VALUES ($1,$2,$3,$4,$5)`,
      [name, surname, email, hash, role]
    );
    res.sendStatus(201);
  } catch (err) {
    // Intercetta violazione unique key (duplicato email)
    if (err.code === '23505' && err.constraint === 'users_email_key') {
      return res.status(409).json({ error: "Email già registrata" });
    }
    console.error("Errore creazione utente:", err);
    res.status(500).json({ error: "Errore creazione utente" });
  }
});




// Cambia ruolo utente
router.put("/api/admin/users/:id/role", authenticate, isAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    await pool.query("UPDATE users SET role=$1 WHERE id=$2", [role, req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Errore modifica ruolo" });
  }
});

// Elimina utente
// DELETE /api/admin/users/:id
router.delete("/api/admin/users/:id", authenticate, isAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = Number(req.params.id);
    if (Number.isNaN(userId)) return res.status(400).json({ error: "ID non valido" });

    // proteggi l’admin principale
    if (userId === 1) {
      return res.status(403).json({ error: "Non puoi eliminare l'amministratore principale." });
    }

    await client.query("BEGIN");

    // esiste?
    const { rows: urows } = await client.query("SELECT id FROM users WHERE id=$1", [userId]);
    if (!urows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Utente non trovato" });
    }

    // 1) se è manager di sedi, sgancia il manager (senza cambiare FK)
    await client.query("UPDATE locations SET manager_id = NULL WHERE manager_id = $1", [userId]);

    // 2) support requests dell’utente (rimuovi)
    await client.query("DELETE FROM support_requests WHERE user_id = $1", [userId]);

    // 3) notifiche inviate dall’utente (mantieni le notifiche ma azzera mittente)
    await client.query("UPDATE notifications SET sender_id = NULL WHERE sender_id = $1", [userId]);

    // 4) prenotazioni dell’utente (ripristina disponibilità + cancella pagamenti + cancella booking)
    const { rows: bookingRows } = await client.query(
      "SELECT id, workstation_id, date, time_slot FROM bookings WHERE user_id = $1",
      [userId]
    );
    if (bookingRows.length) {
      const bookingIds = bookingRows.map(b => b.id);
      // ripristina gli slot
      for (const b of bookingRows) {
        await client.query(
          "UPDATE availability SET available = TRUE WHERE workstation_id = $1 AND date = $2 AND time_slot = $3",
          [b.workstation_id, b.date, b.time_slot]
        );
      }
      // rimuovi eventuali pagamenti collegati
      await client.query(
        `DELETE FROM payments WHERE booking_id = ANY($1::int[])`,
        [bookingIds]
      );
      // rimuovi notifiche “destinate” all’utente legate alle prenotazioni (se presenti)
      await client.query(
        `DELETE FROM notifications WHERE user_id = $1 AND (metadata->>'booking_id')::int = ANY($2::int[])`,
        [userId, bookingIds]
      );
      // elimina le prenotazioni
      await client.query(
        `DELETE FROM bookings WHERE id = ANY($1::int[])`,
        [bookingIds]
      );
    }

    // 5) recensioni e activity logs dell’utente (pulizia conservativa)
    await client.query("DELETE FROM reviews WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM activity_logs WHERE user_id = $1", [userId]);

    // 6) notifiche destinate a lui (opzionale: le rimuovo per non lasciare orfani)
    await client.query("DELETE FROM notifications WHERE user_id = $1", [userId]);

    // 7) infine elimina l’utente
    await client.query("DELETE FROM users WHERE id = $1", [userId]);

    await client.query("COMMIT");
    return res.sendStatus(204);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Errore eliminazione utente:", err);
    return res.status(500).json({ error: "Errore eliminazione utente" });
  } finally {
    client.release();
  }
});

// --- SEDI ---
// Lista sedi con gestore
router.get("/api/admin/locations", authenticate, isAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT l.*, u.name AS manager_name, u.surname AS manager_surname
      FROM locations l
      LEFT JOIN users u ON l.manager_id = u.id
      ORDER BY l.id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Errore caricamento sedi" });
  }
});

// Dettaglio sede
router.get("/api/admin/locations/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM locations WHERE id=$1", [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Errore dettaglio sede" });
  }
});

// Aggiungi sede
router.post("/api/admin/locations", authenticate, isAdmin, async (req, res) => {
  try {
    // ... (estrai i parametri come city, name, etc.)
    await pool.query(
      `INSERT INTO locations (name, city, address, services, manager_id)
       VALUES ($1,$2,$3,$4,$5)`,
      [name, city, address, services, manager_id]
    );
    res.sendStatus(201);
  } catch (err) {
    // Se c'è un vincolo di unicità su name+city o altro duplicato
    if (err.code === '23505') {
      return res.status(409).json({ error: "Sede già esistente in questa città" });
    }
    console.error("Errore creazione sede:", err);
    res.status(500).json({ error: "Errore creazione sede" });
  }
});


// Modifica sede
router.put("/api/admin/locations/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { name, city, address, services, manager_id } = req.body;
    await pool.query(
      `UPDATE locations SET name=$1, city=$2, address=$3, services=$4, manager_id=$5 WHERE id=$6`,
      [name, city, address, services, manager_id, req.params.id]
    );
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Errore modifica sede" });
  }
});

// Elimina sede
router.delete("/api/admin/locations/:id", authenticate, isAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM locations WHERE id=$1", [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Errore eliminazione sede" });
  }
});

// --- PRENOTAZIONI ---
router.get("/api/admin/bookings", authenticate, isAdmin, async (req, res) => {
  try {
    let query = `
      SELECT b.id, b.date, b.time_slot, b.status, 
             u.name AS user_name, u.surname AS user_surname,
             l.name AS location_name, s.name AS space_name,
             p.status AS payment_status
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN workstations w ON b.workstation_id = w.id
      JOIN spaces s ON w.space_id = s.id
      JOIN locations l ON s.location_id = l.id
      LEFT JOIN payments p ON p.booking_id = b.id
      WHERE 1=1
    `;
    let params = [];
    if (req.query.sede) { params.push(req.query.sede); query += ` AND l.id = $${params.length}`; }
    if (req.query.stato) { params.push(req.query.stato); query += ` AND b.status = $${params.length}`; }
    if (req.query.utente) { 
      params.push('%'+req.query.utente.toLowerCase()+'%');
      query += ` AND (LOWER(u.name) LIKE $${params.length} OR LOWER(u.surname) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`;
    }
    query += " ORDER BY b.date DESC, b.time_slot DESC";
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Errore caricamento prenotazioni" });
  }
});

// Cambia stato prenotazione
router.put("/api/admin/bookings/:id/status", authenticate, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query("UPDATE bookings SET status=$1 WHERE id=$2", [status, req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Errore modifica stato" });
  }
});

// Elimina prenotazione
router.delete("/api/admin/bookings/:id", authenticate, isAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM bookings WHERE id=$1", [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Errore eliminazione prenotazione" });
  }
});
router.get("/api/admin/payments", authenticate, isAdmin, async (req, res) => {
  try {
    let query = `
      SELECT p.id, p.amount, p.status, p.method, p.timestamp,
             b.date, u.name AS user_name, u.surname AS user_surname,
             l.name AS location_name, s.name AS space_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN users u ON b.user_id = u.id
      JOIN workstations w ON b.workstation_id = w.id
      JOIN spaces s ON w.space_id = s.id
      JOIN locations l ON s.location_id = l.id
      WHERE 1=1
    `;
    let params = [];
    if (req.query.sede) { params.push(req.query.sede); query += ` AND l.id = $${params.length}`; }
    if (req.query.stato) { params.push(req.query.stato); query += ` AND p.status = $${params.length}`; }
    if (req.query.utente) { 
      params.push('%'+req.query.utente.toLowerCase()+'%');
      query += ` AND (LOWER(u.name) LIKE $${params.length} OR LOWER(u.surname) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`;
    }
    query += " ORDER BY p.timestamp DESC";
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Errore caricamento pagamenti" });
  }
});

const { Parser } = require('json2csv');

router.get('/api/admin/payments/export', authenticate, isAdmin, async (req, res) => {
  try {
    // Riutilizza la stessa logica della get sopra per query e filtri!
    let query = `
      SELECT p.id, p.amount, p.status, p.method, p.timestamp,
             b.date, u.name AS user_name, u.surname AS user_surname,
             l.name AS location_name, s.name AS space_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN users u ON b.user_id = u.id
      JOIN workstations w ON b.workstation_id = w.id
      JOIN spaces s ON w.space_id = s.id
      JOIN locations l ON s.location_id = l.id
      WHERE 1=1
    `;
    let params = [];
    if (req.query.sede) { params.push(req.query.sede); query += ` AND l.id = $${params.length}`; }
    if (req.query.stato) { params.push(req.query.stato); query += ` AND p.status = $${params.length}`; }
    if (req.query.utente) { 
      params.push('%'+req.query.utente.toLowerCase()+'%');
      query += ` AND (LOWER(u.name) LIKE $${params.length} OR LOWER(u.surname) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`;
    }
    query += " ORDER BY p.timestamp DESC";
    const { rows } = await pool.query(query, params);
    const parser = new Parser();
    const csv = parser.parse(rows);
    res.header('Content-Type', 'text/csv');
    res.attachment('pagamenti.csv');
    return res.send(csv);
  } catch (err) {
    res.status(500).json({ error: "Errore esportazione pagamenti" });
  }
});

// --- LOG ATTIVITÀ ---
router.get("/api/admin/logs", authenticate, isAdmin, async (req, res) => {
  try {
    let query = `
      SELECT a.id, a.action, a.target, a.timestamp,
             u.name AS user_name, u.surname AS user_surname
      FROM activity_logs a
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    let params = [];
    if (req.query.utente) { 
      params.push('%'+req.query.utente.toLowerCase()+'%');
      query += ` AND (LOWER(u.name) LIKE $${params.length} OR LOWER(u.surname) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`;
    }
    if (req.query.azione) { 
      params.push('%'+req.query.azione.toLowerCase()+'%');
      query += ` AND LOWER(a.action) LIKE $${params.length}`;
    }
    if (req.query.data) {
      params.push(req.query.data);
      query += ` AND DATE(a.timestamp) = $${params.length}`;
    }
    query += " ORDER BY a.timestamp DESC";
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Errore caricamento log" });
  }
});

// --- PROFILO ADMIN ---
// Visualizza profilo admin
router.get("/api/admin/profile", authenticate, isAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, surname, email FROM users WHERE id=$1",
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Errore caricamento profilo" });
  }
});

// Modifica profilo admin
router.put("/api/admin/profile", authenticate, isAdmin, async (req, res) => {
  try {
    const { name, surname, password } = req.body;
    if (password && password.trim() !== "") {
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        "UPDATE users SET name=$1, surname=$2, password_hash=$3 WHERE id=$4",
        [name, surname, hash, req.user.id]
      );
    } else {
      await pool.query(
        "UPDATE users SET name=$1, surname=$2 WHERE id=$3",
        [name, surname, req.user.id]
      );
    }
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Errore aggiornamento profilo" });
  }
});
// Lista tutti gli spazi (con nome sede e manager)
router.get('/api/admin/spaces', authenticate, isAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, l.name AS location_name, l.city, l.manager_id
      FROM spaces s
      JOIN locations l ON s.location_id = l.id
      ORDER BY s.id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Errore caricamento spazi" });
  }
});

// Crea spazio
router.post('/api/admin/spaces', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, type, capacity, location_id } = req.body;
    await pool.query(
      `INSERT INTO spaces (name, type, capacity, location_id) VALUES ($1,$2,$3,$4)`,
      [name, type, capacity, location_id]
    );
    res.sendStatus(201);
  } catch (err) {
    res.status(500).json({ error: "Errore creazione spazio" });
  }
});

// Modifica spazio
router.put('/api/admin/spaces/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, type, capacity, location_id } = req.body;
    await pool.query(
      `UPDATE spaces SET name=$1, type=$2, capacity=$3, location_id=$4 WHERE id=$5`,
      [name, type, capacity, location_id, req.params.id]
    );
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Errore modifica spazio" });
  }
});

// Elimina spazio
router.delete('/api/admin/spaces/:id', authenticate, isAdmin, async (req, res) => {
  try {
    await pool.query(`DELETE FROM spaces WHERE id=$1`, [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Errore eliminazione spazio" });
  }
});
// Lista tutte le postazioni (con nome spazio e sede)
router.get('/api/admin/workstations', authenticate, isAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT w.*, s.name AS space_name, l.name AS location_name
      FROM workstations w
      JOIN spaces s ON w.space_id = s.id
      JOIN locations l ON s.location_id = l.id
      ORDER BY w.id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Errore caricamento postazioni" });
  }
});

// Crea postazione
router.post('/api/admin/workstations', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, space_id, extra_features } = req.body;
    await pool.query(
      `INSERT INTO workstations (name, space_id, extra_features) VALUES ($1,$2,$3)`,
      [name, space_id, extra_features]
    );
    res.sendStatus(201);
  } catch (err) {
    res.status(500).json({ error: "Errore creazione postazione" });
  }
});

// Modifica postazione
router.put('/api/admin/workstations/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, space_id, extra_features } = req.body;
    await pool.query(
      `UPDATE workstations SET name=$1, space_id=$2, extra_features=$3 WHERE id=$4`,
      [name, space_id, extra_features, req.params.id]
    );
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Errore modifica postazione" });
  }
});

// Elimina postazione
router.delete('/api/admin/workstations/:id', authenticate, isAdmin, async (req, res) => {
  try {
    await pool.query(`DELETE FROM workstations WHERE id=$1`, [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Errore eliminazione postazione" });
  }
});
router.get('/api/admin/stats/global', authenticate, isAdmin, async (req, res) => {
  try {
    const [{ count: utenti }] = (await pool.query('SELECT COUNT(*) FROM users')).rows;
    const [{ count: sedi }] = (await pool.query('SELECT COUNT(*) FROM locations')).rows;
    const [{ count: spazi }] = (await pool.query('SELECT COUNT(*) FROM spaces')).rows;
    const [{ count: postazioni }] = (await pool.query('SELECT COUNT(*) FROM workstations')).rows;
    const [{ count: prenotazioni }] = (await pool.query('SELECT COUNT(*) FROM bookings')).rows;
    const [{ totale: revenue }] = (await pool.query("SELECT COALESCE(SUM(amount),0) AS totale FROM payments WHERE status='completato'")).rows;
    res.json({ utenti, sedi, spazi, postazioni, prenotazioni, revenue });
  } catch (err) {
    res.status(500).json({ error: "Errore statistiche" });
  }
});
router.get('/api/admin/stats/by-location', authenticate, isAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT l.name, COUNT(b.id) as prenotazioni, COALESCE(SUM(p.amount),0) as revenue
      FROM locations l
      LEFT JOIN spaces s ON s.location_id = l.id
      LEFT JOIN workstations w ON w.space_id = s.id
      LEFT JOIN bookings b ON b.workstation_id = w.id
      LEFT JOIN payments p ON p.booking_id = b.id AND p.status='completato'
      GROUP BY l.id, l.name
      ORDER BY prenotazioni DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Errore statistiche sedi" });
  }
});
// Notifica a singolo utente
router.post('/api/admin/notifications', authenticate, isAdmin, async (req, res) => {
  try {
    const { user_id, message, role } = req.body;
    if (user_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, message) VALUES ($1,$2)`, [user_id, message]
      );
    } else if (role) {
      // invia a tutti gli utenti con quel ruolo
      await pool.query(
        `INSERT INTO notifications (user_id, message)
        SELECT id, $1 FROM users WHERE role=$2`, [message, role]
      );
    } else {
      return res.status(400).json({ error: "user_id o role obbligatorio" });
    }
    res.sendStatus(201);
  } catch (err) {
    res.status(500).json({ error: "Errore invio notifica" });
  }
});

router.get('/api/admin/logs/export', authenticate, isAdmin, async (req, res) => {
  try {
    // Opzionale: usa stessi filtri di /logs
    let query = `SELECT a.id, a.action, a.target, a.timestamp, u.name AS user_name, u.surname AS user_surname
      FROM activity_logs a JOIN users u ON a.user_id = u.id WHERE 1=1`;
    let params = [];
    // ...aggiungi filtri se servono...
    const { rows } = await pool.query(query, params);
    const parser = new Parser();
    const csv = parser.parse(rows);
    res.header('Content-Type', 'text/csv');
    res.attachment('logs.csv');
    return res.send(csv);
  } catch (err) {
    res.status(500).json({ error: "Errore export log" });
  }
});
// Lista tutte le recensioni con info utente/sede
router.get("/api/admin/reviews", authenticate, isAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, u.name as user_name, l.name as location_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN locations l ON r.location_id = l.id
      ORDER BY r.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Errore caricamento recensioni" });
  }
});

// Elimina recensione
router.delete("/api/admin/reviews/:id", authenticate, isAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM reviews WHERE id=$1", [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Errore eliminazione recensione" });
  }
});
// Lista tutte le disponibilità
router.get('/api/admin/availability', authenticate, isAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, w.name as workstation_name, s.name as space_name, l.name as location_name
      FROM availability a
      JOIN workstations w ON a.workstation_id = w.id
      JOIN spaces s ON w.space_id = s.id
      JOIN locations l ON s.location_id = l.id
      ORDER BY a.date DESC, a.time_slot DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Errore caricamento disponibilità" });
  }
});

// Express.js
router.delete("/api/admin/notifications/:id", authenticate, isAdmin, async (req, res) => {
  await pool.query("DELETE FROM notifications WHERE id=$1", [req.params.id]);
  res.sendStatus(204);
});
// In cima: const pool = require("../db"); // O come hai chiamato il pool
router.get('/api/admin/notifications/list', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Errore nel recupero notifiche:", err);
    res.status(500).json({ error: "Errore caricamento notifiche" });
  }
});
router.post('/api/admin/notifications', authenticate, isAdmin, async (req, res) => {
  try {
    const { user_id, message, role } = req.body;
    if (user_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, message) VALUES ($1,$2)`, [user_id, message]
      );
    } else if (role) {
      // invia a tutti gli utenti con quel ruolo
      await pool.query(
        `INSERT INTO notifications (user_id, message)
        SELECT id, $1 FROM users WHERE role=$2`, [message, role]
      );
    } else {
      return res.status(400).json({ error: "user_id o role obbligatorio" });
    }
    res.sendStatus(201);
  } catch (err) {
    res.status(500).json({ error: "Errore invio notifica" });
  }
});



module.exports = router;
