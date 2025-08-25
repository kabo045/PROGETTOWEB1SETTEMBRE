-- ======= UTENTI =======
-- Admin già creato in init.sql con email admin@coworkspace.it
-- Aggiungiamo un gestore e un cliente di test (password = "password", bcrypt dummy)
INSERT INTO users (name, surname, email, password_hash, role)
VALUES
  ('Mario', 'Gestore', 'gestore@test.it', '$2b$10$2bT2mY0G7m8cHvL4g6jY8u3Jx2E1QkJ9HkXk8U3dQyD1S0F9ZlQz6', 'gestore'),
  ('Carlo', 'Cliente', 'cliente@test.it', '$2b$10$2bT2mY0G7m8cHvL4g6jY8u3Jx2E1QkJ9HkXk8U3dQyD1S0F9ZlQz6', 'cliente');

-- ======= SEDI / SPAZI / POSTAZIONI =======
INSERT INTO locations (name, city, address, services, image_url, cap, tipologia, manager_id, price)
VALUES (
  'Sede Centro', 'Milano', 'Via Roma 1',
  ARRAY['wifi','stampante'],
  'https://example.com/img.jpg',
  '20100', 'open space',
  (SELECT id FROM users WHERE email='gestore@test.it'),
  15.00
);

INSERT INTO spaces (location_id, type, capacity, name)
VALUES ((SELECT id FROM locations WHERE name='Sede Centro'), 'open space', 20, 'Open Space A');

INSERT INTO workstations (space_id, name, extra_features)
VALUES ((SELECT id FROM spaces WHERE name='Open Space A'), 'Desk-1', 'monitor 24"');

-- ======= AVAILABILITY (facoltativo ma utile) =======
INSERT INTO availability (workstation_id, date, time_slot, available)
VALUES (
  (SELECT id FROM workstations WHERE name='Desk-1'),
  CURRENT_DATE, '09:00-12:00', TRUE
);

-- ======= BOOKING + PAYMENT (per far passare join admin/cliente) =======
INSERT INTO bookings (user_id, workstation_id, space_id, date, time_slot, booking_amount, status)
VALUES (
  (SELECT id FROM users WHERE email='cliente@test.it'),
  (SELECT id FROM workstations WHERE name='Desk-1'),
  (SELECT id FROM spaces WHERE name='Open Space A'),
  CURRENT_DATE, '09:00-12:00', 15.00, 'confermato'
);

INSERT INTO payments (booking_id, amount, method, status)
VALUES (
  (SELECT id FROM bookings ORDER BY id DESC LIMIT 1),
  15.00, 'carta', 'completato'
);
