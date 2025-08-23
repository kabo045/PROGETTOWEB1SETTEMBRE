const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const bcrypt = require('bcrypt');
const { authenticate } = require('../middleware/authenticate');

// --- SEDE, SPAZI, POSTAZIONI ---

// Elenco sedi con filtri

router.get('/locations', authenticate, async (req, res) => {
  try {
    let { city, type, service } = req.query;
    let params = [];
    let query = `
      SELECT DISTINCT l.*
      FROM locations l
      WHERE EXISTS (
        SELECT 1
        FROM spaces s
        JOIN workstations w ON w.space_id = s.id
        JOIN availability a ON a.workstation_id = w.id
        WHERE s.location_id = l.id
          AND a.available = true
          AND a.date >= CURRENT_DATE
      )
    `;
    if (city) {
      query += ` AND l.city ILIKE $${params.length + 1}`;
      params.push(`%${city}%`);
    }
    if (type) {
      query += ` AND l.tipologia = $${params.length + 1}`;
      params.push(type);
    }
    if (service) {
      // Accetta anche 'wifi' oppure 'wifi,stampante,parcheggio'
      let serviziArr = Array.isArray(service)
        ? service
        : service.split(',').map(s => s.trim()).filter(Boolean);
      if (serviziArr.length > 0) {
        query += ` AND l.services && $${params.length + 1}::text[]`;
        params.push(serviziArr);
      }
    }
    query += " ORDER BY l.name";
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Errore caricamento sedi:", err);
    res.status(500).json({ message: 'Errore caricamento sedi' });
  }
});


// Spazi di una sede
router.get('/locations/:id/spaces', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT id, type, name, capacity FROM spaces WHERE location_id = $1',
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Errore caricamento spazi:", err);
    res.status(500).json({ message: 'Errore caricamento spazi' });
  }
});

// Postazioni di uno spazio
router.get('/spaces/:id/workstations', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const checkSpace = await pool.query('SELECT 1 FROM spaces WHERE id = $1', [id]);
    if (!checkSpace.rowCount) {
      return res.status(404).json({ message: 'Spazio non trovato' });
    }
    const { rows } = await pool.query(
      'SELECT id, name, extra_features FROM workstations WHERE space_id = $1',
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Errore caricamento postazioni:", err);
    res.status(500).json({ message: 'Errore caricamento postazioni' });
  }
});

// Disponibilità di una postazione per data
router.get('/workstations/:id/availability', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    const { rows } = await pool.query(
      'SELECT date, time_slot, available FROM availability WHERE workstation_id = $1 AND date = $2',
      [id, date]
    );
    res.json(rows);
  } catch (err) {
    console.error("Errore caricamento disponibilità:", err);
    res.status(500).json({ message: 'Errore caricamento disponibilità' });
  }
});

// --- PRENOTAZIONI ---

// --- PRENOTAZIONI ---

// PRENOTAZIONE (cliente) — supporta postazione e sala, e salva booking_amount
router.post('/bookings', authenticate, async (req, res) => {
  const user_id = req.user.id;
  const { workstation_id, space_id, date, time_slot } = req.body;

  if (!date || !time_slot || (!workstation_id && !space_id)) {
    return res.status(400).json({ message: "Dati prenotazione mancanti" });
  }

  // ====== SALA ======
  if (space_id && !workstation_id) {
    try {
      // evita doppie prenotazioni sulla stessa sala/slot
      const already = await pool.query(
        `SELECT 1 FROM bookings
         WHERE space_id=$1 AND date=$2 AND time_slot=$3 AND status!='cancellato'`,
        [space_id, date, time_slot]
      );
      if (already.rows.length) {
        return res.status(409).json({ message: "Spazio già prenotato!" });
      }

      // prezzo listino della sede
      const { rows: priceRows } = await pool.query(
        `SELECT l.price
         FROM spaces s
         JOIN locations l ON l.id = s.location_id
         WHERE s.id = $1`,
        [space_id]
      );
      const price = Number(priceRows[0]?.price ?? 0);

      const bookingResult = await pool.query(
        `INSERT INTO bookings (user_id, space_id, date, time_slot, status, booking_amount)
         VALUES ($1, $2, $3, $4, 'confermato', $5)
         RETURNING id`,
        [user_id, space_id, date, time_slot, price]
      );
      return res.status(201).json({ bookingId: bookingResult.rows[0].id });
    } catch (err) {
      console.error("❌ Errore prenotazione sala:", err);
      return res.status(500).json({ message: 'Errore durante la prenotazione' });
    }
  }

  // ====== POSTAZIONE ======
  if (workstation_id && !space_id) {
    const clientTrx = await pool.connect();
    try {
      await clientTrx.query('BEGIN');

      // lock availability per evitare race
      const availRes = await clientTrx.query(
        `SELECT id, available
         FROM availability
         WHERE workstation_id=$1 AND date=$2 AND time_slot=$3
         FOR UPDATE`,
        [workstation_id, date, time_slot]
      );
      if (!availRes.rows.length) {
        await clientTrx.query('ROLLBACK');
        return res.status(409).json({ message: "Slot non creato o non disponibile" });
      }
      if (!availRes.rows[0].available) {
        await clientTrx.query('ROLLBACK');
        return res.status(409).json({ message: "Slot già occupato" });
      }

      // prezzo listino della sede tramite workstation
      const { rows: priceRows } = await clientTrx.query(
        `SELECT l.price
         FROM workstations w
         JOIN spaces s ON s.id = w.space_id
         JOIN locations l ON l.id = s.location_id
         WHERE w.id = $1`,
        [workstation_id]
      );
      const price = Number(priceRows[0]?.price ?? 0);

      // inserisci booking con booking_amount = price
      const bookingRes = await clientTrx.query(
        `INSERT INTO bookings (user_id, workstation_id, date, time_slot, status, booking_amount)
         VALUES ($1, $2, $3, $4, 'confermato', $5)
         RETURNING id`,
        [user_id, workstation_id, date, time_slot, price]
      );

      // marca availability occupata
      await clientTrx.query(
        `UPDATE availability SET available = FALSE WHERE id = $1`,
        [availRes.rows[0].id]
      );

      await clientTrx.query('COMMIT');
      return res.status(201).json({ bookingId: bookingRes.rows[0].id });
    } catch (err) {
      await clientTrx.query('ROLLBACK');
      console.error("❌ Errore prenotazione postazione:", err);
      return res.status(500).json({ message: 'Errore durante la prenotazione' });
    } finally {
      clientTrx.release();
    }
  }

  return res.status(400).json({ message: "Richiesta non valida" });
});

