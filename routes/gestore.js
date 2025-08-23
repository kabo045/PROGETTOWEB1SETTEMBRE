const express = require("express");
const router = express.Router();
const pool = require("../db/db");
const { authenticate } = require("../middleware/authenticate");

function checkGestore(req, res, next) {
  if (req.user.role !== "gestore") {
    return res.status(403).json({ error: "Accesso riservato ai gestori" });
  }
  next();
}

// ========================
// PROFILO GESTORE
// ========================
router.get("/account", authenticate, checkGestore, async (req, res) => {
  try {
    const q = await pool.query("SELECT id, name, email FROM users WHERE id = $1", [req.user.id]);
    if (q.rows.length === 0) return res.status(404).json({ error: "Utente non trovato" });
    res.json(q.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Errore recupero profilo" });
  }
});

router.put("/account", authenticate, checkGestore, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Nome ed email obbligatori" });
    let q;
    if (password) {
      q = await pool.query(
        "UPDATE users SET name=$1, email=$2, password_hash=$3 WHERE id=$4 RETURNING id, name, email",
        [name, email, password, req.user.id]
      );
    } else {
      q = await pool.query(
        "UPDATE users SET name=$1, email=$2 WHERE id=$3 RETURNING id, name, email",
        [name, email, req.user.id]
      );
    }
    res.json(q.rows[0]);
  }catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});

// ========================
// SEDI (LOCATIONS) — CON PRICE
// ========================

