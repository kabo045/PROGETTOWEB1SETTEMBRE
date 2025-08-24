// js/cliente_prenotazioni.js

const token = localStorage.getItem("token");
if (!token) window.location.href = "login.html";

const listaPrenotazioni = document.getElementById("listaPrenotazioni");
const toastContainer = document.getElementById("toast-container");
const noPrenotazioni = document.getElementById("noPrenotazioni");
const btnAggiorna = document.getElementById("btnAggiorna");

// Notifica toast
function showToast(msg, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${type} border-0 show mb-2`;
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function formatEuro(v) {
  const n = Number(v || 0);
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

// Loader animato
function showLoader(target) {
  target.innerHTML = `
    <div class="d-flex justify-content-center align-items-center w-100" style="min-height:120px">
      <div class="spinner-border text-info" role="status"><span class="visually-hidden">Caricamento...</span></div>
    </div>
  `;
}

// Badge stato prenotazione
function formatStatusBadge(status) {
  if (status === "confermato") return `<span class="badge bg-success badge-status"><i class="bi bi-check-circle me-1"></i>Confermata</span>`;
  if (status === "cancellato") return `<span class="badge bg-danger badge-status"><i class="bi bi-x-circle me-1"></i>Cancellata</span>`;
  return `<span class="badge bg-warning text-dark badge-status"><i class="bi bi-hourglass-split me-1"></i>In attesa</span>`;
}

// Utility: controlla se la prenotazione è passata
function isPast(dateStr/*, slot*/) {
  const now = new Date();
  const day = new Date(dateStr);
  if (now > day.setHours(23, 59, 59, 999)) return true;
  return false;
}

// Carica e mostra le prenotazioni dell’utente loggato
async function caricaPrenotazioni() {
  showLoader(listaPrenotazioni);
  noPrenotazioni.classList.add("d-none");
  try {
    const res = await fetch("/api/cliente/bookings", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error();
    const pren = await res.json();
    if (!pren.length) {
      listaPrenotazioni.innerHTML = "";
      noPrenotazioni.style.display = "";
      return;
    }

    listaPrenotazioni.innerHTML = pren.map(p => {
      const disableCancel = p.status !== "confermato" || isPast(p.date, p.time_slot);

      // 🔢 Importi dal backend:
      // - p.amount_to_pay = importo da pagare (COALESCE(booking_amount, locations.price))
      // - p.paid_amount   = importo pagato se esiste un payment
      // - p.payment_status = 'completato' | 'in attesa' | 'fallito' | ...
      const isPaid = p.payment_status === 'completato';
      const labelPagamento = isPaid
        ? `Pagato ${formatEuro(p.paid_amount ?? p.amount_to_pay ?? 0)}`
        : `Da pagare ${formatEuro(p.amount_to_pay ?? 0)}`;

      const badgePagamento = isPaid
        ? `<span class="badge bg-success">completato</span>`
        : `<span class="badge bg-warning text-dark">${p.payment_status ?? 'in attesa'}</span>`;

      // Tipo: se c'è workstation_name -> Postazione; altrimenti Sala <type>
      const tipo = p.workstation_name
        ? `Postazione${p.workstation_name ? ` • ${p.workstation_name}` : ""}`
        : (p.space_type ? `Sala • ${p.space_type}` : "—");

      return `
      <div class="col-md-6 col-lg-4">
        <div class="card shadow h-100 prenotazione-card border-0" style="overflow:hidden;">
          <div class="card-body pb-2">
            <h5 class="card-title mb-1">${p.location_name ?? '—'}</h5>
            <span class="badge bg-primary">${tipo}</span>
            <p class="mb-1 mt-2"><strong>Data:</strong> ${p.date} <strong>Orario:</strong> ${p.time_slot}</p>
            <p class="mb-1"><strong>Stato:</strong> ${formatStatusBadge(p.status)}</p>
            <p class="mb-1">
              <strong>Pagamento:</strong> ${labelPagamento} ${badgePagamento}
            </p>
            ${
              !disableCancel
              ? `<button class="btn btn-cancella mt-2 w-100" onclick="cancellaPrenotazione(${p.id})"><i class="bi bi-x-circle"></i> Cancella</button>`
              : `<span class="text-muted fst-italic small">Non annullabile</span>`
            }
          </div>
        </div>
      </div>
      `;
    }).join("");
  } catch {
    listaPrenotazioni.innerHTML = `<div class="text-danger">Errore caricamento prenotazioni</div>`;
  }
}

window.cancellaPrenotazione = function(id) {
  const confirmToast = document.createElement("div");
  confirmToast.className = "toast show mb-3 border-0 shadow-lg";
  confirmToast.style.maxWidth = "360px";
  confirmToast.style.background = "#fff";
  confirmToast.style.borderLeft = "7px solid #ffc107";
  confirmToast.style.boxShadow = "0 4px 32px #fbc02d40";
  confirmToast.innerHTML = `
    <div class="p-3 pb-2 d-flex flex-column gap-1">
      <div class="d-flex align-items-center mb-1">
        <span class="fs-2 text-warning me-2"><i class="bi bi-exclamation-triangle-fill"></i></span>
        <span class="fs-5 fw-bold text-warning">Conferma Cancellazione</span>
      </div>
      <div class="mb-2 ps-1 text-dark" style="font-size:1.09rem;">
        Vuoi davvero cancellare questa prenotazione?<br>
        <span class="text-secondary" style="font-size:.97rem;">L’operazione non è reversibile.</span>
      </div>
      <div class="d-flex gap-2 mt-2 ps-1">
        <button type="button" class="btn btn-danger flex-fill fw-semibold shadow-sm rounded-pill py-2" id="confirmDeleteBtn">
          <i class="bi bi-trash"></i> Sì, cancella
        </button>
        <button type="button" class="btn btn-outline-secondary flex-fill fw-semibold rounded-pill py-2 border-2" data-bs-dismiss="toast" style="transition:.16s;">
          Annulla
        </button>
      </div>
    </div>
  `;
  toastContainer.appendChild(confirmToast);

  confirmToast.querySelector('[data-bs-dismiss="toast"]').onclick = () => confirmToast.remove();

  confirmToast.querySelector('#confirmDeleteBtn').onclick = async () => {
    confirmToast.remove();
    try {
      const res = await fetch(`/api/cliente/bookings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Prenotazione annullata", "success");
        caricaPrenotazioni();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || "Errore annullamento", "danger");
      }
    } catch {
      showToast("Errore annullamento", "danger");
    }
  };

  setTimeout(() => confirmToast.remove(), 10000);
};

// Aggiorna elenco
btnAggiorna.addEventListener("click", caricaPrenotazioni);

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "login.html";
});

// Caricamento iniziale
caricaPrenotazioni();