// LISTA PRENOTAZIONI (cliente) — include importi calcolati
router.get('/bookings', authenticate, async (req, res) => {
  try {
    const user_id = req.user.id;
    const query = `
      SELECT
        b.id,
        b.user_id,
        b.workstation_id,
        b.space_id,
        b.date,
        b.time_slot,
        b.status,
        b.booking_amount,
        l.price AS location_price,
        COALESCE(b.booking_amount, l.price) AS amount_to_pay,   -- ✅ Importo da mostrare in UI
        s.id   AS space_id_resolved,
        s.type AS space_type,
        s.name AS space_name,
        w.name AS workstation_name,
        l.id   AS location_id,
        l.name AS location_name,
        l.city AS location_city,
        p.amount AS paid_amount,
        p.status AS payment_status
      FROM bookings b
      LEFT JOIN workstations w ON w.id = b.workstation_id
      LEFT JOIN spaces s       ON s.id = COALESCE(b.space_id, w.space_id)
      LEFT JOIN locations l    ON l.id = s.location_id
      LEFT JOIN payments p     ON p.booking_id = b.id
      WHERE b.user_id = $1
      ORDER BY b.date DESC, b.time_slot;
    `;
    const { rows } = await pool.query(query, [user_id]);
    res.json(rows);
  } catch (err) {
    console.error("Errore caricamento prenotazioni:", err);
    res.status(500).json({ message: 'Errore caricamento prenotazioni' });
  }
});



// Cancella una prenotazione (status cancellato, sblocca slot)
router.delete('/bookings/:id', authenticate, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;
    // Check proprietà
    const { rows } = await pool.query(
      'SELECT * FROM bookings WHERE id=$1 AND user_id=$2',
      [id, user_id]
    );
    if (!rows.length) return res.status(404).json({ message: "Prenotazione non trovata" });
    // Rendi disponibile lo slot
    await pool.query(
      'UPDATE availability SET available=TRUE WHERE workstation_id=$1 AND date=$2 AND time_slot=$3',
      [rows[0].workstation_id, rows[0].date, rows[0].time_slot]
    );
    // Cancella prenotazione (status)
    await pool.query(
      'UPDATE bookings SET status=\'cancellato\' WHERE id=$1',
      [id]
    );

    // 🔔 Notifica cancellazione
    await pool.query(
      `INSERT INTO notifications (user_id, message, read, created_at)
       VALUES ($1, $2, false, NOW())`,
      [user_id, '❌ La tua prenotazione è stata cancellata.']
    );
    res.json({ message: 'Prenotazione cancellata' });
  } catch (err) {
    console.error("Errore cancellazione prenotazione:", err);
    res.status(500).json({ message: 'Errore cancellazione prenotazione' });
  }
});

