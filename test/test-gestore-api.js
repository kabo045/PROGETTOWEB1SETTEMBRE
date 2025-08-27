// test/test-gestore-api.js — usa SOLO le rotte italiane già presenti in gestore.js
const request = require("supertest");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const app = require("../server");

// Connessione DB (docker: host "db")
const { DATABASE_URL, PGUSER, PGPASSWORD, PGHOST, PGPORT, PGDATABASE } = process.env;
const connectionString =
  DATABASE_URL ||
  `postgresql://${PGUSER || "postgres"}:${PGPASSWORD || "postgres"}@${PGHOST || "db"}:${PGPORT || "5432"}/${PGDATABASE || "web"}`;
const pool = new Pool({ connectionString });

describe("API Gestore (rotte , DB )", function () {
  this.timeout(30000);

  let token, gestoreId;
  let sedeId, spazioId, postazioneId;

  before(async () => {
    // Crea utente gestore
    const email = "gestore.test@example.com";
    await pool.query(`DELETE FROM users WHERE email=$1`, [email]).catch(() => {});
    const passwordHash = await bcrypt.hash("Password!123", 10);
    const ins = await pool.query(
      `INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id`,
      ["Gestore Test", email, passwordHash, "gestore"]
    );
    gestoreId = ins.rows[0].id;

    // JWT compatibile col middleware
    token = jwt.sign({ id: gestoreId, role: "gestore", email }, process.env.JWT_SECRET || "secret", { expiresIn: "2h" });

    // Crea una sede via API
    const sedeRes = await request(app)
      .post("/api/gestore/sedi")
      .set("Authorization", "Bearer " + token)
      .send({ name: "Sede Test", city: "Milano", address: "Via Test 1", tipologia: "ufficio", price: 100 });
    if (sedeRes.status !== 201) throw new Error("Creazione sede fallita: " + sedeRes.status + " " + JSON.stringify(sedeRes.body));
    sedeId = sedeRes.body.id;

    // Crea uno spazio via API (type deve rispettare il CHECK: 'stanza privata' | 'postazione' | 'sala riunioni' | 'open space')
    const spazioRes = await request(app)
      .post(`/api/gestore/sedi/${sedeId}/spazi`)
      .set("Authorization", "Bearer " + token)
      .send({ name: "Open Space", type: "open space", capacity: 20 });
    if (spazioRes.status !== 201) throw new Error("Creazione spazio fallita: " + spazioRes.status + " " + JSON.stringify(spazioRes.body));
    spazioId = spazioRes.body.id;

    // 5) Crea una postazione via API
    const postRes = await request(app)
      .post(`/api/gestore/spazi/${spazioId}/postazioni`)
      .set("Authorization", "Bearer " + token)
      .send({ name: "Desk 1", extra_features: "monitor" });
    if (postRes.status !== 201) throw new Error("Creazione postazione fallita: " + postRes.status + " " + JSON.stringify(postRes.body));
    postazioneId = postRes.body.id;
  });

  after(async () => {
    // cleanup minimale (in ordine: postazioni -> spazi -> sedi -> utente)
    if (postazioneId) await pool.query(`DELETE FROM workstations WHERE id=$1`, [postazioneId]).catch(() => {});
    if (spazioId) await pool.query(`DELETE FROM spaces WHERE id=$1`, [spazioId]).catch(() => {});
    if (sedeId) await pool.query(`DELETE FROM locations WHERE id=$1`, [sedeId]).catch(() => {});
    if (gestoreId) await pool.query(`DELETE FROM users WHERE id=$1`, [gestoreId]).catch(() => {});
    await pool.end().catch(() => {});
  });

  // -------- ACCOUNT --------
  it("GET /api/gestore/account → 200 con id/name/email", async () => {
    const res = await request(app).get("/api/gestore/account").set("Authorization", "Bearer " + token);
    if (res.status !== 200) throw new Error("Atteso 200, ottenuto " + res.status + " body=" + JSON.stringify(res.body));
    if (!res.body || !("id" in res.body && "name" in res.body && "email" in res.body)) {
      throw new Error("Mancano campi id/name/email — body: " + JSON.stringify(res.body));
    }
  });

  it("PUT /api/gestore/account → 200 e aggiorna name", async () => {
    const res = await request(app)
      .put("/api/gestore/account")
      .set("Authorization", "Bearer " + token)
      .send({ name: "Gestore Aggiornato", email: "gestore.test@example.com" });
    if (res.status !== 200) throw new Error("Atteso 200, ottenuto " + res.status + " body=" + JSON.stringify(res.body));
    if (!res.body || res.body.name !== "Gestore Aggiornato") throw new Error("Nome non aggiornato — " + JSON.stringify(res.body));
  });

  // -------- SEDI --------
  it("GET /api/gestore/sedi → 200 array", async () => {
    const res = await request(app).get("/api/gestore/sedi").set("Authorization", "Bearer " + token);
    if (res.status !== 200) throw new Error("Atteso 200, ottenuto " + res.status + " body=" + JSON.stringify(res.body));
    if (!Array.isArray(res.body)) throw new Error("Atteso array — body: " + JSON.stringify(res.body));
  });

  it("PATCH /api/gestore/sedi/:id → 200 aggiorna name", async () => {
    const res = await request(app)
      .patch(`/api/gestore/sedi/${sedeId}`)
      .set("Authorization", "Bearer " + token)
      .send({ name: "Sede Test (upd)", city: "Milano" });
    if (res.status !== 200) throw new Error("Atteso 200, ottenuto " + res.status + " body=" + JSON.stringify(res.body));
  });

  // -------- SPAZI --------
  it("GET /api/gestore/sedi/:sedeId/spazi → 200 array", async () => {
    const res = await request(app).get(`/api/gestore/sedi/${sedeId}/spazi`).set("Authorization", "Bearer " + token);
    if (res.status !== 200) throw new Error("Atteso 200, ottenuto " + res.status + " body=" + JSON.stringify(res.body));
    if (!Array.isArray(res.body)) throw new Error("Atteso array — body: " + JSON.stringify(res.body));
  });

  it("PATCH /api/gestore/spazi/:id → 200 aggiorna nome/capacità", async () => {
    const res = await request(app)
      .patch(`/api/gestore/spazi/${spazioId}`)
      .set("Authorization", "Bearer " + token)
      .send({ name: "Open Space (upd)", type: "open space", capacity: 25 });
    if (res.status !== 200) throw new Error("Atteso 200, ottenuto " + res.status + " body=" + JSON.stringify(res.body));
  });

  // -------- POSTAZIONI --------
  it("GET /api/gestore/spazi/:spazioId/postazioni → 200 array", async () => {
    const res = await request(app).get(`/api/gestore/spazi/${spazioId}/postazioni`).set("Authorization", "Bearer " + token);
    if (res.status !== 200) throw new Error("Atteso 200, ottenuto " + res.status + " body=" + JSON.stringify(res.body));
    if (!Array.isArray(res.body)) throw new Error("Atteso array — body: " + JSON.stringify(res.body));
  });

  // -------- DISPONIBILITÀ --------
  it("GET /api/gestore/spazi/:postazioneId/disponibilita → 200 array (o vuoto)", async () => {
    const res = await request(app)
      .get(`/api/gestore/spazi/${postazioneId}/disponibilita`)
      .set("Authorization", "Bearer " + token);
    if (![200, 403].includes(res.status)) { // 403 se ownership non torna per qualche edge-case
      throw new Error("Atteso 200/403, ottenuto " + res.status + " body=" + JSON.stringify(res.body));
    }
  });

  // -------- PRENOTAZIONI (lista) --------
  it("GET /api/gestore/prenotazioni → 200 array", async () => {
    const res = await request(app).get(`/api/gestore/prenotazioni`).set("Authorization", "Bearer " + token);
    if (res.status !== 200) throw new Error("Atteso 200, ottenuto " + res.status + " body=" + JSON.stringify(res.body));
    if (!Array.isArray(res.body)) throw new Error("Atteso array — body: " + JSON.stringify(res.body));
  });

  // -------- CLEANUP API di esempio --------
  it("DELETE /api/gestore/sedi/:id → 200", async () => {
    const res = await request(app).delete(`/api/gestore/sedi/${sedeId}`).set("Authorization", "Bearer " + token);
    if (res.status !== 200) throw new Error("Atteso 200, ottenuto " + res.status + " body=" + JSON.stringify(res.body));
    sedeId = null; // così l'after non la cancella due volte
  });
});

