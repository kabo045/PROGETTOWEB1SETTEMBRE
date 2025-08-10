// js/cliente_sedi.js

// Al caricamento della pagina: controllo login
const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "login.html";
}

// Riferimento all'elemento dove mostrare le sedi
const listaSedi = document.getElementById("listaSedi"); // Assicurati che nell'HTML ci sia <div id="listaSedi"></div>
const toastContainer = document.getElementById("toast-container");

// Funzione per mostrare un toast (feedback)
function showToast(msg, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${type} border-0 show mb-2 animate__animated animate__fadeInRight`;
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Funzione per caricare le sedi
async function caricaSedi() {
  listaSedi.innerHTML = `
    <div class="d-flex justify-content-center align-items-center w-100" style="min-height:100px">
      <div class="spinner-border text-info" role="status"><span class="visually-hidden">Caricamento...</span></div>
    </div>
  `;
  try {
    const res = await fetch("/api/sedi", {
      headers: {
        "Authorization": "Bearer " + token
      }
    });
    if (res.status === 401 || res.status === 403) {
      // Token non valido o scaduto
      window.location.href = "login.html";
      return;
    }
    const sedi = await res.json();
    if (!sedi.length) {
      listaSedi.innerHTML = `<div class="alert alert-warning">Nessuna sede trovata.</div>`;
      return;
    }
    // Costruisci le card sedi
    listaSedi.innerHTML = sedi.map(sede => `
      <div class="card mb-4" style="max-width:480px;background:#222336;color:#fff; border-radius:1.1rem;">
        <div class="row g-0">
          <div class="col-md-4">
            <img src="${sede.image_url || '/img/sede_placeholder.png'}" class="img-fluid rounded-start" alt="${sede.name}" style="object-fit:cover;width:100%;height:120px;">
          </div>
          <div class="col-md-8">
            <div class="card-body">
              <h5 class="card-title">${sede.name}</h5>
              <p class="card-text mb-0"><i class="bi bi-geo-alt"></i> ${sede.city}, ${sede.address}</p>
              <p class="card-text mb-0"><i class="bi bi-building"></i> ${sede.tipologia || "—"}</p>
              <p class="card-text mb-0"><i class="bi bi-box"></i> CAP: ${sede.cap}</p>
              <button class="btn btn-primary mt-2" onclick="prenotaSede(${sede.id})">
                <i class="bi bi-calendar-check"></i> Prenota
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join("");
  } catch (err) {
    listaSedi.innerHTML = `<div class="alert alert-danger">Errore caricamento sedi.</div>`;
    showToast("Errore caricamento sedi", "danger");
  }
}

// Funzione per la prenotazione (puoi aprire una modale o reindirizzare)
window.prenotaSede = function(id) {
  // Qui puoi aprire una modale per scegliere spazio/data/orario
  showToast("Funzionalità prenotazione da implementare!", "info");
  // Oppure reindirizza alla pagina di dettaglio/prenota
  // window.location.href = `prenota_cliente.html?sede=${id}`;
};

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "login.html";
});

// Avvio automatico
caricaSedi();