// --- PAGAMENTI ---
// PAGAMENTO prenotazione
router.post('/bookings/:id/pay', authenticate, async (req, res) => {
  const bookingId = req.params.id;
  const user_id = req.user.id;
  const { method = "Carta" } = req.body;

  try {
    // calcolo importo coerente con la GET
    const bookingRes = await pool.query(
      `SELECT COALESCE(b.booking_amount, l.price) AS amount_to_pay
       FROM bookings b
       LEFT JOIN workstations w ON w.id = b.workstation_id
       LEFT JOIN spaces s       ON s.id = COALESCE(b.space_id, w.space_id)
       LEFT JOIN locations l    ON l.id = s.location_id
       WHERE b.id=$1 AND b.user_id=$2`,
      [bookingId, user_id]
    );
    if (!bookingRes.rows.length) {
      return res.status(404).json({ message: "Prenotazione non trovata" });
    }

    const importo = Number(bookingRes.rows[0]?.amount_to_pay ?? 0);

    await pool.query(
      `INSERT INTO payments (booking_id, amount, status, method, timestamp)
       VALUES ($1, $2, 'completato', $3, NOW())
       ON CONFLICT (booking_id)
       DO UPDATE SET amount=EXCLUDED.amount, status='completato', method=EXCLUDED.method, timestamp=NOW()`,
      [bookingId, importo, method]
    );

    await pool.query(
      `INSERT INTO notifications (user_id, message, read, created_at)
       VALUES ($1, $2, false, NOW())`,
      [user_id, '💳 Pagamento effettuato con successo!']
    );

    res.json({ message: "Pagamento completato!", amount: importo });
  } catch (err) {
    console.error("Errore pagamento:", err);
    res.status(500).json({ message: 'Errore pagamento' });
  }
});


// Storico pagamenti cliente
// Storico pagamenti cliente (supporta postazioni e sale)
router.get('/payments', authenticate, async (req, res) => {
  try {
    const user_id = req.user.id;
    const query = `
      SELECT
        p.*,
        b.id AS booking_id,
        l.name AS location_name,
        s.type AS space_type,
        s.name AS space_name,
        w.name AS workstation_name,
        b.date,
        b.time_slot
      FROM payments p
      LEFT JOIN bookings b   ON p.booking_id = b.id
      LEFT JOIN workstations w ON w.id = b.workstation_id
      LEFT JOIN spaces s       ON s.id = COALESCE(b.space_id, w.space_id)
      LEFT JOIN locations l    ON l.id = s.location_id
      WHERE b.user_id = $1
      ORDER BY p.timestamp DESC
    `;
    const { rows } = await pool.query(query, [user_id]);
    res.json(rows);
  } catch (err) {
    console.error("Errore caricamento pagamenti:", err);
    res.status(500).json({ message: 'Errore caricamento pagamenti' });
  }
});


// --- ACCOUNT CLIENTE ---

router.get('/account', authenticate, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { rows } = await pool.query(
      'SELECT id, name, surname, email, phone FROM users WHERE id = $1',
      [user_id]
    );
    if (!rows.length) return res.status(404).json({ message: "Utente non trovato" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Errore caricamento profilo:", err);
    res.status(500).json({ message: 'Errore caricamento profilo' });
  }
});

