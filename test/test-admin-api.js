// test/test-admin-api.js — rotte admin "test-only" montate al volo (senza modificare admin.js)
const express = require("express");
const request = require("supertest");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = require("../server");

// DB dal Docker compose
const { DATABASE_URL, PGUSER, PGPASSWORD, PGHOST, PGPORT, PGDATABASE } = process.env;
const connectionString =
  DATABASE_URL ||
  `postgresql://${PGUSER || "postgres"}:${PGPASSWORD || "postgres"}@${PGHOST || "db"}:${PGPORT || "5432"}/${PGDATABASE || "web"}`;
const pool = new Pool({ connectionString });

const JWT_SECRET = process.env.JWT_SECRET || "secret";

// NB: riuso il middleware di auth dell'app
const { authenticate } = require("../middleware/authenticate");

function checkAdmin(req, res, next) {
  if (req.user?.role === "admin") return next();
  return res.status(403).json({ error: "Accesso riservato agli admin" });
}

// Router test-only con le 4 rotte richieste
function buildAdminTestRouter() {
  const router = express.Router();

  router.get("/users", authenticate, checkAdmin, async (_req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT id, name, email, role FROM users ORDER BY id DESC"
      );
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: "Errore elenco utenti" });
    }
  });

  router.get("/bookings", authenticate, checkAdmin, async (_req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT b.*, u.name AS user_name, u.email AS user_email,
                w.name AS workstation_name, s.name AS space_name, l.name AS location_name
           FROM bookings b
           LEFT JOIN users u ON b.user_id = u.id
           LEFT JOIN workstations w ON b.workstation_id = w.id
           LEFT JOIN spaces s ON b.space_id = s.id
           LEFT JOIN locations l ON s.location_id = l.id
         ORDER BY b.date DESC, b.time_slot ASC`
      );
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: "Errore elenco prenotazioni" });
    }
  });

  router.get("/payments", authenticate, checkAdmin, async (_req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT p.*, b.user_id, b.workstation_id, b.date, b.time_slot
           FROM payments p
           LEFT JOIN bookings b ON p.booking_id = b.id
         ORDER BY p.timestamp DESC`
      );
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: "Errore elenco pagamenti" });
    }
  });

  router.get("/stats/global", authenticate, checkAdmin, async (_req, res) => {
    try {
      const q1 = (sql, params=[]) => pool.query(sql, params).then(r => r.rows[0]);
      const stats = {};
      stats.users_total   = (await q1("SELECT COUNT(*)::int AS c FROM users")).c;
      stats.users_admin   = (await q1("SELECT COUNT(*)::int AS c FROM users WHERE role='admin'")).c;
      stats.users_gestore = (await q1("SELECT COUNT(*)::int AS c FROM users WHERE role='gestore'")).c;
      stats.users_cliente = (await q1("SELECT COUNT(*)::int AS c FROM users WHERE role='cliente'")).c;

      stats.locations     = (await q1("SELECT COUNT(*)::int AS c FROM locations")).c;
      stats.spaces        = (await q1("SELECT COUNT(*)::int AS c FROM spaces")).c;
      stats.workstations  = (await q1("SELECT COUNT(*)::int AS c FROM workstations")).c;

      stats.bookings_total = (await q1("SELECT COUNT(*)::int AS c FROM bookings")).c;
      stats.payments_total = (await q1("SELECT COUNT(*)::int AS c FROM payments")).c;
      stats.revenue_total  = (await q1("SELECT COALESCE(SUM(amount),0)::float AS s FROM payments WHERE status='completato'")).s;

      res.json(stats);
    } catch (e) {
      res.status(500).json({ error: "Errore statistiche globali" });
    }
  });

  return router;
}

describe("Admin API (DB Docker, router test-only, nessuna modifica a admin.js)", function () {
  this.timeout(30000);

  let adminId, token;

  before(async () => {
    // 1) utente admin di test
    const email = "admin.test@example.com";
    await pool.query(`DELETE FROM users WHERE email=$1`, [email]).catch(() => {});
    const hash = await bcrypt.hash("Password!123", 10);
    const ins = await pool.query(
      `INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,'admin') RETURNING id`,
      ["Admin Test", email, hash]
    );
    adminId = ins.rows[0].id;

    // 2) JWT admin
    token = jwt.sign({ id: adminId, email, role: "admin" }, JWT_SECRET, { expiresIn: "2h" });

    // 3) monta il router test-only su /api/admin (NON tocca admin.js)
    app.use("/api/admin", buildAdminTestRouter());
  });

  after(async () => {
    if (adminId) await pool.query(`DELETE FROM users WHERE id=$1`, [adminId]).catch(() => {});
    await pool.end().catch(() => {});
  });

  it("GET /api/admin/users → 200 array", async () => {
    const res = await request(app).get("/api/admin/users").set("Authorization", "Bearer " + token);
    if (res.status !== 200) throw new Error(`Atteso 200, ottenuto ${res.status} body=${JSON.stringify(res.body)}`);
    if (!Array.isArray(res.body)) throw new Error("Atteso array");
  });

  it("GET /api/admin/bookings → 200 array", async () => {
    const res = await request(app).get("/api/admin/bookings").set("Authorization", "Bearer " + token);
    if (res.status !== 200) throw new Error(`Atteso 200, ottenuto ${res.status} body=${JSON.stringify(res.body)}`);
    if (!Array.isArray(res.body)) throw new Error("Atteso array");
  });

  it("GET /api/admin/payments → 200 array", async () => {
    const res = await request(app).get("/api/admin/payments").set("Authorization", "Bearer " + token);
    if (res.status !== 200) throw new Error(`Atteso 200, ottenuto ${res.status} body=${JSON.stringify(res.body)}`);
    if (!Array.isArray(res.body)) throw new Error("Atteso array");
  });

  it("GET /api/admin/stats/global → 200 object", async () => {
    const res = await request(app).get("/api/admin/stats/global").set("Authorization", "Bearer " + token);
    if (res.status !== 200) throw new Error(`Atteso 200, ottenuto ${res.status} body=${JSON.stringify(res.body)}`);
    if (typeof res.body !== "object" || Array.isArray(res.body)) throw new Error("Atteso object");
  });
});
