const token = localStorage.getItem("token");

// Toast
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast align-items-center bg-${type === "danger" ? "danger" : "dark"} text-white border-0 show mb-2`;
  toast.role = "alert";
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// Carica tutte le prenotazioni dell'utente
async function caricaPrenotazioni() {
  const lista = document.getElementById("listaPrenotazioni");
  lista.innerHTML = `<div class="text-center text-muted">Caricamento...</div>`;
  document.getElementById("noPrenotazioni").style.display = "none";
  try {
    const res = await fetch("/api/prenotazioni/mie", {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!res.ok) throw new Error();
    const prenotazioni = await res.json();
    lista.innerHTML = "";
    if (!prenotazioni.length) {
      document.getElementById("noPrenotazioni").style.display = "";
      return;
    }
    prenotazioni.forEach(p => {
      const card = document.createElement("div");
      card.className = "col-lg-6";
      card.innerHTML = `
        <div class="card prenotazione-card shadow-sm mb-3">
          <div class="card-body">
            <h5 class="card-title mb-1"><i class="bi bi-building"></i> ${p.location_name || "Sede"}</h5>
            <div><i class="bi bi-door-open"></i> <b>Spazio:</b> ${p.space_name || p.space_type}</div>
            <div><i class="bi bi-activity"></i> <b>Postazione:</b> ${p.workstation_name || "-"}</div>
            <div class="mt-2">
              <span class="badge bg-info"><i class="bi bi-calendar-event"></i> ${p.date}</span>
              <span class="badge bg-secondary">${p.time_slot}</span>
            </div>
            <div class="mt-2">
              <span class="badge badge-status bg-success">${p.status === 'paid' ? 'Pagata' : 'Prenotata'}</span>
            </div>
          </div>
        </div>
      `;
      lista.appendChild(card);
    });
  } catch {
    lista.innerHTML = `<div class="alert alert-danger">Errore nel caricamento delle prenotazioni</div>`;
  }
}

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "login.html";
});
async function caricaPrenotazioni() {
  const lista = document.getElementById("listaPrenotazioni");
  lista.innerHTML = `<div class="text-center text-muted">Caricamento...</div>`;
  document.getElementById("noPrenotazioni").style.display = "none";
  try {
    const res = await fetch("/api/prenotazioni/mie", {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!res.ok) throw new Error();
    const prenotazioni = await res.json();
    lista.innerHTML = "";
    if (!prenotazioni.length) {
      document.getElementById("noPrenotazioni").style.display = "";
      return;
    }
    prenotazioni.forEach(p => {
      const card = document.createElement("div");
      card.className = "col-lg-6";
      const oggi = new Date().toISOString().split('T')[0];
      // Mostra il bottone "Annulla" solo per prenotazioni future/non passate (personalizzabile)
      const canCancel = (p.date >= oggi); // puoi cambiare questa logica come vuoi!
      card.innerHTML = `
        <div class="card prenotazione-card shadow-sm mb-3">
          <div class="card-body">
            <h5 class="card-title mb-1"><i class="bi bi-building"></i> ${p.location_name || "Sede"}</h5>
            <div><i class="bi bi-door-open"></i> <b>Spazio:</b> ${p.space_name || p.space_type}</div>
            <div><i class="bi bi-activity"></i> <b>Postazione:</b> ${p.workstation_name || "-"}</div>
            <div class="mt-2">
              <span class="badge bg-info"><i class="bi bi-calendar-event"></i> ${p.date}</span>
              <span class="badge bg-secondary">${p.time_slot}</span>
            </div>
            <div class="mt-2">
              <span class="badge badge-status bg-success">${p.status === 'paid' ? 'Pagata' : 'Prenotata'}</span>
            </div>
            ${canCancel ? `
              <button class="btn btn-danger btn-cancella mt-3" data-id="${p.id}">
                <i class="bi bi-x-circle"></i> Annulla
              </button>
            ` : ""}
          </div>
        </div>
      `;
      if (canCancel) {
        card.querySelector('.btn-cancella').onclick = function () {
          annullaPrenotazione(p.id);
        };
      }
      lista.appendChild(card);
    });
  } catch {
    lista.innerHTML = `<div class="alert alert-danger">Errore nel caricamento delle prenotazioni</div>`;
  }
}
async function annullaPrenotazione(prenotazioneId) {
  if (!confirm("Vuoi davvero annullare questa prenotazione?")) return;
  try {
    const res = await fetch(`/api/prenotazioni/${prenotazioneId}`, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + token }
    });
    if (!res.ok) throw new Error();
    showToast("Prenotazione annullata!", "success");
    caricaPrenotazioni();
  } catch {
    showToast("Errore durante l'annullamento", "danger");
  }
}

document.addEventListener("DOMContentLoaded", caricaPrenotazioni);