// GET tutte le sedi del gestore, con prezzo
router.get("/sedi", authenticate, checkGestore, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, city, address, price, cap, tipologia, image_url, services FROM locations WHERE manager_id = $1",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});

router.post("/sedi", authenticate, checkGestore, async (req, res) => {
  const { name, city, address, cap, tipologia, image_url, services, price } = req.body;

  // Parsing servizi: sempre array o null
  let serviziArray = null;
  if (Array.isArray(services)) {
    serviziArray = services;
  } else if (typeof services === "string" && services.includes(',')) {
    serviziArray = services.split(',').map(s => s.trim()).filter(Boolean);
  } else if (typeof services === "string" && services.trim()) {
    serviziArray = [services.trim()];
  } else {
    serviziArray = null;
  }

  if (!name || !city) {
    return res.status(400).json({ error: "Nome e città sono obbligatori." });
  }
  try {
    const result = await pool.query(
      `INSERT INTO locations (name, city, address, cap, tipologia, image_url, services, price, manager_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, city, address, price, cap, tipologia, image_url, services`,
      [
        name,
        city,
        address || null,
        cap || null,
        tipologia || null,
        image_url || null,
        serviziArray,
        price || null,
        req.user.id
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Errore nella route X:", err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});


// PATCH modifica sede (aggiungi price)
router.patch("/sedi/:id", authenticate, checkGestore, async (req, res) => {
  const id = req.params.id;
  const { name, address, city, cap, tipologia, image_url, services, price } = req.body;
  try {
    const check = await pool.query(
      "SELECT id FROM locations WHERE id = $1 AND manager_id = $2",
      [id, req.user.id]
    );
    if (check.rows.length === 0)
      return res.status(403).json({ error: "Accesso negato o sede non trovata" });

    const q = await pool.query(
      `UPDATE locations SET name=$1, address=$2, city=$3, cap=$4, tipologia=$5, image_url=$6, services=$7, price=$8
       WHERE id=$9 RETURNING id, name, city, address, price, cap, tipologia, image_url, services`,
      [
        name,
        address || null,
        city,
        cap || null,
        tipologia || null,
        image_url || null,
        Array.isArray(services) ? services : services ? [services] : null,
        price || null,
        id
      ]
    );
    res.json(q.rows[0]);
  } catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});

// DELETE sede
router.delete("/sedi/:id", authenticate, checkGestore, async (req, res) => {
  try {
    const check = await pool.query(
      "SELECT id FROM locations WHERE id = $1 AND manager_id = $2",
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0)
      return res.status(403).json({ error: "Accesso negato o sede non trovata" });

    await pool.query("DELETE FROM locations WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});

// ========================
// SPAZI (SPACES)
// ========================

// --- GET SPAZI DI UNA SEDE ---
router.get("/sedi/:sedeId/spazi", authenticate, checkGestore, async (req, res) => {
  try {
    const sedeId = req.params.sedeId;
    const sede = await pool.query(
      "SELECT * FROM locations WHERE id = $1 AND manager_id = $2",
      [sedeId, req.user.id]
    );
    if (sede.rows.length === 0)
      return res.status(403).json({ error: "Accesso non autorizzato o sede non trovata" });

    const spazi = await pool.query(
      "SELECT * FROM spaces WHERE location_id = $1 ORDER BY name",
      [sedeId]
    );
    res.json(spazi.rows);
  } catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});
// --- CREA NUOVO SPAZIO CON NOTIFICA E AGGIORNA TIPOLOGIA SEDE ---
router.post("/sedi/:sedeId/spazi", authenticate, checkGestore, async (req, res) => {
  try {
    const sedeId = req.params.sedeId;
    const { name, type, capacity } = req.body;
    if (!name || !type || !capacity) {
      return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
    }

    // 1. Verifica che la sede sia tua
    const sede = await pool.query(
      "SELECT * FROM locations WHERE id = $1 AND manager_id = $2",
      [sedeId, req.user.id]
    );
    if (sede.rows.length === 0)
      return res.status(403).json({ error: "Accesso non autorizzato o sede non trovata" });

    // 2. Inserisci lo spazio
    const spazio = await pool.query(
      `INSERT INTO spaces (location_id, name, type, capacity)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [sedeId, name, type, capacity]
    );

    // 3. Aggiorna la colonna tipologia della sede (aggiungi se nuova)
    let tipologiaAttuale = sede.rows[0].tipologia || "";
    let tipologieSet = new Set(
      tipologiaAttuale
        .split(",")
        .map(t => t.trim())
        .filter(Boolean)
    );
    if (!tipologieSet.has(type)) {
      tipologieSet.add(type);
      const nuoveTipologie = Array.from(tipologieSet).join(", ");
      await pool.query(
        `UPDATE locations SET tipologia = $1 WHERE id = $2`,
        [nuoveTipologie, sedeId]
      );
    }

    // 4. NOTIFICA
    await pool.query(
      `INSERT INTO notifications (user_id, message, read, created_at)
       VALUES ($1, $2, false, NOW())`,
      [req.user.id, `✅ Spazio "${name}" creato con successo nella sede ${sede.rows[0].name}.`]
    );

    res.status(201).json(spazio.rows[0]);
  } catch (err) {
    console.error("Errore nella route X:", err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});


// --- MODIFICA SPAZIO CON NOTIFICA ---
router.patch("/spazi/:id", authenticate, checkGestore, async (req, res) => {
  try {
    const spazioId = req.params.id;
    const { name, type, capacity } = req.body;
    const check = await pool.query(
      `SELECT s.*, l.name as sede_nome FROM spaces s
        JOIN locations l ON s.location_id = l.id
        WHERE s.id = $1 AND l.manager_id = $2`,
      [spazioId, req.user.id]
    );
    if (check.rows.length === 0)
      return res.status(403).json({ error: "Accesso non autorizzato o spazio non trovato" });

    const spazio = await pool.query(
      `UPDATE spaces SET name=$1, type=$2, capacity=$3 WHERE id=$4 RETURNING *`,
      [name, type, capacity, spazioId]
    );

    // --- NOTIFICA ---
    await pool.query(
      `INSERT INTO notifications (user_id, message, read, created_at)
       VALUES ($1, $2, false, NOW())`,
      [req.user.id, `ℹ️ Spazio "${name}" aggiornato nella sede ${check.rows[0].sede_nome}.`]
    );

    res.json(spazio.rows[0]);
  } catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});

// --- ELIMINA SPAZIO CON NOTIFICA ---
router.delete("/spazi/:id", authenticate, checkGestore, async (req, res) => {
  try {
    const spazioId = req.params.id;
    const check = await pool.query(
      `SELECT s.*, l.name as sede_nome FROM spaces s
        JOIN locations l ON s.location_id = l.id
        WHERE s.id = $1 AND l.manager_id = $2`,
      [spazioId, req.user.id]
    );
    if (check.rows.length === 0)
      return res.status(403).json({ error: "Accesso non autorizzato o spazio non trovato" });

    const nomeSpazio = check.rows[0].name;
    const sedeNome = check.rows[0].sede_nome;

    await pool.query("DELETE FROM workstations WHERE space_id = $1", [spazioId]);
    await pool.query("DELETE FROM spaces WHERE id = $1", [spazioId]);

    // --- NOTIFICA ---
    await pool.query(
      `INSERT INTO notifications (user_id, message, read, created_at)
       VALUES ($1, $2, false, NOW())`,
      [req.user.id, `❌ Spazio "${nomeSpazio}" eliminato dalla sede ${sedeNome}.`]
    );

    res.json({ ok: true });
  }catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});


// ========================
// POSTAZIONI (WORKSTATIONS)
// ========================

router.get("/spazi/:spazioId/postazioni", authenticate, checkGestore, async (req, res) => {
  try {
    const spazioId = req.params.spazioId;
    const check = await pool.query(
      `SELECT s.* FROM spaces s
        JOIN locations l ON s.location_id = l.id
        WHERE s.id = $1 AND l.manager_id = $2`,
      [spazioId, req.user.id]
    );
    if (check.rows.length === 0)
      return res.status(403).json({ error: "Accesso non autorizzato o spazio non trovato" });

    const postazioni = await pool.query(
      "SELECT * FROM workstations WHERE space_id = $1 ORDER BY id",
      [spazioId]
    );
    res.json(postazioni.rows);
  } catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});

router.post("/spazi/:spazioId/postazioni", authenticate, checkGestore, async (req, res) => {
  try {
    const spazioId = req.params.spazioId;
    const { name, extra_features } = req.body;
    if (!name) return res.status(400).json({ error: "Il nome è obbligatorio" });

    const check = await pool.query(
      `SELECT s.* FROM spaces s
        JOIN locations l ON s.location_id = l.id
        WHERE s.id = $1 AND l.manager_id = $2`,
      [spazioId, req.user.id]
    );
    if (check.rows.length === 0)
      return res.status(403).json({ error: "Accesso non autorizzato o spazio non trovato" });

    const result = await pool.query(
      `INSERT INTO workstations (space_id, name, extra_features)
       VALUES ($1, $2, $3) RETURNING *`,
      [spazioId, name, extra_features || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});

router.delete("/postazioni/:id", authenticate, checkGestore, async (req, res) => {
  try {
    const postazioneId = req.params.id;
    const check = await pool.query(
      `SELECT w.* FROM workstations w
        JOIN spaces s ON w.space_id = s.id
        JOIN locations l ON s.location_id = l.id
        WHERE w.id = $1 AND l.manager_id = $2`,
      [postazioneId, req.user.id]
    );
    if (check.rows.length === 0)
      return res.status(403).json({ error: "Accesso non autorizzato o postazione non trovata" });

    await pool.query("DELETE FROM workstations WHERE id = $1", [postazioneId]);
    res.json({ ok: true });
  } catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});

// ========================
//   PRENOTAZIONI DEL GESTORE (dashboard)
// ========================
router.get("/prenotazioni", authenticate, checkGestore, async (req, res) => {
  try {
    const prenotazioni = await pool.query(
      `SELECT b.*, u.name as utente_nome, u.email as utente_email, 
              s.name as spazio, l.name as sede, l.image_url as sede_image_url, s.type as tipo_spazio
       FROM bookings b
       JOIN workstations w ON b.workstation_id = w.id
       JOIN spaces s ON w.space_id = s.id
       JOIN locations l ON s.location_id = l.id
       LEFT JOIN users u ON b.user_id = u.id
       WHERE l.manager_id = $1
       ORDER BY b.date DESC`,
      [req.user.id]
    );
    res.json(prenotazioni.rows);
  } catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});
// PATCH - Modifica stato prenotazione
router.patch('/gestore/prenotazioni/:id', authenticate, async (req, res) => {
  try {
    const gestoreId = req.user.id;
    const prenotazioneId = req.params.id;
    const { status } = req.body;

    if (!["confermato", "cancellato", "in attesa"].includes(status))
      return res.status(400).json({ message: "Stato non valido" });

    // Recupero info per notifica
    const result = await pool.query(
      `SELECT b.id, b.user_id, b.date, b.time_slot
       FROM bookings b
       WHERE b.id = $1`,
      [prenotazioneId]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Prenotazione non trovata" });

    const { user_id, date, time_slot } = result.rows[0];

    // Aggiorna stato
    await pool.query(
      `UPDATE bookings SET status = $1 WHERE id = $2`,
      [status, prenotazioneId]
    );

    // Notifica utente (cliente)
    const messaggioCliente = status === "confermato"
      ? `✅ Prenotazione approvata per il ${date} alle ${time_slot}`
      : status === "cancellato"
        ? `❌ Prenotazione rifiutata per il ${date} alle ${time_slot}`
        : null;

    if (messaggioCliente) {
      await pool.query(
        `INSERT INTO notifications (user_id, message, read, created_at)
         VALUES ($1, $2, false, NOW())`,
        [user_id, messaggioCliente]
      );
    }

    // Notifica anche il gestore!
    const messaggioGestore = status === "confermato"
      ? `Hai APPROVATO una prenotazione per il ${date} alle ${time_slot}`
      : status === "cancellato"
        ? `Hai RIFIUTATO una prenotazione per il ${date} alle ${time_slot}`
        : null;

    if (messaggioGestore) {
      await pool.query(
        `INSERT INTO notifications (user_id, message, read, created_at)
         VALUES ($1, $2, false, NOW())`,
        [gestoreId, messaggioGestore]
      );
    }

    res.json({ message: "Stato aggiornato" });
  } catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});

// DELETE - Elimina prenotazione
router.delete("/prenotazioni/:id", authenticate, checkGestore, async (req, res) => {
  try {
    const id = req.params.id;
    const check = await pool.query(
      `SELECT b.id
       FROM bookings b
       JOIN workstations w ON b.workstation_id = w.id
       JOIN spaces s ON w.space_id = s.id
       JOIN locations l ON s.location_id = l.id
       WHERE b.id = $1 AND l.manager_id = $2`,
      [id, req.user.id]
    );
    if (check.rows.length === 0) return res.status(403).json({ error: "Non autorizzato" });
    await pool.query("DELETE FROM bookings WHERE id = $1", [id]);
    res.json({ ok: true });
  } catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});

// ========================
//  DISPONIBILITA' POSTAZIONI (FASCE ORARIE)
// ========================

router.get("/spazi/:postazioneId/disponibilita", authenticate, checkGestore, async (req, res) => {
  try {
    const postazioneId = req.params.postazioneId;
    const check = await pool.query(
      `SELECT w.id FROM workstations w
        JOIN spaces s ON w.space_id = s.id
        JOIN locations l ON s.location_id = l.id
        WHERE w.id = $1 AND l.manager_id = $2`,
      [postazioneId, req.user.id]
    );
    if (check.rows.length === 0)
      return res.status(403).json({ error: "Non autorizzato o postazione non trovata" });

    const q = await pool.query(
      `SELECT * FROM availability 
       WHERE workstation_id = $1
       ORDER BY date DESC, time_slot ASC`,
      [postazioneId]
    );
    res.json(q.rows);
  }catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});

router.post("/spazi/:postazioneId/disponibilita", authenticate, checkGestore, async (req, res) => {
  try {
    const postazioneId = req.params.postazioneId;
    const { date, time_slot } = req.body;
    if (!date || !time_slot) return res.status(400).json({ error: "Data e fascia obbligatori" });

    const check = await pool.query(
      `SELECT w.id FROM workstations w
        JOIN spaces s ON w.space_id = s.id
        JOIN locations l ON s.location_id = l.id
        WHERE w.id = $1 AND l.manager_id = $2`,
      [postazioneId, req.user.id]
    );
    if (check.rows.length === 0)
      return res.status(403).json({ error: "Non autorizzato o postazione non trovata" });

    const already = await pool.query(
      `SELECT * FROM availability WHERE workstation_id = $1 AND date = $2 AND time_slot = $3`,
      [postazioneId, date, time_slot]
    );
    if (already.rows.length > 0) return res.status(409).json({ error: "Fascia già presente!" });

    const q = await pool.query(
      `INSERT INTO availability (workstation_id, date, time_slot, available)
       VALUES ($1, $2, $3, true) RETURNING *`,
      [postazioneId, date, time_slot]
    );
    res.status(201).json(q.rows[0]);
  } catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});

router.delete("/disponibilita/:id", authenticate, checkGestore, async (req, res) => {
  try {
    const id = req.params.id;
    const check = await pool.query(
      `SELECT a.id FROM availability a
        JOIN workstations w ON a.workstation_id = w.id
        JOIN spaces s ON w.space_id = s.id
        JOIN locations l ON s.location_id = l.id
        WHERE a.id = $1 AND l.manager_id = $2`,
      [id, req.user.id]
    );
    if (check.rows.length === 0)
      return res.status(403).json({ error: "Non autorizzato o disponibilità non trovata" });

    await pool.query("DELETE FROM availability WHERE id = $1", [id]);
    res.json({ ok: true });
  } catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});
// ===============
// PRENOTAZIONI PER UNA POSTAZIONE (per gestione fasce orarie)
// ===============
router.get("/spazi/:postazioneId/prenotazioni", authenticate, checkGestore, async (req, res) => {
  try {
    const postazioneId = req.params.postazioneId;
    // Sicurezza: controlla che la postazione sia gestita da questo gestore!
    const check = await pool.query(
      `SELECT w.id FROM workstations w
        JOIN spaces s ON w.space_id = s.id
        JOIN locations l ON s.location_id = l.id
        WHERE w.id = $1 AND l.manager_id = $2`,
      [postazioneId, req.user.id]
    );
    if (check.rows.length === 0)
      return res.status(403).json({ error: "Non autorizzato o postazione non trovata" });

    const result = await pool.query(
      `SELECT b.date, b.time_slot, u.name AS cliente_name, u.email AS cliente_email
         FROM bookings b
         JOIN users u ON b.user_id = u.id
        WHERE b.workstation_id = $1 AND b.status = 'confermato'
        ORDER BY b.date DESC, b.time_slot ASC`,
      [postazioneId]
    );
    res.json(result.rows);
  } catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});
// PATCH prenotazione (cambia stato) e notifica l’utente
router.patch('/prenotazioni/:id', authenticate, async (req, res) => {
  try {
    const gestoreId = req.user.id;
    const prenotazioneId = req.params.id;
    const { status } = req.body;

    if (!["confermato", "cancellato", "in attesa"].includes(status))
      return res.status(400).json({ message: "Stato non valido" });

    // Recupero info per notifica
    const result = await pool.query(
      `SELECT b.id, b.user_id, b.date, b.time_slot
       FROM bookings b
       WHERE b.id = $1`,
      [prenotazioneId]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Prenotazione non trovata" });

    const { user_id, date, time_slot } = result.rows[0];

    // Aggiorna stato
    await pool.query(
      `UPDATE bookings SET status = $1 WHERE id = $2`,
      [status, prenotazioneId]
    );

    // Notifica utente
    const messaggio = status === "confermato"
      ? `✅ Prenotazione approvata per il ${date} alle ${time_slot}`
      : status === "cancellato"
        ? `❌ Prenotazione rifiutata per il ${date} alle ${time_slot}`
        : null;

    if (messaggio) {
      await pool.query(
        `INSERT INTO notifications (user_id, message, read, created_at)
         VALUES ($1, $2, false, NOW())`,
        [user_id, messaggio]
      );
    }

    res.json({ message: "Stato aggiornato" });
  } catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});
router.get('/gestore/prenotazioni/:id', authenticate, checkGestore, async (req, res) => {
  try {
    const id = req.params.id;
    // Sicurezza: controlla che la prenotazione sia davvero sotto la gestione del gestore loggato
    const result = await pool.query(
      `SELECT b.*, u.name AS cliente_name, u.email AS cliente_email, l.manager_id
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN workstations w ON b.workstation_id = w.id
       JOIN spaces s ON w.space_id = s.id
       JOIN locations l ON s.location_id = l.id
       WHERE b.id = $1 AND l.manager_id = $2`,
      [id, req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Prenotazione non trovata o non autorizzato" });
    res.json(result.rows[0]);
  } catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});


// Tutte le richieste di assistenza dei clienti delle sedi del gestore (con filtri)
router.get('/support', authenticate, checkGestore, async (req, res) => {
  try {
    const manager_id = req.user.id;
    let { stato, search } = req.query;
    let query = `
      SELECT sr.*, u.name as user_name, u.email as user_email
      FROM support_requests sr
      JOIN users u ON sr.user_id = u.id
      WHERE sr.location_id IN (
        SELECT id FROM locations WHERE manager_id = $1
      )
    `;
    let params = [manager_id];
    if (stato) {
      params.push(stato);
      query += ` AND sr.status = $${params.length}`;
    }
    if (search) {
      params.push('%'+search.toLowerCase()+'%');
      query += ` AND (LOWER(u.name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`;
    }
    query += " ORDER BY sr.created_at DESC";
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});
// RECENSIONI DELLE SEDI DEL GESTORE
router.get('/recensioni', authenticate, checkGestore, async (req, res) => {
  try {
    const q = await pool.query(
      `SELECT r.*, u.name as user_name, l.name as location_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN locations l ON r.location_id = l.id
       WHERE l.manager_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json(q.rows);
  } catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});
// Cambia stato richiesta supporto (aperta <-> risolta)
router.put('/support/:id/status', authenticate, checkGestore, async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    // Verifica che la richiesta appartenga a una sede del gestore
    const check = await pool.query(
      `SELECT sr.* FROM support_requests sr
       JOIN locations l ON sr.location_id = l.id
       WHERE sr.id = $1 AND l.manager_id = $2`,
      [id, req.user.id]
    );
    if (!check.rowCount)
      return res.status(403).json({ error: "Non autorizzato o richiesta inesistente" });

    await pool.query(
      `UPDATE support_requests SET status = $1 WHERE id = $2`,
      [status, id]
    );
    res.json({ message: "Stato richiesta aggiornato!" });
  } catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});

router.get('/notifiche', authenticate, checkGestore, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, message, read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});
router.put('/notifiche/:id/letto', authenticate, checkGestore, async (req, res) => {
  try {
    // Controlla che la notifica sia del gestore
    const q = await pool.query(
      `SELECT id FROM notifications WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!q.rowCount) return res.status(404).json({ error: "Notifica non trovata" });

    await pool.query(`UPDATE notifications SET read=true WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});
router.delete('/notifiche/:id', authenticate, checkGestore, async (req, res) => {
  try {
    // Controlla che la notifica sia del gestore
    const q = await pool.query(
      `SELECT id FROM notifications WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!q.rowCount) return res.status(404).json({ error: "Notifica non trovata" });

    await pool.query(`DELETE FROM notifications WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  }catch (err) {
  console.error("Errore nella route X:", err); // <--- aggiungi questa riga!
  res.status(500).json({ error: 'Errore interno del server' });
}

});

module.exports = router;
