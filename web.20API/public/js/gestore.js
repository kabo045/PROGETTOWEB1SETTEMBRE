// public/js/dashboard_gestore.js

// --- AUTENTICAZIONE E CONTROLLO ACCESSO ---
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user")); // { name, email, role, ... }

if (!token || !user || user.role !== "gestore") {
  window.location.href = "login.html";
}

// --- TOPBAR: Inserisci nome gestore (se presente) ---
const nomeGestoreEl = document.getElementById("nomeGestore");
if (nomeGestoreEl) nomeGestoreEl.textContent = user.name;

// --- LOGOUT (funziona sia da topbar che da sidebar) ---
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}
document.getElementById("logoutBtnDropdown")?.addEventListener("click", logout);
document.getElementById("logoutBtn")?.addEventListener("click", logout);

// --- NOTIFICHE (esempio placeholder) ---
const badgeNotifiche = document.getElementById("badgeNotifiche");
const menuNotifiche = document.getElementById("menuNotifiche");

function aggiornaNotifiche() {
  // Esempio: fetch reali da backend, qui placeholder
  const notifiche = [
    // { msg: "Nuova prenotazione ricevuta", read: false, ts: "2025-07-25 10:30" },
    // ...
  ];
  let nonLetti = notifiche.filter(n => !n.read).length;
  if (badgeNotifiche) {
    badgeNotifiche.style.display = nonLetti > 0 ? "inline-block" : "none";
    badgeNotifiche.textContent = nonLetti;
  }
  if (menuNotifiche) {
    if (notifiche.length === 0) {
      menuNotifiche.innerHTML = `<li><h6 class="dropdown-header">Notifiche</h6></li>
        <li><span class="dropdown-item small text-muted">Nessuna notifica</span></li>`;
    } else {
      menuNotifiche.innerHTML = `<li><h6 class="dropdown-header">Notifiche</h6></li>` +
        notifiche.map(n =>
          `<li>
            <span class="dropdown-item${n.read ? '' : ' fw-bold'}">${n.msg} <br>
              <span class="small text-muted">${n.ts}</span>
            </span>
          </li>`
        ).join('');
    }
  }
}
aggiornaNotifiche(); // chiamata all'avvio, puoi richiamare dopo fetch reali

// --- EVENTUALI AZIONI VELOCI DELLA DASHBOARD ---
// Puoi aggiungere qui funzioni per mostrare riepiloghi, grafici, ecc.

// Esempio: mostrare un messaggio di benvenuto
const benvenutoEl = document.getElementById("benvenutoGestore");
if (benvenutoEl) {
  benvenutoEl.textContent = `Benvenuto ${user.name}!`;
}

// --- TUTTO PRONTO: Aggiungi qui funzioni fetch per sedi, prenotazioni, ecc. ---

// Esempio fetch sedi gestite
/*
fetch("/api/gestore/locations", {
  headers: { Authorization: `Bearer ${token}` },
})
  .then(res => res.json())
  .then(sedi => {
    // ...mostra sedi
  })
  .catch(() => {
    // ...gestisci errore
  });
*/

// --- FINE JS DASHBOARD GESTORE ---
