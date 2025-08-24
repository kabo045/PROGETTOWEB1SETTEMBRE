// js/dashboard_cliente.js

// --- Controllo autenticazione: redirect se non loggato
const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

// --- Benvenuto personalizzato + statistiche rapide ---
async function loadWelcomeAndStats() {
  try {
    // Recupera dati utente e statistiche principali
    const [userRes, prenRes, notiRes] = await Promise.all([
      fetch("/api/cliente/account", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/mie-prenotazioni?attive=1", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/notifications?unread=1", { headers: { Authorization: `Bearer ${token}` } })
    ]);
    if (!userRes.ok || !prenRes.ok || !notiRes.ok) throw new Error();

    const user = await userRes.json();
    const pren = await prenRes.json();
    const notifications = await notiRes.json();

    // Benvenuto personalizzato
    document.getElementById("welcomeUser").innerHTML =
      `Benvenuto, <b>${user.name ? user.name : user.email}</b>!`;

    // Statistiche rapide (sotto il titolo)
    let stats = `
      <span class="me-3"><b>${pren.length}</b> prenotazioni attive</span>
      <span class="me-3"><b>${notifications.length}</b> notifiche non lette</span>
    `;
    document.getElementById("dashboardStats").innerHTML = stats;

    // Badge sulle card (prenotazioni, notifiche)
    const badgePren = document.getElementById("badgePrenotazioni");
    const badgeNoti = document.getElementById("badgeNotifiche");
    if (pren.length > 0) {
      badgePren.style.display = "";
      badgePren.textContent = pren.length;
    } else {
      badgePren.style.display = "none";
    }
    if (notifications.length > 0) {
      badgeNoti.style.display = "";
      badgeNoti.textContent = notifications.length;
    } else {
      badgeNoti.style.display = "none";
    }
  } catch {
    document.getElementById("welcomeUser").textContent = "Benvenuto!";
    document.getElementById("dashboardStats").innerHTML = "";
  }
}

// --- Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "login.html";
});

// --- Carica dati al caricamento pagina
window.addEventListener("DOMContentLoaded", loadWelcomeAndStats);
