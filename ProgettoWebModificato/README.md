# CoWorkSpace – Gestione Spazi di Coworking

> **CoWorkSpace** è una piattaforma web completa per la gestione di spazi di coworking, pensata per facilitare l’interazione tra clienti, gestori e amministratori.  
> Consente prenotazioni online, pagamenti sicuri, amministrazione multi-ruolo, notifiche, gestione sedi/spazi e molto altro in un’interfaccia moderna e user-friendly.

---

## 👨‍💻 Team di sviluppo

- **Rahul Kabotra**
- **Matteo Morena**
- **Marco Grampa**

---

## ✨ Funzionalità principali

- Prenotazione rapida di spazi e postazioni coworking
- Gestione avanzata di sedi, spazi, postazioni e disponibilità
- Pagamenti online sicuri e storico transazioni
- Centro notifiche personale per ogni utente
- Sistema multi-ruolo: Cliente, Gestore, Admin
- Recensioni e feedback su sedi/spazi
- Log attività e sistema di auditing
- Dashboard personalizzata per ogni ruolo
- Sicurezza avanzata: JWT, hash password (bcrypt)
- Interfaccia responsive e intuitiva

---

## 📄 Descrizione delle pagine principali

### **Area Cliente**
- `index.html` — Homepage pubblica e ricerca sedi/spazi disponibili  
- `register.html` — Registrazione nuovo utente (cliente/gestore)  
- `login.html` — Accesso sicuro per utenti registrati  
- `dashboard_cliente.html` — Dashboard personale cliente: riepilogo attività, notifiche  
- `account_cliente.html` — Gestione dati profilo, modifica password/elimina account  
- `prenota_cliente.html` — Prenotazione spazi/postazioni (selezione sede, data, orario)  
- `prenotazioni_cliente.html` — Elenco e gestione delle proprie prenotazioni  
- `pagamenti_cliente.html` — Storico e dettagli pagamenti  
- `notifiche_cliente.html` — Visualizzazione notifiche personali  
- `feedback_cliente.html` — Invio feedback e recensioni  
- `recensioni_pubbliche.html` — Consultazione recensioni di tutti gli utenti  
- `recupera_password.html` — Recupero password tramite email  
- `checkout.html` — Conferma e pagamento delle prenotazioni  
- `assistenza_cliente.html` — Richiesta di supporto e assistenza

### **Area Gestore**
- `dashboard_gestore.html` — Dashboard riepilogativa gestore  
- `profilo_gestore.html` — Gestione dati profilo gestore  
- `notifiche_gestore.html` — Notifiche ricevute su prenotazioni e feedback  
- `feedback_gestore.html` — Visualizzazione dei feedback ricevuti  
- `prenotazioni_gestore.html` — Gestione prenotazioni degli spazi gestiti  
- `disponibilita_gestore.html` — Gestione fasce orarie e disponibilità  
- `sedi_gestore.html` — Elenco e gestione sedi amministrate  
- `spazi_gestore.html` — Gestione di spazi e postazioni delle proprie sedi

### **Area Admin**
- `dashboard_admin.html` — Dashboard amministrativa generale  
- `utenti_admin.html` — Gestione utenti: ruoli, iscrizioni, eliminazioni  
- `sedi_admin.html` — Gestione globale sedi (visualizzazione completa)  
- `prenotazioni_admin.html` — Controllo e gestione prenotazioni di sistema  
- `pagamenti_admin.html` — Monitoraggio pagamenti su larga scala  
- `notifiche_admin.html` — Notifiche amministratore  
- `log_admin.html` — Visualizzazione log sistema  
- `profilo_admin.html` — Gestione dati profilo amministratore

### **Pagine comuni / extra**
- `sedi_pubbliche.html` — Elenco sedi consultabile liberamente  
- `richieste_clienti.html` — Gestione richieste assistenza  
- `feedback_*.html`, `recensioni_pubbliche.html` — Raccolta e consultazione feedback/recensioni

---

## 🛠️ Tecnologie utilizzate

- **Frontend:** HTML5, CSS3, Bootstrap 5, JavaScript ES6+
- **Backend:** Node.js (Express), RESTful API
- **Database:** PostgreSQL
- **Sicurezza:** JWT (JSON Web Token), Bcrypt per hashing password
- **Extra:** Gestione variabili con `.env`, Docker & Docker Compose per ambienti di sviluppo/produzione, Bootstrap Icons

---

## 🐳 Avvio rapido con Docker

> Tutto l’ambiente (backend, database, frontend statico opzionale) si avvia con **Docker Compose** per la massima facilità e portabilità.

### 1. Requisiti

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) **installato** (o Docker Engine su Linux)
- [Docker Compose](https://docs.docker.com/compose/)

### 2. Clona il repository ed entra nella cartella del progetto

```bash
git clone https://github.com/tuo-username/coworkspace.git
cd coworkspace

3. Avvio dell’applicazione
Assicurati di trovarti nella cartella dove è presente docker-compose.yml e lancia:

  bash
  Copia codice
  docker-compose up --build
  Il backend sarà disponibile su http://localhost:5000 (o la porta specificata)

  Il database PostgreSQL sarà raggiungibile sulla porta 5432