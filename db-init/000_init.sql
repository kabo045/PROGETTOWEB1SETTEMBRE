

-- =========================
--     UTENTI
-- =========================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  surname TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'cliente' CHECK (role IN ('cliente', 'gestore', 'admin'))
);

INSERT INTO users (name, surname, email, password_hash, role)
VALUES ('Admin', 'Super', 'admin@coworkspace.it', '$2a$12$UFqW4KkClSN0SZ1vIVCamOhwMSyHJbDALZNtJ00YwvDzSDQN0HJDS', 'admin');

-- =========================
--     SEDI (LOCATION)
-- =========================
CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  services TEXT[],
  image_url TEXT,
  cap VARCHAR(10),
  tipologia VARCHAR(50),
  manager_id INT REFERENCES users(id)
);

-- =========================
--     SPAZI (SPACE)
-- =========================
CREATE TABLE spaces (
  id SERIAL PRIMARY KEY,
  location_id INT REFERENCES locations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('stanza privata', 'postazione', 'sala riunioni', 'open space')),
  capacity INT NOT NULL,
  name TEXT -- nome dello spazio, facoltativo ma utile (es: "Open Space 1", "Sala Riunioni A")
);

-- =========================
--     POSTAZIONI (WORKSTATIONS)
-- =========================
CREATE TABLE workstations (
  id SERIAL PRIMARY KEY,
  space_id INTEGER REFERENCES spaces(id) ON DELETE CASCADE,
  name VARCHAR(60) NOT NULL,    -- es: "Desk 1", "Postazione 7"
  extra_features TEXT           -- info opzionali
);

-- =========================
--     DISPONIBILITÀ (AVAILABILITY)
-- =========================
CREATE TABLE availability (
  id SERIAL PRIMARY KEY,
  workstation_id INT REFERENCES workstations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (workstation_id, date, time_slot)
);

-- =========================
--     PRENOTAZIONI (BOOKINGS)
-- =========================
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  workstation_id INT REFERENCES workstations(id) ON DELETE CASCADE,
  space_id INT REFERENCES spaces(id),
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  booking_amount NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'confermato' CHECK (status IN ('confermato', 'cancellato', 'in attesa')),
  UNIQUE (user_id, workstation_id, date, time_slot)
);

-- =========================
--     PAGAMENTI
-- =========================
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT,
  status TEXT DEFAULT 'completato' CHECK (status IN ('completato', 'fallito', 'in attesa')),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- =========================
--     NOTIFICHE
-- =========================
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  role TEXT,
  sender_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =========================
--     LOG DELLE ATTIVITÀ
-- =========================
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  location_id INT REFERENCES locations(id) ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, location_id)
);

CREATE TABLE IF NOT EXISTS payment_history (
  id SERIAL PRIMARY KEY,
  payment_id INT REFERENCES payments(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT,
  changed_at TIMESTAMP DEFAULT NOW(),
  note TEXT
);
CREATE TABLE support_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  location_id INTEGER NOT NULL REFERENCES locations(id),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'aperta',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE payments ADD CONSTRAINT unique_booking UNIQUE (booking_id);

ALTER TABLE locations ADD COLUMN price NUMERIC(8,2);
ALTER TABLE payments
  DROP CONSTRAINT payments_status_check,
  ADD  CONSTRAINT payments_status_check
  CHECK (status IN ('completato','fallito','in attesa','rimborsato'));

-- =========================
--     INDICI
-- =========================
CREATE INDEX idx_locations_city ON locations(city);
CREATE INDEX idx_availability_date_slot ON availability(date, time_slot);
CREATE INDEX idx_bookings_user ON bookings(user_id);

