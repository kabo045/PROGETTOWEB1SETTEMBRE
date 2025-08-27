# CoWorkSpace – Test Suite

Questo progetto include **API e test automatici** per i tre ruoli principali della piattaforma **CoWorkSpace**:

- Cliente
- Gestore
- Admin

Tutti i test girano **in Docker**, utilizzando il **DB PostgreSQL del docker-compose**.  
------------------------------------------------------------

## Come avviare i test

### 1. Requisiti
- Docker + Docker Compose installati
- Porta 5432 libera (per PostgreSQL del container)

### 2. Avvio test completi
Per lanciare **tutti i test (cliente, gestore, admin)** in un solo comando:

    npm run compose:tests:all

- Se tutto funziona, alla fine vedrai solo test **passing**.  


### 3. Avvio test singoli
Puoi lanciare anche le singole suite:

    npm run compose:tests:gestore
    npm run compose:tests:cliente
    npm run compose:tests:admin

------------------------------------------------------------

##  Struttura dei test

- test/test-client-api.js → verifica tutte le API pubbliche e protette del cliente  
- test/test-gestore-api.js → verifica le API di gestione sedi, spazi e prenotazioni del gestore  
- test/test-admin-api.js → definisce router admin “test-only” montato solo in fase di test, per verificare le API admin senza modificare il codice di produzione  

------------------------------------------------------------
