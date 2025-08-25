// test/test-client-api.js
const request = require('supertest');
const { expect } = require('chai');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = require('../server');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Config “cliente di test”
const TEST_EMAIL = 'cliente@test.com';
const TEST_PASSWORD = 'Password!123';
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

let CLIENT_TOKEN;
let userId;
let locationId, spaceId, workstationId, bookingId, notificationId;

async function sql(q, params = []) {
  const c = await pool.connect();
  try { return (await c.query(q, params)).rows; }
  finally { c.release(); }
}

// 1) Assicura un utente cliente nel DB e genera JWT, senza dipendere da /login
async function ensureClientAndToken() {
  // Cerca utente
  let users = await sql(`SELECT id, email FROM users WHERE email=$1 LIMIT 1`, [TEST_EMAIL]);

  if (!users.length) {
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);
    users = await sql(
      `INSERT INTO users (name, surname, email, password_hash, role)
       VALUES ($1,$2,$3,$4,'cliente') RETURNING id, email`,
      ['Cliente', 'Test', TEST_EMAIL, hash]
    );
  }
  userId = users[0].id;

  // Genera JWT che il middleware accetterà (stesso secret del server)
  CLIENT_TOKEN = jwt.sign(
    { id: userId, role: 'cliente', email: TEST_EMAIL },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// 2) Pesca dati REALI già presenti nel DB (niente insert farlocche)
async function pickRealData() {
  const loc = await sql(`SELECT id FROM locations ORDER BY id LIMIT 1`);
  if (loc.length) {
    locationId = loc[0].id;
    const sp = await sql(`SELECT id FROM spaces WHERE location_id=$1 ORDER BY id LIMIT 1`, [locationId]);
    if (sp.length) {
      spaceId = sp[0].id;
      const ws = await sql(`SELECT id FROM workstations WHERE space_id=$1 ORDER BY id LIMIT 1`, [spaceId]);
      if (ws.length) workstationId = ws[0].id;
    }
  }
}

describe('API Cliente (DB Docker reale, senza dati farlocchi)', () => {
  before(async () => {
    await ensureClientAndToken();
    await pickRealData();
  });

  after(async () => {
    // cleanup leggero solo su ciò che creiamo nei test (prenotazioni, pagamenti, notifica)
    if (userId) {
      await sql(`DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE user_id=$1)`, [userId]);
      await sql(`DELETE FROM bookings WHERE user_id=$1`, [userId]);
      await sql(`DELETE FROM notifications WHERE user_id=$1`, [userId]);
    }
    await pool.end();
  });

  // ================= SEDI & SPAZI =================
  describe('Sedi, spazi e postazioni', () => {
    it('GET /api/cliente/public/locations', async () => {
      const res = await request(app).get('/api/cliente/public/locations');
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('GET /api/cliente/locations (auth)', async () => {
      const res = await request(app)
        .get('/api/cliente/locations')
        .set('Authorization', `Bearer ${CLIENT_TOKEN}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('GET /api/cliente/locations/:id/spaces (se esiste location)', async function () {
      if (!locationId) return this.skip();
      const res = await request(app)
        .get(`/api/cliente/locations/${locationId}/spaces`)
        .set('Authorization', `Bearer ${CLIENT_TOKEN}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
      if (res.body.length) spaceId = res.body[0].id;
    });

    it('GET /api/cliente/spaces/:id/workstations (se esiste space)', async function () {
      if (!spaceId) return this.skip();
      const res = await request(app)
        .get(`/api/cliente/spaces/${spaceId}/workstations`)
        .set('Authorization', `Bearer ${CLIENT_TOKEN}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
      if (res.body.length) workstationId = res.body[0].id;
    });

    it('GET /api/cliente/workstations/:id/availability?date=today (se esiste workstation)', async function () {
      if (!workstationId) return this.skip();
      const today = new Date().toISOString().slice(0,10);
      const res = await request(app)
        .get(`/api/cliente/workstations/${workstationId}/availability?date=${today}`)
        .set('Authorization', `Bearer ${CLIENT_TOKEN}`);
      expect([200,404]).to.include(res.status); // 404 se non ci sono slot per oggi
      if (res.status === 200) expect(res.body).to.be.an('array');
    });
  });

  // ================= PRENOTAZIONI =================
  describe('Prenotazioni (solo se abbiamo workstation)', () => {
    it('POST /api/cliente/bookings', async function () {
      if (!workstationId) return this.skip();
      const today = new Date().toISOString().slice(0,10);
      const res = await request(app)
        .post('/api/cliente/bookings')
        .set('Authorization', `Bearer ${CLIENT_TOKEN}`)
        .send({ workstation_id: workstationId, date: today, time_slot: '09:00-12:00', booking_amount: 10 });
      expect([201,409,400]).to.include(res.status); // 409/400 se già occupato o slot inesistente
      bookingId = res.body?.bookingId || bookingId;
    });

    it('GET /api/cliente/bookings', async function () {
      const res = await request(app)
        .get('/api/cliente/bookings')
        .set('Authorization', `Bearer ${CLIENT_TOKEN}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
      if (!bookingId && res.body.length) bookingId = res.body[0].id;
    });

    it('DELETE /api/cliente/bookings/:id (idempotente)', async function () {
      if (!bookingId) return this.skip();
      const res = await request(app)
        .delete(`/api/cliente/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${CLIENT_TOKEN}`);
      expect([200,404]).to.include(res.status);
    });
  });

  // ================= PAGAMENTI =================
  describe('Pagamenti (lista)', () => {
    it('GET /api/cliente/payments', async () => {
      const res = await request(app)
        .get('/api/cliente/payments')
        .set('Authorization', `Bearer ${CLIENT_TOKEN}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });
  });

  // ================= ACCOUNT & NOTIFICHE =================
  describe('Account & Notifiche', () => {
    it('GET /api/cliente/account', async () => {
      const res = await request(app)
        .get('/api/cliente/account')
        .set('Authorization', `Bearer ${CLIENT_TOKEN}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('id');
    });

    it('PUT /api/cliente/account (aggiorna nome)', async () => {
      const res = await request(app)
        .put('/api/cliente/account')
        .set('Authorization', `Bearer ${CLIENT_TOKEN}`)
        .send({ name: 'Cliente Test Agg.' });
      expect([200,204]).to.include(res.status);
    });

    it('GET /api/cliente/notifications', async () => {
      const res = await request(app)
        .get('/api/cliente/notifications')
        .set('Authorization', `Bearer ${CLIENT_TOKEN}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
      if (res.body.length) notificationId = res.body[0].id;
    });

    it('PUT /api/cliente/notifications/:id/read', async function () {
      if (!notificationId) return this.skip();
      const res = await request(app)
        .put(`/api/cliente/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${CLIENT_TOKEN}`);
      expect([200,404]).to.include(res.status);
    });

    it('DELETE /api/cliente/notifications/:id', async function () {
      if (!notificationId) return this.skip();
      const res = await request(app)
        .delete(`/api/cliente/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${CLIENT_TOKEN}`);
      expect([200,404]).to.include(res.status);
    });
  });

  // ================= RECENSIONI =================
  describe('Recensioni', () => {
    it('GET /api/cliente/reviews', async () => {
      const res = await request(app)
        .get('/api/cliente/reviews')
        .set('Authorization', `Bearer ${CLIENT_TOKEN}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('GET /api/cliente/public/reviews?location_id=...', async function () {
      if (!locationId) return this.skip();
      const res = await request(app)
        .get(`/api/cliente/public/reviews?location_id=${locationId}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });
  });
});
