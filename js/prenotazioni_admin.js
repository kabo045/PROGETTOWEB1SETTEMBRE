let allSedi = [];

function showToast(msg, variant="success") {
  const toastId = "toast_" + Math.random();
  const toast = document.createElement("div");
  toast.className = `toast align-items-center border-0 text-bg-${variant}`;
  toast.id = toastId;
  toast.role = "alert";
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  document.querySelector(".toast-container").appendChild(toast);
  const t = new bootstrap.Toast(toast, { delay: 3200 });
  t.show();
  t._element.addEventListener("hidden.bs.toast", () => toast.remove());
}

document.addEventListener('DOMContentLoaded', () => {
  loadSedi();
  loadPrenotazioni();

  document.getElementById('btnFiltra').onclick = loadPrenotazioni;
  document.getElementById('btnResetFiltri').onclick = () => {
    document.getElementById('filtroSede').value = '';
    document.getElementById('filtroStato').value = '';
    document.getElementById('filtroUtente').value = '';
    loadPrenotazioni();
  };
  // document.getElementById('btnExport').onclick = exportPrenotazioniCSV; // Plus
});

async function loadSedi() {
  const select = document.getElementById('filtroSede');
  select.innerHTML = '<option value="">Tutte le sedi</option>';
  try {
    let token = localStorage.getItem('token');
    if (!token) {
      showToast("Token di autenticazione mancante", "danger");
      return;
    }
    const res = await fetch('/api/admin/locations', {
      headers: {'Authorization': 'Bearer ' + token}
    });
    if (!res.ok) {
      showToast("Errore caricamento sedi", "danger");
      return;
    }
    allSedi = await res.json();
    if (!Array.isArray(allSedi) || allSedi.length === 0) {
      select.innerHTML = '<option value="">Nessuna sede disponibile</option>';
      return;
    }
    allSedi.forEach(s => {
      select.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });
  } catch (e) {
    showToast("Errore di rete", "danger");
  }
}

async function loadPrenotazioni() {
  const tbody = document.querySelector("#prenotazioniTable tbody");
  tbody.innerHTML = `<tr><td colspan="8" class="text-center text-secondary">Caricamento...</td></tr>`;

  // Ottieni filtri
  const sedeId = document.getElementById('filtroSede').value;
  const stato = document.getElementById('filtroStato').value;
  const utente = document.getElementById('filtroUtente').value.trim();

  // Query string per i filtri
  let query = [];
  if (sedeId) query.push('sede=' + encodeURIComponent(sedeId));
  if (stato) query.push('stato=' + encodeURIComponent(stato));
  if (utente) query.push('utente=' + encodeURIComponent(utente));
  const queryString = query.length ? '?' + query.join('&') : '';

  try {
    let token = localStorage.getItem('token');
    if (!token) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Token di autenticazione mancante</td></tr>`;
      showToast("Token di autenticazione mancante", "danger");
      return;
    }
    const res = await fetch('/api/admin/bookings' + queryString, {
      headers: {'Authorization': 'Bearer ' + token}
    });
    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Errore caricamento prenotazioni</td></tr>`;
      showToast("Errore caricamento prenotazioni", "danger");
      return;
    }
    const prenotazioni = await res.json();
    if (!Array.isArray(prenotazioni) || prenotazioni.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-secondary">Nessuna prenotazione trovata.</td></tr>`;
      return;
    }
    tbody.innerHTML = "";
    prenotazioni.forEach(p => {
      tbody.innerHTML += `
        <tr>
          <td>${p.user_name || ''} ${p.user_surname || ''}</td>
          <td>${p.location_name || ''}</td>
          <td>${p.space_name || ''}</td>
          <td>${p.date ? new Date(p.date).toLocaleDateString() : ''}</td>
          <td>${p.time_slot || ''}</td>
          <td>
            <select class="form-select" onchange="changeStatus(${p.id}, this.value)">
              <option value="confermato" ${p.status==='confermato'?'selected':''}>Confermato</option>
              <option value="in attesa" ${p.status==='in attesa'?'selected':''}>In attesa</option>
              <option value="cancellato" ${p.status==='cancellato'?'selected':''}>Cancellato</option>
            </select>
          </td>
          <td>${p.payment_status || '-'}</td>
          <td class="action-btns">
            <button class="btn btn-danger btn-sm" onclick="deleteBooking(${p.id})"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Errore di rete</td></tr>`;
    showToast("Errore di rete", "danger");
  }
}

window.changeStatus = async function(bookingId, newStatus) {
  try {
    const res = await fetch(`/api/admin/bookings/${bookingId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem('token')
      },
      body: JSON.stringify({status: newStatus})
    });
    loadPrenotazioni();
    if(res.ok) showToast("Stato aggiornato!", "info");
    else showToast("Errore aggiornamento stato", "danger");
  } catch {
    showToast("Errore di rete", "danger");
  }
};
window.deleteBooking = function(bookingId) {
  // Toast di conferma moderno
  const confirmToast = document.createElement("div");
  confirmToast.className = "toast show mb-3 border-0 shadow-lg";
  confirmToast.style.maxWidth = "370px";
  confirmToast.style.background = "#fff";
  confirmToast.style.borderLeft = "7px solid #d32f2f";
  confirmToast.style.boxShadow = "0 4px 32px #e5737340";
  confirmToast.innerHTML = `
    <div class="p-3 pb-2 d-flex flex-column gap-1">
      <div class="d-flex align-items-center mb-1">
        <span class="fs-2 text-danger me-2"><i class="bi bi-exclamation-triangle-fill"></i></span>
        <span class="fs-5 fw-bold text-danger">Elimina Prenotazione</span>
      </div>
      <div class="mb-2 ps-1 text-dark" style="font-size:1.08rem;">
        Vuoi davvero <b>eliminare questa prenotazione</b>?<br>
        <span class="text-secondary" style="font-size:.97rem;">L’azione è <b>irreversibile</b>.</span>
      </div>
      <div class="d-flex gap-2 mt-2 ps-1">
        <button type="button" class="btn btn-danger flex-fill fw-semibold shadow-sm rounded-pill py-2" id="confirmDeleteBookingBtn">
          <i class="bi bi-trash"></i> Sì, elimina
        </button>
        <button type="button" class="btn btn-outline-secondary flex-fill fw-semibold rounded-pill py-2 border-2" data-bs-dismiss="toast" style="transition:.16s;">
          Annulla
        </button>
      </div>
    </div>
  `;
  document.querySelector(".toast-container").appendChild(confirmToast);

  // Chiusura su annulla
  confirmToast.querySelector('[data-bs-dismiss="toast"]').onclick = () => confirmToast.remove();

  // Conferma eliminazione
  confirmToast.querySelector('#confirmDeleteBookingBtn').onclick = async () => {
    confirmToast.remove();
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "DELETE",
        headers: {'Authorization': 'Bearer ' + localStorage.getItem('token')}
      });
      loadPrenotazioni();
      if(res.ok) showToast("Prenotazione eliminata!", "danger");
      else showToast("Errore eliminazione", "danger");
    } catch {
      showToast("Errore di rete", "danger");
    }
  };

  // Rimuovi dopo 10 secondi se l’utente non decide
  setTimeout(() => confirmToast.remove(), 10000);
};