router.put('/account', authenticate, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { name, surname, email, phone } = req.body;
    let updateFields = [], params = [], idx = 1;
    if (name) { updateFields.push(`name = $${idx++}`); params.push(name); }
    if (surname) { updateFields.push(`surname = $${idx++}`); params.push(surname); }
    if (email) { updateFields.push(`email = $${idx++}`); params.push(email); }
    if (phone) { updateFields.push(`phone = $${idx++}`); params.push(phone); }
    if (!updateFields.length) return res.status(400).json({ message: "Nessun campo da aggiornare" });
    params.push(user_id);
    await pool.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${params.length}`,
      params
    );
    res.json({ message: "Profilo aggiornato" });
  } catch (err) {
    console.error("Errore aggiornamento profilo:", err);
    res.status(500).json({ message: 'Errore aggiornamento profilo' });
  }
});

router.put('/account/password', authenticate, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { password } = req.body;
    if (!password || password.length < 8)
      return res.status(400).json({ message: "Password troppo corta" });
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hash, user_id]
    );
    res.json({ message: "Password aggiornata" });
  } catch (err) {
    console.error("Errore aggiornamento password:", err);
    res.status(500).json({ message: 'Errore aggiornamento password' });
  }
});

router.delete('/account', authenticate, async (req, res) => {
  try {
    const user_id = req.user.id;
    await pool.query('DELETE FROM notifications WHERE user_id=$1', [user_id]);
    await pool.query('DELETE FROM bookings WHERE user_id=$1', [user_id]);
    await pool.query('DELETE FROM users WHERE id=$1', [user_id]);
    res.json({ message: "Account eliminato" });
  } catch (err) {
    console.error("Errore eliminazione account:", err);
    res.status(500).json({ message: "Errore eliminazione account" });
  }
});

// Backend (Express)
router.get('/notifications', authenticate, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { rows } = await pool.query(
      `SELECT id, message, read, created_at
       FROM notifications
       WHERE user_id = $1
          OR user_id IS NULL
       ORDER BY created_at DESC`,
      [user_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Errore caricamento notifiche:", err);
    res.status(500).json({ message: 'Errore caricamento notifiche' });
  }
});


router.put('/notifications/:id/read', authenticate, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;
    // Controlla che sia la sua notifica personale
    const { rows } = await pool.query(
      'SELECT * FROM notifications WHERE id=$1 AND user_id=$2',
      [id, user_id]
    );
    if (!rows.length)
      return res.status(404).json({ message: "Notifica non trovata o non modificabile" });

    await pool.query(
      'UPDATE notifications SET read=TRUE WHERE id=$1',
      [id]
    );
    res.json({ message: "Notifica segnata come letta" });
  } catch (err) {
    console.error("Errore aggiornamento notifica:", err);
    res.status(500).json({ message: 'Errore aggiornamento notifica' });
  }
});
router.delete('/notifications/:id', authenticate, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;
    // Puoi cancellare solo notifiche personali, non quelle broadcast
    const { rows } = await pool.query(
      'SELECT * FROM notifications WHERE id=$1 AND user_id=$2',
      [id, user_id]
    );
    if (!rows.length)
      return res.status(404).json({ message: "Notifica non trovata o non eliminabile" });

    await pool.query(
      'DELETE FROM notifications WHERE id=$1',
      [id]
    );
    res.json({ message: "Notifica eliminata" });
  } catch (err) {
    console.error("Errore eliminazione notifica:", err);
    res.status(500).json({ message: 'Errore eliminazione notifica' });
  }
});


// --- RECUPERO PASSWORD (placeholder demo) ---
router.post('/recupera-password', async (req, res) => {
  try {
    const { email } = req.body;
    const { rows } = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (!rows.length)
      return res.status(404).json({ message: "Email non trovata" });
    res.json({ message: "Email di recupero inviata (simulato)" });
  } catch (err) {
    console.error("Errore recupero password:", err);
    res.status(500).json({ message: "Errore recupero password" });
  }
});
router.post('/support', authenticate, async (req, res) => {
  const user_id = req.user.id;
  const { subject, message, location_id } = req.body;
  if (!subject || !message || !location_id)
    return res.status(400).json({ message: "Oggetto, messaggio e sede obbligatori" });
  await pool.query(
    'INSERT INTO support_requests (user_id, location_id, subject, message, created_at) VALUES ($1,$2,$3,$4,NOW())',
    [user_id, location_id, subject, message]
  );
  res.sendStatus(201);
});

// recensioni
// GET /client/reviews?location_id=...&rating=...
router.get('/reviews', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT r.*, u.name as user_name, l.name as location_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN locations l ON r.location_id = l.id
      WHERE 1=1
    `;
    let params = [];
    if (req.query.location_id) {
      params.push(req.query.location_id);
      query += ` AND r.location_id = $${params.length}`;
    }
    if (req.query.rating) {
      params.push(req.query.rating);
      query += ` AND r.rating = $${params.length}`;
    }
    query += " ORDER BY r.created_at DESC";
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Errore caricamento recensioni" });
  }
});
// POST /client/reviews
router.post('/reviews', authenticate, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { location_id, rating, comment } = req.body;
    if (!location_id || !rating || !comment)
      return res.status(400).json({ error: "Tutti i campi sono obbligatori." });
    await pool.query(
      `INSERT INTO reviews (user_id, location_id, rating, comment, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [user_id, location_id, rating, comment]
    );
    res.sendStatus(201);
  } catch (err) {
    res.status(500).json({ error: "Errore inserimento recensione" });
  }
});
// --- RECENSIONI PUBBLICHE ---
// GET /public/reviews?location_id=...&rating=...
router.get('/public/reviews', async (req, res) => {
  try {
    let query = `
      SELECT r.*, u.name as user_name, l.name as location_name, l.image_url
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN locations l ON r.location_id = l.id
      WHERE 1=1
    `;
    let params = [];
    if (req.query.location_id) {
      params.push(req.query.location_id);
      query += ` AND r.location_id = $${params.length}`;
    }
    if (req.query.rating) {
      params.push(req.query.rating);
      query += ` AND r.rating = $${params.length}`;
    }
    query += " ORDER BY r.created_at DESC";
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Errore caricamento recensioni pubbliche" });
  }
});


// --- SEDI PUBBLICHE ---
// GET /api/public/locations
router.get('/public/locations', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, city, tipologia, address, image_url
      FROM locations
      ORDER BY name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Errore caricamento sedi" });
  }
});

module.exports = router;
